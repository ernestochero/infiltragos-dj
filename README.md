# DJ Song Requests

Simple demo implementation of a real-time song request queue built with Next.js 14 and TypeScript.

## Features
- Public request form
- Queue page with live refresh
- Admin drag & drop view
- API routes for requests, votes and admin actions
- Prisma schema & seed

## Development
```
npm install
npm run prisma:migrate
npm run dev
```

### Database
The project uses PostgreSQL via the existing `docker-compose.yml`.

```
npm run db:up       # start postgres (hostname: localhost, port: 5432)
npm run db:wait     # wait until it is ready
npm run prisma:migrate
npm run db:seed
```

To reset the database from scratch (drops all data and reapplies migrations):

```
npx prisma migrate reset --force
```

## Testing
```
npm test
```

## Environment
Copy `.env.example` to `.env` and fill in values for database and realtime providers.

Set `ADMIN_USER`, `ADMIN_PASSWORD`, `DJ_ADMIN_USER` and `DJ_ADMIN_PASSWORD` to control access.
Log in at `/login` with those credentials. DJs go to `/dj/admin` while admins land on `/admin`. Use the "Logout" button to clear the session.

### WhatsApp & Wallet templates

Configure these variables to enable the wallet activation template flow:

```
WHATSAPP_ENABLED=true
WHATSAPP_API_BASE_URL=https://graph.facebook.com/v19.0
WHATSAPP_PHONE_NUMBER_ID=YOUR_PHONE_ID
WHATSAPP_ACCESS_TOKEN=YOUR_TOKEN
WALLET_WHATSAPP_TEMPLATE_ACTIVATION=wallet_activation_double_cta
WALLET_WHATSAPP_TEMPLATE_LANG=es
WALLET_TEMPLATE_BASE_URL=https://tu-dominio.com
WALLET_PORTAL_URL=https://tu-dominio.com/wallet/portal
WALLET_PASS_LANDING_URL=https://tu-dominio.com/wallet/add
WALLET_WHATSAPP_TEMPLATE_OTP=wallet_otp_login
WALLET_WHATSAPP_TEMPLATE_OTP_LANG=es
WALLET_OTP_TTL_SECONDS=300
WALLET_OTP_COOLDOWN_SECONDS=60
NEXT_PUBLIC_WALLET_OTP_LENGTH=6
NEXT_PUBLIC_WALLET_APPLE_PASS_URL=https://tu-dominio.com/wallet/apple-pass.pkpass
NEXT_PUBLIC_WALLET_GOOGLE_PASS_URL=https://tu-dominio.com/wallet/save-google
NEXT_PUBLIC_WALLET_PORTAL_URL=https://tu-dominio.com/wallet/portal
WALLET_WHATSAPP_DISABLED=false
```

### Manual tests
- Dragging a card between columns persists the new status.
- Reordering cards within a column persists the new `sortIndex`.

## Deployment
Deploy on Vercel and connect to a PostgreSQL database (e.g. Supabase).

## Module structure

The codebase is organized in a light multi-module layout.

- Shared utilities live under `src/core` and can be imported with the `@core` alias.
- The DJ feature set lives under `src/modules/dj` and is available via the `@dj` alias.
- The DJ routes are mounted under `/dj`; legacy URLs like `/` and `/queue` redirect to the new paths.

### Adding new modules

Create a folder under `src/modules/<name>` and mount any pages or API handlers under `src/app/<name>` using the desired route. Examples: `src/modules/whatsapp`, `src/modules/google`.

### DJ services

The DJ module exposes its API handlers in `src/app/api` and UI components under `src/modules/dj/components`.

## Contests (Public Voting)

This repository includes a starting point for public voting contests (band battles / rounds):

- Models: `Contest`, `Contestant`, `Poll`, `PollContestant`, `PollVote` in `prisma/schema.prisma`.
- Public API:
  - `GET /api/polls/:id` → poll details, tallies, status and time remaining.
  - `POST /api/polls/:id/vote` → body `{ contestantId }` registers a vote if active.
- Admin API:
  - `POST /api/admin/contests` (header `x-admin-token: $DJ_ADMIN_TOKEN`) to create a contest and optional first poll.
- Public page: `src/modules/contest/app/public/contests/[contestId]/polls/[id]/page.tsx` with live updates via SWR.
 - Admin pages: `/contest` (index), `/contest/new`, `/contest/[id]` to manage contestants, create polls, set `nextPollId/nextSlot`, and close/promote.

Anti-abuse
- Basic per-IP+UA and optional fingerprint cookie (`vfp`) deduplication.
- In-memory rate limit (5 req/min per poll). Add Captcha if abuse is detected.
