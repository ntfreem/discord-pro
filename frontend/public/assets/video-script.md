# How I Built an AI Support Bot for Discord
### Video Script — Developer Audience (~8-10 min)

---

## INTRO (0:00 - 0:45)

**[Screen: Discord server with bot responding to messages]**

"What if you could build a support bot that actually understands what users are asking — not just matching keywords, but genuinely understanding intent — and deploys to Discord with one click?

That's exactly what I built. It's called BridgeBot — a multi-tenant AI chatbot platform that lets you create knowledge-base-powered support agents and deploy them directly to Discord.

In this video, I'll walk you through how I built it, the architecture decisions I made, and how you can set up something similar."

---

## THE PROBLEM (0:45 - 1:30)

**[Screen: Show a busy Discord server with unanswered questions]**

"Here's the problem I was solving. I run a Discord community, and users kept asking the same questions over and over — 'How long does a transfer take?', 'Do you support Ledger wallets?', 'Where's the deposit address?'

I needed a bot that could:
- Answer questions from a knowledge base I control
- Understand different phrasings of the same question
- Know when to step aside when a human wants to take over
- And be configurable without touching code

So I built one."

---

## ARCHITECTURE OVERVIEW (1:30 - 3:00)

**[Screen: Architecture diagram — show this on screen]**

"Here's the stack:

**Frontend** — React with a custom design system. Dark theme, soft blue palette. This is the admin dashboard where you manage everything — knowledge base, bot settings, Discord config, users, analytics.

**Backend** — FastAPI in Python. Single API server handling auth, knowledge management, chat, Discord bot lifecycle, and analytics. All routes prefixed with `/api`.

**Database** — MongoDB Atlas. Stores users, bot instances, knowledge sources, conversations, Discord configs, and LLM usage metrics.

**AI** — Claude for natural language understanding. Here's the key insight — I don't do keyword search. I pass ALL active knowledge sources to the LLM on every query. For a knowledge base under 100 entries, this is fast and gives you semantic matching for free. The AI figures out which FAQ answers the user's question, regardless of how they phrase it.

**Discord** — discord.py running as an async task inside the FastAPI process. The bot reads its config from the database on every message, so config changes are instant — no restart needed."

---

## THE KNOWLEDGE BASE (3:00 - 4:30)

**[Screen: Knowledge Base page in BridgeBot admin]**

"The knowledge base is the brain of the bot. You can add three types of sources:

**FAQs** — question-answer pairs. These are your most powerful tool. Write the question as a user would ask it, and give a detailed answer.

**URLs** — paste any webpage URL and the bot scrapes and indexes the content. I even added optional HTTP Basic Auth for password-protected pages.

**Documents** — upload .txt or .pdf files.

Every source has a **priority level** — High, Medium, or Normal. High priority sources get preference when the AI is forming answers.

Here's the magic: when a user asks a question, I don't do text search. I load ALL active sources, sorted by priority, and pass them as context to Claude. The LLM does the semantic matching. So if your FAQ says 'Status: Submitting — what does it mean?' and the user asks 'How long does a transfer take?', the bot still finds the right answer.

This approach works great up to about 100 sources, staying under 30K characters of context."

**[Screen: Show the priority badges and inline editing]**

"Admins can edit any source inline — change the title, content, priority, or toggle it active/inactive. Everything takes effect immediately."

---

## DISCORD INTEGRATION (4:30 - 6:30)

**[Screen: Discord Settings page]**

"Setting up the Discord bot is a one-click flow. I built an OAuth2 integration — you click 'Invite Bot to Server', authorize it, and you're done. No manual token pasting.

All the Discord credentials — Client ID, Client Secret, Bot Token, Redirect URI — are configurable from the admin UI. Store them in the database, not in env files. This means you can update credentials without redeploying.

**Listen Modes:**
- Mention Only — bot only responds when @mentioned
- All Channels — responds to every message
- Specific Channels — pick which channels to monitor

The bot reads its config from MongoDB on every single message. So when you switch from 'Mention Only' to 'All Channels' in the UI, it takes effect instantly. No restart.

**[Screen: Show Human Takeover section]**

The feature I'm most proud of is **Human Takeover**. When a team member with a designated Discord role — say 'Support' — replies in a channel, the bot automatically goes silent in that specific channel. But here's the key — it's per-channel. The bot keeps responding in every other channel.

After a configurable cooldown — say 15 minutes of no staff activity — the bot re-engages with a message like 'Is there anything else I can help with?'

Staff can also type `!bot resume` to hand back control immediately.

The implementation is straightforward — I keep a dictionary in memory mapping channel IDs to the timestamp of the last staff message. On each incoming message, I check if the channel is in handoff mode and whether the cooldown has expired."

---

## MULTI-TENANCY & AUTH (6:30 - 7:30)

**[Screen: Instance selector, Users page]**

"BridgeBot is multi-tenant. Each 'workspace' or instance is completely isolated — its own knowledge base, bot personality, Discord connection, conversations, and analytics.

Auth supports both email and username login with JWT tokens. Admins can create instances, assign users, and delete accounts. Password reset is a single-page flow with a 6-digit code.

I used bcrypt for password hashing and 7-day JWT expiry. The admin account is seeded on startup and protected from deletion."

---

## DEPLOYMENT & DATABASE (7:30 - 8:30)

**[Screen: MongoDB Atlas dashboard, production URL]**

"For production, I'm using MongoDB Atlas free tier — 512MB, more than enough. The entire dataset is under 1MB.

One decision I'd highlight: I store Discord app credentials in the database, not just env files. This means after deploying, I can update the bot token or redirect URI from the UI without redeploying. Env vars are the fallback.

The frontend is a React SPA, backend is FastAPI. Both sit behind a single domain with `/api` prefix routing to the backend.

There's also a full documentation hub at `/docs` — public, no login required — covering every feature for end users."

---

## KEY TAKEAWAYS (8:30 - 9:30)

**[Screen: Code snippets or bullet points]**

"A few things I learned building this:

**1. Let the LLM do the searching.** For small-to-medium knowledge bases, skip vector databases and embeddings. Just pass everything to the model. It's simpler, more accurate, and handles intent matching that keyword search misses.

**2. Read config from the database, not startup variables.** The Discord bot reads its config on every message. This makes the admin UI feel instant — no 'restart to apply changes'.

**3. Per-channel state, not global state.** The human takeover tracks state per channel, so one staff conversation doesn't silence the bot everywhere.

**4. Store credentials in the database.** Env files are for fallbacks. Let admins update API keys from the UI so you don't need to redeploy for credential rotation.

**5. Build the admin experience first.** A great bot is only as good as how easy it is to manage. Priority levels, inline editing, one-click Discord invite — these small UX details make the platform actually usable."

---

## OUTRO (9:30 - 10:00)

**[Screen: BridgeBot login page with the robot graphic]**

"That's BridgeBot — a full AI support platform for Discord, built with React, FastAPI, MongoDB, and Claude.

If you're building something similar, the key insight is: keep it simple. You don't need RAG pipelines and vector databases for a support bot with 50-100 knowledge entries. Just pass the context and let the LLM do what it's good at.

Thanks for watching. If you have questions, drop them in the comments."

---

## SUGGESTED B-ROLL / SCREEN RECORDINGS

1. **Discord bot answering questions** — show it matching different phrasings
2. **Knowledge Base page** — adding an FAQ, changing priority, editing inline
3. **Discord Settings** — clicking "Invite Bot", configuring listen mode
4. **Human Takeover demo** — staff replies, bot goes silent, bot re-engages after cooldown
5. **Users page** — showing user management, delete flow
6. **Docs page** — quick scroll through documentation
7. **Architecture diagram** — React → FastAPI → MongoDB → Claude → Discord

---

## THUMBNAIL IDEAS

- Split screen: Discord chat on left, BridgeBot admin on right
- Text: "I Built an AI Support Bot for Discord"
- Robot graphic from the login page as visual anchor
