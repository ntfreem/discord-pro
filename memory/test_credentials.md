# BridgeBot Test Credentials

## Admin Account (auto-seeded on backend startup)
- Email: admin@bridgebot.tech
- Username: administrator
- Password: Admin@123
- Role: superadmin

## Login
- Login accepts either email or username
- URL: /login

## Environments
- Preview: https://futurism-chat-ui.preview.emergentagent.com — DB: `bridgebot_preview` on user's Atlas cluster (`cluster0.djc6zyo`)
- Production: https://bridgebot.tech — DB: Emergent-managed (`customer-apps.fnhlq2`)
- Preview was WIPED on 2026-05-26 — starts fresh (no instances, no Discord App credentials)

## Discord App Setup (must configure after wipe)
- Navigate to /admin/discord-app-setup
- Paste Client ID / Client Secret / Redirect URI / Bot Token from Discord Developer Portal
- Preview Redirect URI: https://futurism-chat-ui.preview.emergentagent.com/api/discord/callback
- Production Redirect URI: https://bridgebot.tech/api/discord/callback
