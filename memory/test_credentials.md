# BotForge Test Credentials

## Super Admin Account
- **Email**: admin@bridgebot.tech
- **Password**: Admin@123
- **Role**: superadmin
- **Status**: Pre-seeded on startup, email pre-verified

## Test Regular User
- **Email**: testuser@example.com
- **Password**: Test@123
- **Role**: user
- **Status**: Created and verified (0 instances assigned initially)

## Notes
- Admin has access to all instances
- Regular users see only their assigned instances
- Email verification is MOCKED via server logs (print statements)
- To get verification code: check backend logs at `/var/log/supervisor/backend.out.log`
- JWT tokens expire in 7 days
- After login with 1 instance → auto-selected, redirected to /admin
- After login with multiple instances → redirected to /select-instance
- After login with 0 instances → /admin shows "No workspace assigned" banner

## App URLs
- Login: /login
- Register: /register
- Verify: /verify?email=<email>
- Admin: /admin
- Instance Management (superadmin only): /admin/instances
- Chat (public): /chat?instance=<instance_id>
- Widget (public): /widget?instance=<instance_id>
