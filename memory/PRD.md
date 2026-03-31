# BridgeBot - AI Chatbot SaaS Platform PRD

## Problem Statement
AI Chatbot platform with admin web UI, Claude AI integration (Opus 4.5), Discord bot support, website chat widget, and knowledge base (RAG). Multi-tenant SaaS: admin can create multiple bot instances and assign users to them. Users log in via email verification and see only their assigned instance.

## Architecture

### Tech Stack
- **Frontend**: React + Tailwind CSS + shadcn/ui, dark theme
- **Backend**: FastAPI (Python), MongoDB
- **AI**: Claude Opus 4.5 via Claude API key (`CLAUDE_API_KEY`)
- **Auth**: JWT (PyJWT) + bcrypt password hashing
- **Email**: Resend (MOCKED via console print until API key provided)
- **RAG**: MongoDB text search for knowledge retrieval
- **Discord**: discord.py v2 async background task

### Key Files
```
/app/backend/server.py              - Full API (auth, instances, chat, knowledge, conversations, analytics, discord)
/app/frontend/src/context/AuthContext.js    - JWT auth context, instance selection
/app/frontend/src/utils/api.js      - Axios instance with auth/instance-id interceptors
/app/frontend/src/App.js            - Routes + ProtectedRoute + PublicOnlyRoute
/app/frontend/src/components/AdminLayout.js  - Sidebar with instance switcher, logout, user info
/app/frontend/src/pages/Login.js    - Sign in page
/app/frontend/src/pages/Register.js - Sign up page
/app/frontend/src/pages/VerifyEmail.js - OTP verification
/app/frontend/src/pages/InstanceSelect.js - Post-login instance picker
/app/frontend/src/pages/Instances.js      - SuperAdmin instance + user management
/app/frontend/src/pages/Dashboard.js        - Admin overview
/app/frontend/src/pages/KnowledgeBase.js    - Knowledge management
/app/frontend/src/pages/Conversations.js   - Conversation review + tone training
/app/frontend/src/pages/BotSettings.js     - Bot persona editor
/app/frontend/src/pages/Analytics.js       - Recharts dashboard
/app/frontend/src/pages/DiscordSettings.js - Discord bot setup
/app/frontend/src/pages/EmbedCode.js       - Embed code generator (instance-aware)
/app/frontend/src/pages/ChatPage.js        - Public standalone chat (instance_id via URL)
/app/frontend/src/pages/ChatWidget.js      - Embeddable widget (instance_id via URL)
```

## Routes
### Auth (public)
- `/login` → Login page
- `/register` → Register page
- `/verify` → Email OTP verification
- `/select-instance` → Instance picker (post-login, if multiple instances)
### Admin (protected, requires JWT + instance selection)
- `/admin` → Dashboard
- `/admin/knowledge` → Knowledge Base
- `/admin/conversations` → Conversations
- `/admin/settings` → Bot Settings
- `/admin/analytics` → Analytics
- `/admin/discord` → Discord Integration
- `/admin/embed` → Embed Code
- `/admin/instances` → Instance Management (superadmin only)
### Public
- `/chat?instance=<id>` → Public standalone chat
- `/widget?instance=<id>` → Embeddable widget (iframe-ready)

## What's Been Implemented

### Phase 1 MVP (Feb 2026)
- [x] Knowledge Base: FAQ, URL scraping, file upload (.txt/.pdf)
- [x] MongoDB text search RAG
- [x] Conversation storage + review admin UI
- [x] Tone training: approve conversations + manual examples
- [x] Bot Settings: name, persona, custom instructions
- [x] Analytics: line chart (7 days), platform pie chart
- [x] Discord bot: discord.py v2 async background task
- [x] Embeddable chat widget at /widget
- [x] Standalone chat page at /chat
- [x] Embed code generator

### Phase 2 - Tone Training v2 (Feb 2026)
- [x] Manual crafted examples in Bot Settings
- [x] Tone description field (plain-English voice description)
- [x] Priority: Crafted examples > Approved conversations > General training

### Phase 3 - Multi-tenant SaaS Auth (Feb 2026)
- [x] JWT authentication (PyJWT + bcrypt)
- [x] User registration with email verification (Resend — live with re_SPdTV1HR key)
- [x] Admin seeded: admin@bridgebot.tech / Admin@123 (auto on startup)
- [x] Protected routes (ProtectedRoute, AdminOnlyRoute, PublicOnlyRoute)
- [x] Instance management: CRUD for bot instances
- [x] User assignment: admin assigns users to instances
- [x] Multi-instance data isolation (all DB queries scoped by instance_id)
- [x] Instance switcher in sidebar (if multiple instances)
- [x] Default instance auto-created on first run (migrates existing data)
- [x] Superadmin vs User role separation
- [x] Logout button in sidebar
- [x] Post-login flow: 1 instance → auto-select → /admin; multiple → /select-instance; 0 → no-instance banner
- [x] Hybrid auth: Bearer token (localStorage) + HttpOnly cookie
- [x] BridgeBot rebrand (removed all Emergent UI artifacts)

### Phase 4 - Bug Fixes (Mar 2026)
- [x] Fixed "Failed to load instances" production bug (DB wipe caused transient 500 errors)
- [x] Added `refreshInstances` to AuthContext — sidebar updates immediately after instance create/delete
- [x] Dashboard now skips API calls when no instance selected; shows "No workspace selected" message
- [x] Dashboard re-fetches data when `selectedInstance` changes (instance switch works without page reload)
- [x] Block login for non-admin users with 0 assigned instances ("No instances assigned. Contact your admin.")
- [x] Removed startup auto-creation of default instance (admin creates instances manually)
- [x] Password reset via email OTP (POST /auth/forgot-password + POST /auth/reset-password, 15-min expiry)
- [x] "Forgot password?" link on login page → /forgot-password → /reset-password flow
- [x] Admin Users page (/admin/users) — shows all users with assigned/unassigned status, tabs (All/Assigned/Unassigned), verification badges

## Environment Variables
```
# Backend (.env)
MONGO_URL=mongodb://localhost:27017
DB_NAME=test_database
CLAUDE_API_KEY=<your-claude-api-key>
JWT_SECRET=botforge-jwt-secret-change-in-production-2026

# Frontend (.env)
REACT_APP_BACKEND_URL=https://claude-support-bot.preview.emergentagent.com
```

## API Endpoints
### Auth (public)
```
POST /api/auth/register       - Register (mock email)
POST /api/auth/verify         - Verify OTP
POST /api/auth/resend-code    - Resend OTP
POST /api/auth/login          - Login → JWT + instances
GET  /api/auth/me             - Get current user + instances
```
### Instance Management (superadmin)
```
GET    /api/admin/instances                          - List all instances
POST   /api/admin/instances                          - Create instance (auto-seeds bot config)
PUT    /api/admin/instances/{id}                     - Update instance
DELETE /api/admin/instances/{id}                     - Delete + cascade
POST   /api/admin/instances/{id}/assign-user         - Assign user by email
DELETE /api/admin/instances/{id}/unassign-user/{uid} - Remove user
GET    /api/admin/users                              - List all users
```
### Protected (requires Bearer token + X-Instance-ID header)
```
POST /api/chat/send               - Send message (public, no auth)
GET  /api/chat/history/{id}       - Chat history (public)
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
PUT  /api/discord/config          - Update Discord config
POST /api/discord/restart         - Start/restart Discord bot
GET  /api/discord/status          - Bot online status
```

## DB Schema (Multi-tenant)
- `users`: {id, email, hashed_password, is_verified, verification_code, verification_code_expiry, role, created_at}
- `bot_instances`: {id, name, description, created_by, assigned_user_ids[], created_at}
- `bot_config`: {instance_id, name, persona, custom_instructions, tone_instructions, manual_tone_examples[]}
- `knowledge_sources`: {id, instance_id, type, title, content, url, is_active, created_at}
- `conversations`: {session_id, instance_id, platform, messages[], is_approved_for_training, created_at}
- `discord_config`: {instance_id, bot_token, is_active, updated_at}

## Prioritized Backlog

### P0 (Completed)
- [x] Multi-tenant auth with JWT
- [x] Instance management + user assignment
- [x] Data isolation by instance_id
- [x] Admin vs User dashboard separation
- [x] "Failed to load instances" production bug fix
- [x] Dashboard no-instance graceful state
- [x] AuthContext refreshInstances after create/delete

### P1 (High Value - Next)
- [ ] Split server.py into modules (auth.py, instances.py, knowledge.py, chat.py) — currently 1007 lines
- [ ] Real-time streaming responses (SSE/WebSockets)
- [ ] Conversation search/filter

### P2 (Future)
- [ ] Knowledge chunk editing
- [ ] Export conversations
- [ ] Vector database integration (Pinecone/Weaviate) for better RAG
- [ ] Webhook for new conversations
- [ ] Slack integration
- [ ] Rate limiting
- [ ] Conversation tagging/categorization
- [ ] LLM session persistence across server restarts

## Notes
- Admin seeded on startup: admin@bridgebot.tech / Admin@123
- Default instance auto-created on first run; migrates existing single-tenant data
- Email verification is MOCKED (print to stdout) until Resend API key provided
- Discord bot is per-instance; uses instance_id from discord_config document
- Public chat/widget use instance_id from URL query param: /chat?instance=<id>
