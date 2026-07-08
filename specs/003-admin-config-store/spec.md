# Spec 003 — Admin Config Store

## Status
Draft

## Problem

Currently, every integration (Anthropic, Resend, Discord) requires environment
variables set before the server starts. This makes first-time setup friction-
heavy and incompatible with modern self-hosted application expectations, where
you get the app running first and then configure services through an admin UI.

The workaround — editing `.env` files and restarting the server — is acceptable
for developers but is a poor experience for operators who just want to run the
platform.

## Goal

Make the app installable with only four required environment variables:

```
MONGO_URL
PARADEDB_URL
JWT_SECRET
ADMIN_EMAIL / ADMIN_PASSWORD
```

All integrations (Anthropic, Resend, Discord) are configurable from the admin
UI and stored in MongoDB. Environment variables remain supported as fallbacks
for operators who prefer them, but they are not required for first startup.

## Non-Goals

- Replacing environment variables entirely (they remain a valid config path).
- Adding user-level preferences (this is admin/superadmin config only).
- Encrypting stored secrets at rest in this phase (tracked separately).

---

## Architecture

### Storage

A new `app_config` collection in MongoDB stores key-value integration config:

```json
{
  "_id": "integrations",
  "anthropic_api_key": "sk-ant-...",
  "resend_api_key": "re_...",
  "resend_from_email": "noreply@example.com"
}
```

Discord credentials already have their own `discord_app_config` collection
(used by `get_discord_credentials()`). That collection is unchanged.

### Read Priority

For every integration secret, the read order is:

1. MongoDB `app_config` document (set via admin UI)
2. Environment variable (fallback for operators who prefer `.env`)
3. Empty string / None (integration is disabled, no crash)

This means operators can migrate gradually — env vars continue to work, and
config stored in the DB takes precedence once set via the UI.

### New helper

```python
async def get_app_config() -> dict:
    """Return merged integration config: DB values override env var fallbacks."""
    doc = await db.app_config.find_one({"_id": "integrations"}) or {}
    return {
        "anthropic_api_key": doc.get("anthropic_api_key") or os.environ.get("ANTHROPIC_API_KEY", ""),
        "resend_api_key":    doc.get("resend_api_key")    or os.environ.get("RESEND_API_KEY", ""),
        "resend_from_email": doc.get("resend_from_email") or os.environ.get("FROM_EMAIL", "noreply@bridgebot.tech"),
    }
```

---

## API Changes

### New routes (superadmin only)

```
GET  /api/admin/config
POST /api/admin/config
```

**GET /api/admin/config** — returns current integration config. Secrets are
masked (last 4 chars shown, rest replaced with `***`).

Response:
```json
{
  "anthropic_api_key": "***...xYzW",
  "resend_api_key": "***...Ab12",
  "resend_from_email": "noreply@example.com",
  "anthropic_configured": true,
  "resend_configured": true
}
```

**POST /api/admin/config** — upserts one or more config values. Omitted fields
are left unchanged (partial update). Empty string clears a field.

Request body:
```json
{
  "anthropic_api_key": "sk-ant-...",
  "resend_api_key": "re_...",
  "resend_from_email": "noreply@example.com"
}
```

Response: same shape as GET (after update, masked).

### Pydantic model

```python
class AppConfigUpdate(BaseModel):
    anthropic_api_key: Optional[str] = None
    resend_api_key:    Optional[str] = None
    resend_from_email: Optional[str] = None
```

---

## Backend Changes

### `call_claude`

Currently reads `ANTHROPIC_API_KEY` from the environment at module load via the
`anthropic.AsyncAnthropic()` client, which is instantiated once. This needs to
become per-request or per-session.

Options:
1. **Per-request client** — call `get_app_config()` inside `call_claude` and
   instantiate a new `AsyncAnthropic(api_key=...)` each time. Simple but
   creates a new HTTP connection pool per call.
2. **Cached client with invalidation** — cache the client keyed on the API key
   value; re-instantiate when the key changes. More complex but avoids
   connection churn.

**Recommended**: option 1 for this phase. The overhead of instantiating the
client is negligible compared to the LLM round-trip. Optimise if profiling
shows it as a bottleneck.

### `send_verification_email` / `send_reset_email`

Both currently read `resend.api_key` from the module-level `resend.api_key`
assignment. Change to call `get_app_config()` at send time and use the returned
key. This allows Resend to be configured after startup without a restart.

### Startup

Remove the module-level `ANTHROPIC_API_KEY` and `RESEND_API_KEY` reads used for
anything other than the initial fallback. Startup no longer logs a warning for a
missing Anthropic key — the server starts cleanly and the UI shows an
"Anthropic not configured" banner in the admin panel.

---

## Frontend Changes

### Admin Settings page

Add an **Integrations** section to the admin settings panel with:

- **Anthropic API Key** — text input (masked), save button, status badge
  (Configured / Not configured)
- **Resend API Key** — same pattern
- **Resend From Email** — plain text input

Status badge reads from `GET /api/admin/config` → `anthropic_configured` /
`resend_configured` fields.

### "Not configured" state

When a user sends a chat message and Anthropic is not configured, the backend
currently crashes or returns an opaque error. After this change it should return
a structured error:

```json
{
  "detail": "Anthropic API key not configured. An admin must set it in Settings → Integrations."
}
```

The frontend surfaces this as a dismissable banner in the chat UI.

---

## Migration

No data migration is needed. On first startup after this change:
- `app_config` collection does not exist — `get_app_config()` returns env var
  values, preserving existing behaviour.
- Operators who set env vars see no change.
- Operators who configure via the UI gain the ability to update without
  restarting.

---

## Testing

- `GET /api/admin/config` — returns masked keys; `anthropic_configured: false`
  when no key is set in DB or env.
- `POST /api/admin/config` with a key — subsequent GET returns
  `anthropic_configured: true`.
- `POST /api/admin/config` with empty string for a key — clears the DB value;
  falls back to env var if set.
- Chat with no Anthropic key configured — returns structured 503 error.
- Chat with valid Anthropic key in DB — works without restarting the server.
- Env var fallback — set key in env but not DB; `call_claude` uses the env var.

---

## Files Changed

- `backend/server.py` — `get_app_config()`, updated `call_claude`,
  `send_verification_email`, `send_reset_email`, new admin routes
- `frontend/src/` — new Integrations section in admin settings
- `backend/tests/` — new test file `test_admin_config.py`

---

## Open Questions

1. Should the Anthropic key be per-instance (each bot uses its own key) or
   global (one key for the whole platform)? Current assumption: global, set by
   superadmin.
2. Should stored secrets be encrypted at rest? Deferred to a follow-on spec —
   MongoDB Atlas encryption-at-rest covers the storage layer for hosted
   deployments.
3. Should config changes take effect immediately for in-flight LLM sessions, or
   only for new sessions? Recommendation: new sessions only (simplest and safest).
