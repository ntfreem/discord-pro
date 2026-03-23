# BotForge - AI Chatbot Platform PRD

## Problem Statement
AI Chatbot platform with admin web UI, Claude AI integration (Opus 4.5), Discord bot support, website chat widget, and knowledge base (RAG). One bot brain across web + Discord, strong control over how it speaks, ability to improve from real conversations.

## Architecture

### Tech Stack
- **Frontend**: React + Tailwind CSS + shadcn/ui, dark theme
- **Backend**: FastAPI (Python), MongoDB
- **AI**: Claude Opus 4.5 via Emergent Universal Key (emergentintegrations library)
- **RAG**: MongoDB text search for knowledge retrieval
- **Discord**: discord.py v2 async background task

### Key Files
```
/app/backend/server.py          - Full API (chat, knowledge, bot config, conversations, analytics, discord)
/app/frontend/src/App.js        - Routes
/app/frontend/src/components/AdminLayout.js  - Sidebar nav
/app/frontend/src/pages/Dashboard.js        - Admin overview
/app/frontend/src/pages/KnowledgeBase.js    - Knowledge management
/app/frontend/src/pages/Conversations.js   - Conversation review + tone training
/app/frontend/src/pages/BotSettings.js     - Bot persona editor
/app/frontend/src/pages/Analytics.js       - Recharts dashboard
/app/frontend/src/pages/DiscordSettings.js - Discord bot setup
/app/frontend/src/pages/EmbedCode.js       - Embed code generator
/app/frontend/src/pages/ChatPage.js        - Public standalone chat
/app/frontend/src/pages/ChatWidget.js      - Embeddable widget
```

## Routes
- `/admin` → Dashboard
- `/admin/knowledge` → Knowledge Base
- `/admin/conversations` → Conversations
- `/admin/settings` → Bot Settings
- `/admin/analytics` → Analytics
- `/admin/discord` → Discord Integration
- `/admin/embed` → Embed Code
- `/chat` → Public standalone chat
- `/widget` → Embeddable widget (iframe-ready)

## What's Been Implemented

### Phase 1 MVP (Completed - Feb 2026)
- [x] Admin Dashboard with stats (conversations, messages, knowledge sources, training examples)
- [x] Knowledge Base: FAQ entry, URL scraping (httpx + BeautifulSoup), file upload (.txt/.pdf via PyPDF2)
- [x] MongoDB text search RAG (auto-injects relevant knowledge into Claude context)
- [x] Conversation storage + review admin UI
- [x] Tone training: approve conversations as style examples for Claude
- [x] Bot Settings: name, persona, custom instructions + system prompt preview
- [x] Analytics: line chart (7 days), platform pie chart, daily breakdown table
- [x] Discord bot: discord.py v2, async background task, responds to @mentions + DMs
- [x] Embeddable chat widget at /widget
- [x] Standalone chat page at /chat
- [x] Embed code generator (iframe, JavaScript, React snippets)
- [x] One brain across web + Discord (same knowledge base, same Claude config)

### AI Integration
- Model: `claude-opus-4-5-20251101` via Emergent Universal Key
- In-memory LlmChat sessions per session_id
- Dynamic system prompt: persona + RAG knowledge + tone examples
- Conversation history managed in MongoDB

## Environment Variables
```
# Backend (.env)
MONGO_URL=mongodb://localhost:27017
DB_NAME=test_database
EMERGENT_LLM_KEY=sk-emergent-dDaA292Ef6fAa5e3aB

# Frontend (.env)
REACT_APP_BACKEND_URL=https://claude-support-bot.preview.emergentagent.com
```

## API Endpoints
```
POST /api/chat/send               - Send message to Claude
GET  /api/chat/history/{id}       - Get conversation history
GET  /api/admin/bot-config        - Get bot config
PUT  /api/admin/bot-config        - Update bot config
GET  /api/knowledge/sources       - List knowledge sources
POST /api/knowledge/sources/faq   - Add FAQ
POST /api/knowledge/sources/url   - Scrape URL
POST /api/knowledge/sources/upload- Upload file
DELETE /api/knowledge/sources/{id}- Delete source
PATCH /api/knowledge/sources/{id}/toggle - Toggle active
GET  /api/conversations           - List conversations
PATCH /api/conversations/{id}/approve - Approve for tone training
DELETE /api/conversations/{id}    - Delete conversation
GET  /api/analytics/overview      - Overview stats
GET  /api/analytics/daily         - Daily breakdown (7 days)
GET  /api/discord/config          - Get Discord config
PUT  /api/discord/config          - Update Discord config (token + active)
POST /api/discord/restart         - Start/restart Discord bot
GET  /api/discord/status          - Bot online status
```

## Prioritized Backlog

### P0 (Critical - User Requested)
- [x] One-brain across web + Discord
- [x] Knowledge base (FAQ + URL + file)
- [x] Tone training from conversations
- [x] Bot persona control
- [ ] Discord token input from user (pending - user needs to find their token)

### P1 (High Value)
- [ ] Real-time streaming responses (SSE/WebSockets)
- [ ] Conversation search/filter
- [ ] Knowledge chunk editing
- [ ] Export conversations
- [ ] Multi-bot support (multiple personas)

### P2 (Future)
- [ ] Authentication/login for admin
- [ ] Vector database integration (Pinecone/Weaviate) for better RAG
- [ ] Webhook for new conversations
- [ ] Slack integration
- [ ] Rate limiting
- [ ] Conversation tagging/categorization
- [ ] LLM session persistence across server restarts

## Notes
- Discord bot starts automatically on server startup if token is configured and active
- Knowledge RAG uses MongoDB text search (no vector DB needed for MVP)
- LlmChat sessions are in-memory (reset on server restart - acceptable for MVP)
- Widget is iframe-embeddable at /widget
