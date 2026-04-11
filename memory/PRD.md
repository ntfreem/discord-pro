# BridgeBot - AI Chatbot SaaS Platform

## Product Requirements Document

### Original Problem Statement
Create an AI chatbot (BridgeBot) with an admin web UI, Discord integration, and website widget using Claude. Must have a knowledge base (RAG over docs) and tone training layer. Transform the app into a multi-tenant SaaS where an admin can create multiple instances and assign them to users. Include email verification, hybrid JWT auth, and Discord integration capabilities.

### Architecture
```
/app/
├── backend/
│   ├── .env (MONGO_URL, DB_NAME, CLAUDE_API_KEY, RESEND_API_KEY)
│   ├── requirements.txt
│   └── server.py (~1200 lines, monolithic FastAPI backend)
├── frontend/
│   ├── package.json
│   ├── craco.config.js (@ alias configured)
│   └── src/
│       ├── theme.js (Tron design system tokens)
│       ├── index.css (CSS vars, fonts, animations)
│       ├── App.css (scrollbar, global styles)
│       ├── App.js (routing)
│       ├── utils/api.js (relative /api paths)
│       ├── context/AuthContext.js (hybrid JWT auth)
│       ├── components/AdminLayout.js (Tron sidebar)
│       └── pages/ (17 pages - all Tron themed)
├── memory/
│   ├── PRD.md
│   └── test_credentials.md
└── design_guidelines.json
```

### Tech Stack
- React 19, FastAPI, MongoDB (Motor), Hybrid JWT Auth
- Claude Opus 4.5 / Sonnet 4.5 via Emergent LLM Key
- Discord.py (background task), Resend Email API
- Recharts for analytics, Lucide icons, Sonner toasts

### What's Been Implemented

**Core Platform (Complete)**
- Multi-tenant SaaS with isolated bot instances
- Hybrid JWT auth (Bearer + HttpOnly Cookie)
- Email verification & password reset via Resend
- Admin user management & instance assignment
- Knowledge base (FAQ, URL scraping, document upload)
- AI chat with knowledge gate & tone training
- LLM analytics with Opus→Sonnet fallback logic
- Discord bot integration (channel monitoring, name sync)
- Website embed widget & standalone chat page

**P0 Tron UI Redesign (Complete - Feb 2026)**
- Full "Tactical Futurism" design system applied to all 17+ pages
- Shared theme.js with design tokens (colors, fonts, spacing)
- Deep navy backgrounds (#030712), cyan (#00F5FF) accents, royal blue (#0088FF) primary
- Outfit headings, IBM Plex Sans body, JetBrains Mono mono
- Sharp 2px corners, glow effects, glassmorphism
- Split-screen auth pages with generated Tron grid background image
- Consistent sidebar with cyan active indicators
- All charts, tables, cards, inputs, buttons redesigned

### Pending / Future Tasks
- P2: Split server.py into separate route modules (~1200 lines)
- P2: Real-time streaming chat responses (SSE/WebSockets)
- P2: Vector DB integration (Pinecone/Weaviate) for semantic RAG

### Key API Endpoints
- POST /api/auth/login, /api/auth/register, /api/auth/verify
- POST /api/auth/forgot-password, /api/auth/reset-password
- GET /api/auth/me
- GET /api/admin/bot-config, PUT /api/admin/bot-config
- GET/POST /api/knowledge/sources/*
- POST /api/chat/send, GET /api/chat/history/:sessionId
- GET /api/analytics/overview, /api/analytics/daily, /api/analytics/llm-usage
- GET /api/conversations, PATCH /api/conversations/:id/approve
- GET/PUT /api/discord/config, POST /api/discord/restart, /api/discord/sync-name
- GET /api/admin/instances, /api/admin/users

### DB Collections
- users, bot_instances, bot_config, knowledge_sources
- conversations, discord_config, llm_usage

### Critical Notes
1. Frontend uses ONLY relative /api paths (no REACT_APP_BACKEND_URL in source)
2. Discord bot name changes rate-limited to 2/hour
3. LLM fallback: Opus 4.5 → 2 retries → Sonnet 4.5 (logged to llm_usage)
4. Resend email is mocked if API key missing (prints to stdout)
