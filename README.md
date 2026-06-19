# BridgeBot

AI-powered Discord support agents with knowledge retrieval, Anthropic integration, ParadeDB BM25 search, and external API access.

- LLM integration
- ParadeDB BM25 knowledge retrieval
- MongoDB fallback search
- Discord support automation
- External API access
- Multi-tenant architecture
- Analytics dashboard

## Features

- Knowledge base from URLs and FAQs
- Discord server support automation
- External chat API
- Conversation analytics
- APP_MODE deployment architecture

## Quick Start

See:
- API.md
- DEPLOYMENT.md

## Architecture

Discord → BridgeBot Worker → BridgeBot API
                              ├── LLM
                              ├── MongoDB
                              └── ParadeDB BM25

