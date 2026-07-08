# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

**BridgeBot / BotForge** — a multi-tenant SaaS platform for building, deploying, and managing AI-powered Discord bots. Admins configure bot instances with knowledge bases; end users chat via a web widget or Discord. The platform is sometimes called "BotForge" in the UI.

## Commands

### Backend (Python/FastAPI)

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn server:app --host 0.0.0.0 --port 8000 --reload

# Run all tests (requires BACKEND_URL env var pointing at a running server)
BACKEND_URL=http://localhost:8000 pytest tests/ -v

# Run a single test
BACKEND_URL=http://localhost:8000 pytest tests/test_botforge.py::TestHealth::test_root -v
```

### Frontend (React)

```bash
cd frontend

# Install dependencies
yarn install

# Dev server (port 3000)
yarn start

# Production build
yarn build

# Run tests
yarn test --watchAll=false

# Run a single test by name
yarn test --watchAll=false --testNamePattern="my test name"
```

## Architecture

### Backend (`backend/server.py`)

Single-file FastAPI monolith (~2086 lines). Key sections in order:

1. **Auth helpers** — `create_access_token`, `get_current_user`, `require_admin`, `get_instance_access`
2. **LLM/knowledge helpers** — `search_knowledge`, `build_system_prompt`, `call_claude`, `save_conversation`
3. **Discord bot** — `_resolve_instance_for_guild`, `start_shared_discord_bot`
4. **Route groups** — `/auth/*`, `/admin/*`, `/knowledge/*`, `/chat/*`, `/conversations/*`, `/analytics/*`, `/discord/*`

Critical design decisions:
- **Multi-tenancy** — every authenticated request carries `X-Instance-ID` header; all DB queries are scoped to it.
- **JWT** — 7-day tokens + httpOnly cookies. Registration sends verification email via Resend (falls back to console locally).
- **LLM** — `anthropic.AsyncAnthropic` via a thin `_ChatSession` wrapper in `server.py`. Active sessions live in module-level `llm_sessions: Dict[str, _ChatSession]`; this dict is shared across all instances.
- **Discord** — discord.py v2. Module-level `guild_instance_map: Dict[str, str]` maps guild IDs to instance IDs. **Critical bug**: single shared bot client means only one Discord bot runs at a time (tracked in `specs/001-fix-discord-isolation/`).
- **Database** — MongoDB async via Motor. Collections: `users`, `bot_instances`, `conversations`, `knowledge_sources`, `analytics_events`.

### Frontend (`frontend/src/`)

React 19 + React Router 7.5, built with Craco. Path alias `@/` resolves to `src/`.

- **`context/AuthContext.js`** — Session source of truth. Persists to localStorage under keys `bf_token`, `bf_user`, `bf_instances`, `bf_instance`, `bf_instance_id`. Validates token against `/api/auth/me` on load; auto-selects instance if only one exists. Exports `{ user, instances, selectedInstance, login, logout, selectInstance, refreshInstances, loading }`.
- **`utils/api.js`** — Axios instance (`baseURL: /api`). Request interceptor injects `Authorization: Bearer` and `X-Instance-ID`. Response interceptor clears localStorage and redirects to `/login` on 401. Always import this instead of raw axios.
- **`App.js`** — Route guards: `ProtectedRoute` (requires auth), `AdminOnlyRoute` (requires `role === "superadmin"`), `PublicOnlyRoute` (redirects authenticated users). Admin pages are nested under `AdminLayout`.
- **`components/AdminLayout.js`** — Sidebar navigation wrapper for all `/admin/*` routes.
- **`components/ui/`** — 46 Radix UI + Shadcn primitives. Extend these; don't create raw HTML equivalents.
- **Key UI libraries** — `lucide-react` (icons), `recharts` (analytics charts), `framer-motion` (animations).

### Design System

`design_guidelines.json` is the authoritative brand reference. Core palette:
- Background: `#030712` (void black) / Surface: `#050B14` / Panel: `#0B132B`
- Accent: `#00F5FF` (electric cyan) / Brand: `#0088FF` (royal blue)
- Fonts: Outfit (headings), IBM Plex Sans (body), JetBrains Mono (data/accents)
- Layout: bento grid (`grid-cols-1 md:grid-cols-3 lg:grid-cols-4`)

Tailwind config extends these tokens. Match this aesthetic for any new UI.

## Testing Protocol

Backend tests use the `requests` library and read `BACKEND_URL` from the environment — they require a live server. Test files are in `backend/tests/` and cover: auth isolation, multi-tenancy, knowledge base priority, Discord OAuth, password reset, and source editing.

`test_result.md` is a YAML communication file between main and testing agents — do not delete or reformat it. Delegate test execution to a testing agent when available and update `test_result.md` with results.

## Development Approach

This project uses **spec-driven development**: write a spec in `specs/<NNN>-<slug>/spec.md` before implementing any non-trivial feature. The `specs/` directory does not exist yet and must be created. The flow is: spec → plan → implement, not the reverse.

## Key Known Issues

1. **Discord isolation bug** (critical) — global bot state allows only one bot instance to run at a time. Tracked in `specs/001-fix-discord-isolation/`.
2. **Silent frontend failures** — many `.catch(() => {})` calls swallow errors with no user feedback.
3. **Backend monolith** — `server.py` is a single large file; be cautious about merge conflicts and side effects when editing it.
