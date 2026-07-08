# Spec 002 — PostgreSQL/ParadeDB as Primary Knowledge Store

## Status
Draft

## Problem

`knowledge_sources` is currently stored in MongoDB and mirrored into a ParadeDB
(`knowledge_sources_index`) table only for BM25 full-text search. This means:

- MongoDB is the source of truth; ParadeDB is a derived cache that can drift.
- Operators who only want PostgreSQL must still run MongoDB for knowledge data.
- The sync endpoint exists purely to repair drift — a symptom of dual-write.
- MongoDB text search is the fallback when ParadeDB is unavailable, giving
  inconsistent results across deployments.

## Goal

Make PostgreSQL/ParadeDB the **sole** primary store for `knowledge_sources`.
MongoDB stays required for everything else (users, instances, conversations,
analytics, Discord config) but is no longer read or written for knowledge data.

## Non-Goals

- Migrating any other collection (users, conversations, etc.) away from MongoDB.
- Removing MongoDB as a dependency.
- Changing the HTTP API surface (route paths, request/response shapes stay the same).
- Adding new knowledge source types.

---

## Schema Changes

The existing `knowledge_sources_index` table is missing two fields present in
MongoDB documents. Both must be added:

```sql
ALTER TABLE knowledge_sources_index
  ADD COLUMN IF NOT EXISTS canonical_url TEXT,
  ADD COLUMN IF NOT EXISTS updated_at    TEXT;

CREATE INDEX IF NOT EXISTS idx_ki_canonical_url
  ON knowledge_sources_index (instance_id, canonical_url)
  WHERE canonical_url IS NOT NULL;
```

Updated full DDL (`_PARADEDB_DDL` in `server.py`):

```sql
CREATE EXTENSION IF NOT EXISTS pg_search;

CREATE TABLE IF NOT EXISTS knowledge_sources_index (
    id            TEXT PRIMARY KEY,
    instance_id   TEXT NOT NULL,
    type          TEXT NOT NULL DEFAULT 'faq',
    title         TEXT NOT NULL DEFAULT '',
    content       TEXT NOT NULL DEFAULT '',
    tags          TEXT[]  DEFAULT '{}',
    priority      INTEGER NOT NULL DEFAULT 0,
    is_active     BOOLEAN NOT NULL DEFAULT true,
    url           TEXT,
    canonical_url TEXT,
    filename      TEXT,
    created_at    TEXT,
    updated_at    TEXT
);

CREATE INDEX IF NOT EXISTS idx_ki_instance_active
  ON knowledge_sources_index (instance_id, is_active);

CREATE INDEX IF NOT EXISTS idx_ki_canonical_url
  ON knowledge_sources_index (instance_id, canonical_url)
  WHERE canonical_url IS NOT NULL;
```

BM25 DDL is unchanged.

---

## Configuration Changes

### Before
| Variable | Required | Default |
|---|---|---|
| `PARADEDB_ENABLED` | No | `false` |
| `PARADEDB_URL` | No | — |
| `MONGO_URL` | Yes | — |

### After
| Variable | Required | Default |
|---|---|---|
| `PARADEDB_URL` | **Yes** | — |
| `PARADEDB_ENABLED` | Removed | (always on when URL is set) |
| `MONGO_URL` | Yes (unchanged) | — |

`PARADEDB_ENABLED` is removed. If `PARADEDB_URL` is set the pool initialises;
if it is absent the server raises a clear startup error:

```
RuntimeError: PARADEDB_URL is required — knowledge sources are stored in PostgreSQL/ParadeDB.
```

`_paradedb_bm25_ready` is retained internally; if the BM25 index fails to
initialise `search_knowledge` logs an error and returns an empty context string
(no MongoDB fallback).

---

## Implementation Plan

### 1. `_PARADEDB_DDL` — add `canonical_url` and `updated_at` columns

Update the DDL string and add the `canonical_url` index. Use `ADD COLUMN IF NOT
EXISTS` so the migration is safe to run against an existing table.

### 2. `init_paradedb()` — make unconditional

Remove the `if not PARADEDB_ENABLED or not PARADEDB_URL` early-return guard.
Replace with:

```python
if not PARADEDB_URL:
    raise RuntimeError(
        "PARADEDB_URL is required — knowledge sources are stored in PostgreSQL/ParadeDB."
    )
```

Remove all references to the `PARADEDB_ENABLED` constant.

### 3. New PostgreSQL helper functions

Add the following helpers near the existing `upsert_knowledge_source_to_paradedb`:

```python
async def _pg_fetch_source(source_id: str, instance_id: str) -> dict | None
async def _pg_list_sources(instance_id: str) -> list[dict]
async def _pg_count_sources(instance_id: str, is_active: bool | None = None) -> int
async def _pg_update_source(source_id: str, instance_id: str, fields: dict) -> dict | None
async def _pg_delete_source(source_id: str, instance_id: str) -> bool
async def _pg_find_by_canonical_url(instance_id: str, canonical_url: str) -> dict | None
```

All return plain `dict` (or `list[dict]`) by converting `asyncpg.Record` with
`dict(row)`. The `tags` column is a `TEXT[]`; asyncpg returns it as a Python
`list` directly.

### 4. Route updates

All routes below drop their `db.knowledge_sources.*` calls and use the helpers
above. `upsert_knowledge_source_to_paradedb` calls inside routes are removed
(the helpers write directly to the primary table).

| Route | Change |
|---|---|
| `GET /knowledge/sources` | `_pg_list_sources(instance_id)` — sorted by `priority DESC, created_at DESC` in SQL |
| `POST /knowledge/sources/faq` | `upsert_knowledge_source_to_paradedb(doc)` as the write; no MongoDB call |
| `POST /knowledge/sources/url` | duplicate check via `_pg_find_by_canonical_url`; write via `upsert_knowledge_source_to_paradedb` |
| `POST /knowledge/sources/upload` | write via `upsert_knowledge_source_to_paradedb` |
| `DELETE /knowledge/sources/{id}` | `_pg_delete_source` |
| `PATCH /knowledge/sources/{id}/toggle` | `_pg_fetch_source` → `_pg_update_source` |
| `PATCH /knowledge/sources/{id}/priority` | `_pg_update_source` |
| `PUT /knowledge/sources/{id}` | `_pg_fetch_source` → `_pg_update_source` |

`upsert_knowledge_source_to_paradedb` is promoted from a "mirror sync helper"
to the **primary write path** for all inserts. Its early-return guard
(`if _paradedb_pool is None: return`) becomes a raised exception.

Note: `asyncio.create_task(upsert_...)` calls in the existing routes are
replaced with `await upsert_...` since writes are now synchronous to the
request — the caller needs confirmation the write succeeded.

### 5. `search_knowledge` — remove MongoDB fallback

```python
async def search_knowledge(query: str, instance_id: str, limit: int = 5) -> str:
    if not _paradedb_bm25_ready:
        logger.error("search_knowledge: BM25 index not ready, returning empty context")
        return ""
    # ... existing BM25 path only
```

Remove the `all_sources = await db.knowledge_sources.find(...)` fallback block
entirely.

### 6. `analytics_overview` — knowledge count from PostgreSQL

```python
# Before
knowledge_count = await db.knowledge_sources.count_documents(
    {"is_active": True, "instance_id": instance_id}
)

# After
knowledge_count = await _pg_count_sources(instance_id, is_active=True)
```

### 7. `delete_instance` — cascade delete from PostgreSQL

```python
# Before
for col in [db.bot_config, db.knowledge_sources, db.conversations, db.discord_config]:
    await col.delete_many({"instance_id": instance_id})

# After
for col in [db.bot_config, db.conversations, db.discord_config]:
    await col.delete_many({"instance_id": instance_id})
async with _paradedb_pool.acquire() as conn:
    await conn.execute(
        "DELETE FROM knowledge_sources_index WHERE instance_id = $1", instance_id
    )
```

### 8. `startup_event` — remove MongoDB knowledge_sources indexes

Remove these two lines:
```python
await db.knowledge_sources.create_index([("title", "text"), ("content", "text")])
await db.knowledge_sources.create_index([("instance_id", 1)])
```

### 9. `sync_all_knowledge_sources_to_paradedb` and `/admin/paradedb/sync` — remove

The sync endpoint is not called from the frontend, tests, or any external code.
Both the helper function and the route are deleted. The `/admin/paradedb/status`
endpoint is retained (operators still need to inspect pool health).

### 10. `upsert_knowledge_source_to_paradedb` — add `canonical_url` and `updated_at`

Update the INSERT/UPDATE SQL to include the two new columns.

---

## Migration Path for Existing Deployments

Operators with existing data in MongoDB `knowledge_sources` can run a one-off
migration script (separate from the server) that reads from MongoDB and upserts
into PostgreSQL via the `upsert_knowledge_source_to_paradedb` helper, or they
can re-add sources through the UI. The MongoDB `knowledge_sources` collection is
no longer touched by the server after this change and can be dropped manually.

---

## Testing

- `POST /knowledge/sources/faq` — creates a source; `GET /knowledge/sources`
  returns it; source is visible in PostgreSQL, absent from MongoDB.
- `POST /knowledge/sources/url` with duplicate URL — returns 409.
- `DELETE /knowledge/sources/{id}` — removes from PostgreSQL; subsequent `GET`
  returns 404.
- `PATCH /knowledge/sources/{id}/toggle` — flips `is_active`.
- `GET /analytics/overview` — `knowledge_sources` count reflects PostgreSQL.
- `DELETE /instances/{id}` — cascades to PostgreSQL `knowledge_sources_index`.
- `search_knowledge` — returns BM25 results; no MongoDB collections queried.
- Start server without `PARADEDB_URL` — raises `RuntimeError` at startup.
- Start server with unreachable `PARADEDB_URL` — raises at startup with clear
  connection error.

Existing backend test suite (`backend/tests/`) covers knowledge base priority
and source editing — these tests must pass without MongoDB knowledge_sources
collection being populated.

---

## Files Changed

- `backend/server.py` — the only file that changes.

---

## Resolved Decisions

- `/admin/paradedb/sync` — **removed** (no frontend or external callers found).
- `PARADEDB_ENABLED` — **removed immediately** (no deprecation grace period needed).
