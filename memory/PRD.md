# BridgeBot — Product Requirements Document

## Overview
Multi-tenant SaaS chatbot platform where admins create AI knowledge-base instances and assign them to users. Supports web chat, embeddable widget, and Discord bot integration.

## Core Architecture
- **Frontend**: React (CRA), Tailwind, Shadcn/UI components
- **Backend**: FastAPI (Python), single `server.py` (~2000 lines)
- **Database**: MongoDB Atlas — **`bridgebot_preview`** for the preview environment, **`bridgebot_prod`** for production (isolated databases in the same cluster as of 2026-05-26)
- **Auth**: Hybrid JWT (Bearer + HttpOnly Cookie), supports email or username login
- **LLM**: Claude via Emergent Universal Key
- **Email**: Resend API (LIVE — `bridgebot.tech` domain verified; free-tier daily quota limits apply)
- **Discord**: discord.py + Discord OAuth2 Application flow

## Design System
- Theme: "Tactical Futurism" — soft, rounded, blue palette
- Tokens defined in `/app/frontend/src/theme.js`

## Implemented Features

### Authentication (DONE)
- Email or Username login/registration
- Admin default username: `administrator`
- JWT tokens with 7-day expiry
- Password reset flow (email MOCKED via Resend)

### Multi-Tenant Instances (DONE)
- Admins create/manage bot instances
- Users assigned to instances

### Knowledge Base (DONE)
- FAQ entries, URL scraping, document upload
- **Priority system** (Normal/Medium/High) — High-priority sources checked first
- Priority can be set when adding and changed inline with up/down arrows
- Search sorts by priority then text relevance

### Chat (DONE)
- Web chat page + embeddable widget
- Session-based conversations
- Claude LLM with knowledge context + knowledge gate protocol

### Discord Bot (DONE)
- OAuth2 "Invite Bot" flow with one-click server invite
- Live config: listen mode, reply style, channel selection read from DB per message
- Bot name sync pushes server nickname (not just global username)

### Analytics (DONE)
- Dashboard overview, daily stats, LLM usage tracking

### UI Redesign (DONE)
- Soft, rounded, blue theme across all components

### Discord App Setup Page (DONE — 2026-05-25)
- New admin-only page at `/admin/discord-app-setup` with sidebar nav item
- Step-by-step Discord Developer Portal walkthrough (7 steps)
- Current Configuration display (masked credentials + last updated timestamp)
- Update Credentials form (moved from Discord Settings page)
- Danger Zone: Clear all credentials with confirmation dialog showing currently-connected instances + optional checkbox to also wipe instance ↔ guild mappings
- "How the mapping works" reference card + link to architecture docs
- Backend endpoints: `GET /api/discord/app-config/connections`, `DELETE /api/discord/app-config?clear_connections=bool`

### Architecture Docs Section (DONE — 2026-05-25)
- New "Architecture & Flow" section in `/docs` with monospace ASCII diagrams
- Includes: Message Flow end-to-end, Discord App ↔ Instance ↔ Server mapping, Data Stores, Three Key Architectural Decisions
- URL hash navigation (`/docs#architecture` opens straight to section)
- Linked from Discord App Setup page

### Passive Mode (DONE — 2026-05-25)
- New per-instance Discord setting: bot continuously monitors but only replies when it detects a real question it can confidently answer from the KB
- Implementation: single LLM call with `[SKIP]` sentinel — Claude returns `[SKIP]` for small-talk/non-questions, backend stays silent
- @mentions and DMs always get a reply (bypasses passive check) per UX recommendation
- UI toggle on `/admin/discord` page between Reply Style and Human Takeover
- Field: `discord_config.passive_mode` (boolean, default false)

### Passive Mode Session Bug Fix + Skip Analytics (DONE — 2026-05-26)
- **Bug fix**: `LlmChat` sessions cached per Discord user kept the OLD system prompt forever. When Passive Mode was toggled ON, returning users still chatted normally because their cached session never picked up the `[SKIP]` instruction. Fix: `call_claude` now refreshes `session.messages[0]` (the system role) on every call, so prompt changes take effect immediately.
- **Analytics**: new `passive_skips` MongoDB collection logs every skip (instance_id, channel_id, username, message preview, timestamp)
- New endpoint `GET /api/analytics/passive-skips` returns today / last 7 days / all-time counts + last 10 skipped messages
- Analytics page now shows a "Passive Mode Skips" card (only appears when count > 0) with the 3 totals and a recent-activity list

### "Train on this" Feature (DONE — 2026-05-26)
- Each row in the "Recent skipped messages" list has a small "+ Train" button
- Clicking opens a modal pre-filled with the skipped question, an Answer textarea, and Priority selector (Normal/Medium/High)
- Clicking "Add to Knowledge Base" calls `POST /api/knowledge/sources/faq` and instantly adds it to the active instance's KB
- Closes the loop: missed-question → FAQ entry without leaving the analytics page

## Backlog

### P1 — Multi-Server per Instance (PARKED — revisit later)
- Allow one bot instance to be connected to multiple Discord servers, all sharing that instance's KB
- Schema: new `discord_guilds` collection `{instance_id, guild_id, guild_name, connected_at}` (move guild mapping out of `discord_config`)
- Bot routing: lookup `guild_id → instance_id` via new collection
- UI: "Connected Servers" list per instance with "Add Another Server" (OAuth invite) and "Disconnect" actions
- Decision pending: single shared Discord settings across servers vs per-server overrides

### P2 — Refactor server.py
- Split ~1550-line server.py into modular route files

### P2 — Real-time Streaming
- SSE or WebSocket for streaming chat responses

### P2 — Vector DB
- Pinecone/Weaviate integration for semantic RAG search

## Constraints
- **No rate limiting** (user explicitly requested this)
- Branding must stay "BridgeBot"
