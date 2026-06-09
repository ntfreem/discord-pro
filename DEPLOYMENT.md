# BridgeBot Deployment Guide

BridgeBot (also called BotForge in the admin UI) is a multi-tenant SaaS platform for building, deploying, and managing AI-powered Discord bots. This guide covers all aspects of deploying and running the platform in production.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [APP_MODE Deployment Model](#app_mode-deployment-model)
3. [Frontend Deployment](#frontend-deployment)
4. [Backend API Deployment](#backend-api-deployment)
5. [Discord Worker Deployment](#discord-worker-deployment)
6. [MongoDB Atlas Setup](#mongodb-atlas-setup)
7. [ParadeDB / PostgreSQL Setup](#paradedb--postgresql-setup)
8. [Environment Variables](#environment-variables)
9. [First-Time Setup](#first-time-setup)
10. [ParadeDB Sync](#paradedb-sync)
11. [Health Checks](#health-checks)
12. [External API Setup](#external-api-setup)
13. [Hardware Recommendations](#hardware-recommendations)
14. [Security Checklist](#security-checklist)
15. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

BridgeBot is a three-tier application:

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend (React 19 + Craco)                                 │
│ Static build served via nginx / CDN                         │
└─────────────────┬───────────────────────────────────────────┘
                  │ HTTP/HTTPS
┌─────────────────┴───────────────────────────────────────────┐
│ Backend (Python FastAPI + uvicorn)                          │
│ • Auth (JWT + OAuth)                                        │
│ • Knowledge base search                                      │
│ • LLM integration (Claude)                                   │
│ • Admin API                                                  │
│ • Health / Discord OAuth routes                             │
└─────────────────┬───────────────────────────────────────────┘
                  │
        ┌─────────┼─────────┐
        │         │         │
        ▼         ▼         ▼
   MongoDB    Discord.py  ParadeDB
   Atlas      (Discord    (PostgreSQL
   (User data, OAuth)     optional)
    instances,
    knowledge)
```

**Key components:**

- **Frontend**: React 19, compiled static assets served by web server. Communicates with backend via `/api` routes.
- **Backend**: Single-file FastAPI monolith (`server.py`), handles auth, knowledge management, chat routing, and admin APIs. Runs with uvicorn.
- **Database**: MongoDB Atlas for core data (users, instances, conversations, knowledge sources, analytics). Async via Motor library.
- **Search (optional)**: ParadeDB (PostgreSQL + pg_search) for full-text search of knowledge sources; falls back to MongoDB text search if disabled.
- **LLM**: Anthropic Claude API for chat completions.
- **Email**: Resend API for transactional email (falls back to console logging).
- **Discord**: Discord.py v2 for bot client and OAuth. Single bot instance per deployment.

---

## APP_MODE Deployment Model

BridgeBot supports three deployment modes controlled by the `APP_MODE` environment variable:

### `all` (Default)

Runs FastAPI and Discord bot in the same process. Suitable for local development and small single-instance deployments.

```bash
export APP_MODE=all
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

- ✅ Simple single process
- ✅ Shared in-memory session cache between API and bot
- ❌ Cannot be scaled horizontally (only one bot client)
- ❌ Bot restarts interrupt API requests

### `api`

FastAPI only. Discord bot disabled. Safe to run as many replicas as needed behind a load balancer.

```bash
export APP_MODE=api
uvicorn server:app --host 0.0.0.0 --port 8000
```

- ✅ Horizontally scalable
- ✅ No Discord client overhead
- ✅ Independent from Discord worker process
- ❌ Requires separate `worker` mode deployment for Discord

### `worker`

Runs the Discord bot. FastAPI still starts and continues to serve all HTTP routes, including the health check, Discord OAuth callback (`/api/discord/callback`), and admin endpoints. This is intentional — the worker is not a dedicated background-only process. Operators sometimes expect no HTTP port; that is not the case. Use a distinct port or firewall rule if you want to restrict external access to the worker.

```bash
export APP_MODE=worker
uvicorn server:app --host 0.0.0.0 --port 8000
```

- ✅ Single responsibility: run exactly one bot client per Discord app
- ✅ Graceful isolation from API scaling
- ❌ Requires coordination with one or more `api` replicas
- ❌ Adds operational complexity

### Recommended Topologies

**Single server (dev / small production):**
```
1x APP_MODE=all (or separate api + worker on same machine)
```

**Scaled production:**
```
N x APP_MODE=api (behind load balancer, e.g. 2–4 replicas)
1x APP_MODE=worker (single Discord bot client, separate container/VM)
```

---

## Frontend Deployment

### Building

The frontend is React 19 + Craco (create-react-app override). Build produces static assets:

```bash
cd frontend
yarn install
yarn build
```

Outputs to `frontend/build/` — a static directory ready for any web server.

### Serving

Use nginx, Caddy, CloudFlare Pages, AWS S3 + CloudFront, Vercel, or any static host.

**nginx example:**
```nginx
server {
  listen 80;
  server_name yourdomain.com;

  root /var/www/bridgebot/build;

  # React Router: fallback to index.html for all non-file routes
  location / {
    try_files $uri $uri/ /index.html;
  }

  # API proxy to backend
  location /api/ {
    proxy_pass http://localhost:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # HTTPS redirect
  error_page 497 https://$server_name$request_uri;
}
```

**Development:** `yarn start` runs the dev server on port 3000 with a proxy to `http://localhost:8000` (see `package.json` for `proxy` setting). This is **not** suitable for production.

### Environment at Build Time

Craco reads `REACT_APP_*` env vars at build time. No dynamic runtime configuration — all settings must be burned into the build.

---

## Backend API Deployment

### Installation

```bash
cd backend
pip install -r requirements.txt
```

### Running

```bash
export APP_MODE=api  # or "all" or "worker"
export MONGO_URL="mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority"
export DB_NAME="bridgebot_prod"
export JWT_SECRET="your-32-byte-random-key-here"
export ADMIN_EMAIL="admin@example.com"
export ADMIN_PASSWORD="secure-password"
export ANTHROPIC_API_KEY="sk-ant-..."

uvicorn server:app --host 0.0.0.0 --port 8000 --workers 4
```

### Recommended Uvicorn Settings

For production, use `--workers` to enable multiple worker processes:

```bash
uvicorn server:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers 4 \
  --access-log \
  --log-level info
```

Adjust `--workers` to 2–4× number of CPU cores. Monitor memory; each worker is a separate Python process.

### Process Management

Use systemd, supervisor, Docker, or your platform's process manager.

**systemd service example:**
```ini
[Unit]
Description=BridgeBot FastAPI Backend
After=network.target

[Service]
Type=notify
User=bridgebot
WorkingDirectory=/opt/bridgebot/backend
Environment="APP_MODE=api"
Environment="MONGO_URL=mongodb+srv://..."
Environment="DB_NAME=bridgebot_prod"
Environment="JWT_SECRET=..."
Environment="ADMIN_EMAIL=..."
Environment="ADMIN_PASSWORD=..."
Environment="ANTHROPIC_API_KEY=..."
ExecStart=/usr/bin/python -m uvicorn server:app --host 0.0.0.0 --port 8000 --workers 4
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then:
```bash
systemctl enable bridgebot-api
systemctl start bridgebot-api
systemctl status bridgebot-api
```

### Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY backend/requirements.txt .
RUN pip install -r requirements.txt

COPY backend/server.py .

ENV APP_MODE=api
EXPOSE 8000

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

Build and run:
```bash
docker build -t bridgebot-api -f Dockerfile .
docker run -e MONGO_URL="..." -e JWT_SECRET="..." -p 8000:8000 bridgebot-api
```

---

## Discord Worker Deployment

The Discord worker runs the bot client using discord.py. It must be a **single instance** per Discord application.

### Installation

Same as backend:
```bash
cd backend
pip install -r requirements.txt
```

### Running

```bash
export APP_MODE=worker
export MONGO_URL="mongodb+srv://..."
export DB_NAME="bridgebot_prod"
export JWT_SECRET="..."
export ADMIN_EMAIL="admin@example.com"
export ADMIN_PASSWORD="secure-password"
export DISCORD_CLIENT_ID="..."
export DISCORD_CLIENT_SECRET="..."
export DISCORD_BOT_TOKEN="..."
export DISCORD_REDIRECT_URI="https://yourdomain.com/api/auth/discord/callback"

uvicorn server:app --host 0.0.0.0 --port 8001
```

**Note:** Run the worker on a different port (e.g., 8001) to avoid conflict with API replicas. Health checks and OAuth callbacks still work; all chat routing goes through the API replicas.

### Process Management

Use the same systemd / supervisor / Docker patterns as the API, but with `APP_MODE=worker` and a distinct port.

### Single Instance Requirement

Only one Discord worker should ever run. If two instances start with the same `DISCORD_BOT_TOKEN`, one will be forcefully disconnected and both will malfunction. Use your orchestrator's constraints (e.g., Kubernetes `replicas: 1`) to enforce this.

---

## MongoDB Atlas Setup

### Creating a Cluster

1. Sign up for [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new project
3. Create a cluster:
   - **Tier**: M0 (free) for dev/test, M10+ for production
   - **Region**: Choose closest to your backend
   - **Auth**: Create a database user with strong password
4. Whitelist IP addresses (or allow all, not recommended)
5. Copy the connection string (replace `<user>`, `<password>`, database name)

### Connection String Format

```
mongodb+srv://user:password@cluster-name.mongodb.net/dbname?retryWrites=true&w=majority
```

Set as `MONGO_URL` environment variable.

### Initial Database Setup

On first run with valid `MONGO_URL`, the backend auto-creates collections:
- `users` — authenticated user accounts
- `bot_instances` — tenant bot configurations
- `conversations` — chat histories per instance
- `knowledge_sources` — documents, PDFs, web pages to index
- `analytics_events` — user interactions and bot metrics

**No manual migrations needed** — the backend handles schema initialization.

### Backup Strategy

- **Atlas automatic backups**: Enabled by default. Set retention to 30–90 days.
- **Manual exports**: Use `mongodump` or Atlas's export feature before major changes.
- **Point-in-time recovery**: Available on M10+ clusters.

### Monitoring

Use Atlas Charts or your monitoring tool to track:
- Connection count
- CPU and memory usage
- Read/write latency
- Database size growth

---

## ParadeDB / PostgreSQL Setup

ParadeDB is optional. It provides full-text BM25 search for knowledge sources, improving search quality over MongoDB text search. If not enabled, the system falls back to MongoDB text search.

### When to Use ParadeDB

- ✅ Knowledge bases > 10,000 documents
- ✅ Relevance ranking critical
- ✅ Natural language queries (synonyms, typos)
- ❌ Skip if MongoDB search is sufficient or deployment is very small

### Installation

ParadeDB is a PostgreSQL extension. Two options:

**Option 1: Managed (ParadeDB Cloud)**
1. Sign up for [ParadeDB Cloud](https://docs.paradedb.com)
2. Create a database, note the connection string
3. Set `PARADEDB_URL` and `PARADEDB_ENABLED=true`

**Option 2: Self-hosted Docker**
```bash
docker run -d \
  --name paradedb \
  -e POSTGRES_PASSWORD=securepass \
  -p 5433:5432 \
  paradedb/paradedb:latest
```

Connection string: `postgresql://postgres:securepass@localhost:5433/postgres`

### Configuration

```bash
export PARADEDB_ENABLED=true
export PARADEDB_URL="postgresql://user:pass@host:5433/dbname"
```

On next startup, the backend will:
1. Connect to ParadeDB
2. Check for existing tables and indexes
3. Create `bm25_index` if not present

### Schema

ParadeDB auto-creates:
- `knowledge_sources` table — mirrors MongoDB documents
- `bm25_index` — full-text search index using pg_search

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGO_URL` | Yes | — | MongoDB Atlas connection string (e.g., `mongodb+srv://user:pass@cluster.mongodb.net/dbname`) |
| `DB_NAME` | Yes | — | Database name within MongoDB cluster |
| `JWT_SECRET` | Yes | — | Signing key for JWT tokens. **Must be ≥32 random bytes for production.** Generate with `openssl rand -hex 32` |
| `ADMIN_EMAIL` | Yes | — | Email of initial superadmin account. Seeded on first run. |
| `ADMIN_PASSWORD` | Yes | — | Password for initial superadmin. Seeded on first run. |
| `ANTHROPIC_API_KEY` | No | — | API key for Claude LLM. Required for chat responses. Falls back to `CLAUDE_API_KEY` if not set. Get from [console.anthropic.com](https://console.anthropic.com) |
| `RESEND_API_KEY` | No | — | API key for Resend email service. If not set, emails are logged to console. Get from [resend.com](https://resend.com) |
| `DISCORD_CLIENT_ID` | No | — | OAuth client ID from Discord Developer Portal |
| `DISCORD_CLIENT_SECRET` | No | — | OAuth client secret from Discord Developer Portal |
| `DISCORD_BOT_TOKEN` | No | — | Bot token from Discord Developer Portal. Required only if `APP_MODE` includes Discord bot. |
| `DISCORD_REDIRECT_URI` | No | — | OAuth callback URL, e.g., `https://yourdomain.com/api/auth/discord/callback` |
| `APP_MODE` | No | `all` | Deployment mode: `all` (FastAPI + bot), `api` (FastAPI only), `worker` (bot only) |
| `PARADEDB_ENABLED` | No | `false` | Set to `true`, `1`, or `yes` to enable ParadeDB search |
| `PARADEDB_URL` | No | — | PostgreSQL connection string for ParadeDB, e.g., `postgresql://user:pass@host:5433/dbname` |

### Generating a Secure JWT_SECRET

```bash
openssl rand -hex 32
```

Output: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

Treat this as a secret — store in AWS Secrets Manager, HashiCorp Vault, or your platform's secret store. Never commit to version control.

---

## First-Time Setup

### 1. Reserve Accounts and Keys

Before deployment, gather:
- MongoDB Atlas cluster URI and credentials
- Anthropic API key (optional for testing, required for production)
- Resend API key (optional; email logs to console if absent)
- Discord application ID, bot token, and redirect URI (optional; only if using Discord)

### 2. Set Environment Variables

Create a `.env` file (local dev) or configure in your deployment platform:

```bash
# Required
export MONGO_URL="mongodb+srv://user:pass@cluster-name.mongodb.net/bridgebot?retryWrites=true&w=majority"
export DB_NAME="bridgebot"
export JWT_SECRET="$(openssl rand -hex 32)"
export ADMIN_EMAIL="admin@example.com"
export ADMIN_PASSWORD="ChangeMe123!"

# Recommended
export ANTHROPIC_API_KEY="sk-ant-..."
export RESEND_API_KEY="re_..."

# Optional (Discord)
export DISCORD_CLIENT_ID="..."
export DISCORD_CLIENT_SECRET="..."
export DISCORD_BOT_TOKEN="..."
export DISCORD_REDIRECT_URI="https://yourdomain.com/api/auth/discord/callback"

# Optional (ParadeDB)
export PARADEDB_ENABLED="true"
export PARADEDB_URL="postgresql://postgres:pass@localhost:5433/postgres"
```

### 3. Start Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8000
```

Watch logs for:
- `Uvicorn running on http://0.0.0.0:8000`
- `Connected to MongoDB`
- `Discord bot started` (if `APP_MODE` includes bot)

### 4. Verify Health Endpoint

```bash
curl http://localhost:8000/api/
```

Expected response:
```json
{
  "message": "BridgeBot API",
  "version": "2.0.0"
}
```

### 5. Build Frontend

```bash
cd frontend
yarn install
yarn build
```

Outputs to `frontend/build/`.

### 6. Deploy Frontend

Copy `frontend/build/` to your static host or web server. Configure the reverse proxy to:
- Serve `frontend/build/` for all non-API routes
- Proxy `/api/*` to the backend (e.g., `http://localhost:8000`)

### 7. Test Login

Navigate to your frontend URL. Log in with:
- Email: `admin@example.com` (or your `ADMIN_EMAIL`)
- Password: `ChangeMe123!` (or your `ADMIN_PASSWORD`)

Change the password in the admin panel immediately.

---

## ParadeDB Sync

Once ParadeDB is enabled and configured, bulk-sync existing MongoDB knowledge sources:

```bash
curl -X POST http://localhost:8000/api/admin/paradedb/sync \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

The `<JWT_TOKEN>` is an admin JWT (obtained by logging in as superadmin).

**Response:**
```json
{
  "synced": 1234,
  "failed": 2,
  "errors": ["source_123: invalid format"]
}
```

This endpoint is safe to call repeatedly — it upserts sources, so reruns are idempotent.

### Monitoring Sync Status

Check ParadeDB readiness:

```bash
curl http://localhost:8000/api/admin/paradedb/status
```

**Response:**
```json
{
  "enabled": true,
  "connected": true,
  "bm25_index_ready": true,
  "search_active": true,
  "indexed_rows": 1234
}
```

- `enabled`: ParadeDB enabled in config
- `connected`: PostgreSQL connection successful
- `bm25_index_ready`: BM25 index created and ready
- `search_active`: Searches routing to ParadeDB (not MongoDB fallback)
- `indexed_rows`: Count of documents in index

---

## Health Checks

### API Health Endpoint

```bash
GET /api/
```

Returns immediately with no database calls. Safe for load balancer health checks.

**Response:**
```json
{
  "message": "BridgeBot API",
  "version": "2.0.0"
}
```

### Liveness / Readiness (For Kubernetes)

For Kubernetes deployments, define:

**Liveness Probe:**
```yaml
livenessProbe:
  httpGet:
    path: /api/
    port: 8000
  initialDelaySeconds: 30
  periodSeconds: 10
```

**Readiness Probe (checks database):**
```yaml
readinessProbe:
  httpGet:
    path: /api/auth/me
    port: 8000
    httpHeaders:
    - name: Authorization
      value: Bearer <admin-jwt>
  initialDelaySeconds: 10
  periodSeconds: 5
```

---

## External API Setup

BridgeBot exposes a public API for third-party chat integration.

### Creating an API Key

Only superadmins can create API keys. Each key is scoped to one instance. The raw key is returned once — store it immediately.

```bash
curl -X POST http://localhost:8000/api/admin/api-keys \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production API",
    "instance_id": "9961dc45-776f-40ad-a59e-e0c2d16c95e3"
  }'
```

**Response:**
```json
{
  "id": "dd232d77-54a3-4f95-9eb3-6dbb62a39af6",
  "key": "bbk_AbC1234567890AbC1234567890AbC1234567890AB",
  "name": "Production API",
  "instance_id": "9961dc45-776f-40ad-a59e-e0c2d16c95e3",
  "created_at": "2026-06-09T09:33:58Z"
}
```

The key is hashed with SHA-256 before storage. The plaintext is never returned again. The `instance_id` is embedded in the key record; callers do not send it in the request body.

### Chatting via External API

```bash
curl -X POST https://yourdomain.com/api/v1/chat \
  -H "X-API-Key: bbk_AbC1234567890AbC1234567890AbC1234567890AB" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is BridgeBot?",
    "session_id": "user-session-123"
  }'
```

`session_id` is optional. Omit it to start a new session; supply the same value across requests to continue a conversation. The target instance is determined by the API key — it is not sent in the request body.

**Response:**
```json
{
  "reply": "BridgeBot is a multi-tenant SaaS platform...",
  "instance_id": "9961dc45-776f-40ad-a59e-e0c2d16c95e3",
  "session_id": "user-session-123"
}
```

---

## Hardware Recommendations

Size your infrastructure based on expected scale:

### Small Deployment (Single bot, low traffic)

- **API/Worker**: 1 vCPU, 2 GB RAM (single `APP_MODE=all` process)
- **Database**: MongoDB Atlas M0 (free tier) or M2/M5
- **ParadeDB**: Optional; not recommended at this scale
- **Est. monthly cost**: ~$10–30 (mostly MongoDB)

2 GB RAM is the practical minimum once knowledge sources are loaded and Claude requests are in flight. 512 MB will OOM under moderate load.

**Deployment:**
```
1x FastAPI + Discord bot (APP_MODE=all)
MongoDB Atlas M0–M5
```

### Medium Deployment (2–5 bot instances, moderate traffic)

- **API replicas**: 2 vCPU, 2 GB RAM each (2 replicas, `APP_MODE=api`)
- **Discord worker**: 1 vCPU, 1 GB RAM (`APP_MODE=worker`)
- **Database**: MongoDB Atlas M10
- **ParadeDB**: 2 vCPU, 4 GB RAM if enabled
- **Est. monthly cost**: ~$100–200

**Deployment:**
```
2x FastAPI replicas (APP_MODE=api) behind load balancer
1x Discord worker (APP_MODE=worker)
MongoDB Atlas M10
ParadeDB (optional)
```

### Large Deployment (10+ instances, high volume)

- **API replicas**: 4 vCPU, 4 GB RAM each (4–8 replicas, `APP_MODE=api`)
- **Discord worker**: 2 vCPU, 2 GB RAM (`APP_MODE=worker`)
- **Database**: MongoDB Atlas M30+
- **ParadeDB**: Dedicated instance, 4 vCPU, 8 GB RAM
- **Est. monthly cost**: ~$500+

**Deployment:**
```
4–8x FastAPI replicas (APP_MODE=api) behind load balancer + CDN
1x Discord worker (APP_MODE=worker)
MongoDB Atlas M30+
Dedicated ParadeDB instance
```

### Load Balancing

For multi-replica API deployments, use:
- **AWS**: Application Load Balancer (ALB) or Network Load Balancer (NLB)
- **GCP**: Google Cloud Load Balancer
- **Azure**: Azure Load Balancer
- **Self-hosted**: nginx, HAProxy, or Traefik

Configure health checks to `/api/` (lightweight) or `/api/auth/me` with bearer token (heavier).

---

## Security Checklist

- [ ] **JWT Secret**: Generated with `openssl rand -hex 32`, stored in secrets manager (not version control)
- [ ] **HTTPS/TLS**: All external endpoints use HTTPS; internal connections may be HTTP in private network
- [ ] **CORS**: Verify frontend origin is whitelisted (should be default-restrictive)
- [ ] **Database Access**: MongoDB Atlas IP whitelist configured; only backend IPs allowed
- [ ] **API Keys**: Stored hashed in MongoDB; regenerate if compromised
- [ ] **Discord Token**: Rotated if deployment was compromised; stored in secrets manager
- [ ] **Email API Key (Resend)**: Used for verification emails only; rotated periodically
- [ ] **Anthropic Key**: Scoped to chat completion only; never logged or exposed in responses
- [ ] **Rate Limiting**: Enabled for public endpoints (chat, auth)
- [ ] **Monitoring**: Logs aggregated and monitored for suspicious activity
- [ ] **Admin Password**: Changed from default on first login
- [ ] **OAuth Redirect URI**: Matches exactly in Discord Developer Portal
- [ ] **Secrets Rotation**: Plan for quarterly rotation of all API keys and secrets
- [ ] **Backup**: MongoDB backups retained for ≥30 days
- [ ] **DDoS Protection**: Use CloudFlare or similar for public endpoints

---

## Troubleshooting

### Backend Won't Start

**Symptom:** `Uvicorn running...` but immediate crash

**Checks:**
1. MongoDB connection:
   ```bash
   mongosh "$MONGO_URL"
   ```
   If fails, verify IP whitelist in Atlas, credentials, and cluster name.

2. Required env vars:
   ```bash
   echo $MONGO_URL $DB_NAME $JWT_SECRET $ADMIN_EMAIL $ADMIN_PASSWORD
   ```
   If empty, set all required variables.

3. Python version:
   ```bash
   python --version  # Should be 3.9+
   ```

4. Dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Port conflict:
   ```bash
   lsof -i :8000  # Check if port 8000 is in use
   ```

### Discord Bot Not Responding

**Symptom:** Bot doesn't respond to messages in Discord

**Checks:**
1. Discord token is valid:
   ```bash
   # Test token with discord.py
   python -c "import discord; print('Token format OK')"
   ```

2. Bot has correct intents:
   - In Discord Developer Portal: Settings → Bot → PRESENCE INTENT, MESSAGE CONTENT INTENT, GUILDS — all enabled

3. Only one worker instance running:
   ```bash
   ps aux | grep "APP_MODE=worker"  # Should show exactly one process
   ```

4. Check logs for `Gateway has closed with code` — means token is invalid or permissions issue.

### Slow Chat Responses

**Symptom:** Requests to `/api/chat` take >10 seconds

**Checks:**
1. Anthropic API latency:
   - Check [status.anthropic.com](https://status.anthropic.com)
   - Test with `curl -X POST https://api.anthropic.com/...` directly

2. MongoDB latency:
   - Check Atlas dashboard: Metrics → Network I/O and Disk I/O
   - Increase instance tier if consistent spike

3. Knowledge base search:
   - If using ParadeDB: verify `search_active` is true
   - If not: MongoDB text search can be slow on large collections (>50k docs)

4. Backend CPU:
   - Monitor CPU during request; if pegged at 100%, increase `--workers` or instance size

### ParadeDB Connection Failed

**Symptom:** `PARADEDB_ENABLED=true` but ParadeDB status shows `connected: false`

**Checks:**
1. Connection string is correct:
   ```bash
   psql "$PARADEDB_URL" -c "SELECT version();"
   ```

2. Port is accessible:
   ```bash
   telnet paradedb-host 5433
   ```

3. Credentials are valid (check username/password in connection string)

4. ParadeDB server is running:
   ```bash
   docker logs paradedb  # If running in Docker
   ```

### Memory Leaks

**Symptom:** Backend memory usage grows unbounded over days

**Checks:**
1. Monitor LLM session cache:
   ```python
   # In server.py: llm_sessions dict
   # Clear old sessions periodically
   ```

2. Limit uvicorn workers:
   - Each worker is a Python process. Reduce `--workers` if memory use is high.

3. Check for unclosed database connections:
   - Verify all MongoDB queries use `async with` or `.await()`

4. Enable garbage collection logging:
   ```bash
   export PYTHONUNBUFFERED=1
   python -m gc server.py
   ```

### 401 / Unauthorized on API

**Symptom:** All API requests return `{"detail":"Unauthorized"}`

**Checks:**
1. JWT token is valid:
   ```bash
   curl -H "Authorization: Bearer <TOKEN>" http://localhost:8000/api/auth/me
   ```
   If 401, token is expired or malformed.

2. JWT_SECRET matches between runs:
   - If secret changed, all tokens become invalid. Regenerate secrets only in emergency.

3. Instance ID header is present:
   ```bash
   curl -H "X-Instance-ID: inst_123" http://localhost:8000/api/...
   ```

4. Verify token not expired:
   - JWTs expire after 7 days; user must log in again

### Frontend Shows "API Error"

**Symptom:** Frontend UI displays generic error; no specific message

**Checks:**
1. Network tab in browser DevTools:
   - Check `/api/*` requests for 5xx errors

2. Backend logs:
   ```bash
   journalctl -u bridgebot-api -n 50  # Last 50 lines
   ```

3. CORS headers:
   ```bash
   curl -H "Origin: https://yourdomain.com" http://localhost:8000/api/
   ```

4. Frontend env var:
   - Verify `REACT_APP_BACKEND_URL` is set correctly at build time (not runtime)

---

## Additional Resources

- **Backend Architecture**: See `CLAUDE.md` for `/auth/*`, `/admin/*`, `/knowledge/*`, `/chat/*` route details
- **Frontend Setup**: See `CLAUDE.md` for component structure and design system
- **Testing**: Run `pytest tests/ -v` with `REACT_APP_BACKEND_URL` env var set
- **Discord Bot Development**: [discord.py docs](https://discordpy.readthedocs.io/)
- **MongoDB Atlas**: [Atlas docs](https://docs.atlas.mongodb.com/)
- **ParadeDB**: [ParadeDB docs](https://docs.paradedb.com/)

---

**Version:** 2.0.0  
**Last Updated:** 2026-05-29
