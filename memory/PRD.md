# BridgeBot — Product Requirements Document

## Overview
Multi-tenant SaaS chatbot platform where admins create AI knowledge-base instances and assign them to users. Supports web chat, embeddable widget, and Discord bot integration.

## Core Architecture
- **Frontend**: React (CRA), Tailwind, Shadcn/UI components
- **Backend**: FastAPI (Python), single `server.py` (~1550 lines)
- **Database**: MongoDB (Motor async driver)
- **Auth**: Hybrid JWT (Bearer + HttpOnly Cookie), supports email or username login
- **LLM**: Claude via Emergent Universal Key
- **Email**: Resend API (MOCKED — no real domain verified)
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

## Backlog

### P2 — Refactor server.py
- Split ~1550-line server.py into modular route files

### P2 — Real-time Streaming
- SSE or WebSocket for streaming chat responses

### P2 — Vector DB
- Pinecone/Weaviate integration for semantic RAG search

## Constraints
- **No rate limiting** (user explicitly requested this)
- Branding must stay "BridgeBot"
