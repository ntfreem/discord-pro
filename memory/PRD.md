# BridgeBot — Product Requirements Document

## Overview
Multi-tenant SaaS chatbot platform where admins create AI knowledge-base instances and assign them to users. Supports web chat, embeddable widget, and Discord bot integration.

## Core Architecture
- **Frontend**: React (Vite-free CRA), Tailwind, Shadcn/UI components
- **Backend**: FastAPI (Python), single `server.py` (~1450 lines)
- **Database**: MongoDB (Motor async driver)
- **Auth**: Hybrid JWT (Bearer + HttpOnly Cookie), supports email or username login
- **LLM**: Claude via Emergent Universal Key
- **Email**: Resend API (MOCKED — no real domain verified)
- **Discord**: discord.py + Discord OAuth2 Application flow

## Design System
- Theme: "Tactical Futurism" — soft, rounded, blue palette
- Tokens defined in `/app/frontend/src/theme.js`
- Custom Pixar-style AI robot graphic on login page

## Implemented Features

### Authentication (DONE)
- Email or Username login/registration
- Admin default username: `administrator`
- JWT tokens with 7-day expiry
- Password reset flow (email MOCKED via Resend)
- Email verification flow (MOCKED)

### Multi-Tenant Instances (DONE)
- Admins create/manage bot instances
- Users assigned to instances
- Instance selector on login

### Knowledge Base (DONE)
- FAQ entries, URL scraping, document upload
- Keyword search for RAG context

### Chat (DONE)
- Web chat page + embeddable widget
- Session-based conversations
- Claude LLM with knowledge context

### Discord Bot (DONE)
- **OAuth2 "Invite Bot" flow** (NEW — April 2026)
  - `GET /api/discord/oauth-url` generates Discord authorization URL
  - `GET /api/discord/callback` handles OAuth redirect, saves guild info
  - Frontend "Invite Bot to Server" button replaces manual token paste
  - Simplified 3-step setup guide
  - Manual token input preserved as "Advanced" fallback
- Listen modes: mention_only, all_channels, specific_channels
- Reply styles: natural, with_mention
- Bot name sync to Discord
- Channel selection for specific_channels mode

### Analytics (DONE)
- Dashboard overview, daily stats, LLM usage tracking
- Platform breakdown (web vs discord)

### UI Redesign (DONE)
- Soft, rounded, blue theme across all components
- BridgeBot branding (no "Discord-Pro")

## Credentials
- Discord Client ID: 1492589924480843858
- Discord Client Secret: stored in backend/.env
- Discord Redirect URI: {APP_URL}/api/discord/callback
- **Important**: User must register this redirect URI in Discord Developer Portal > OAuth2 > Redirects

## Backlog

### P2 — Refactor server.py
- Split ~1450-line server.py into modular route files (/routes folder)
- Separate Discord background tasks from API routes

### P2 — Real-time Streaming
- SSE or WebSocket for streaming chat responses

### P2 — Vector DB
- Pinecone/Weaviate integration for semantic RAG search

## Constraints
- **No rate limiting** (user explicitly requested this)
- Branding must stay "BridgeBot" (no "Discord-Pro")
