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

## Testing
```
npm test
```

## Environment
Copy `.env.example` to `.env` and fill in values for database and realtime providers.

Set `ADMIN_USER`, `ADMIN_PASSWORD`, `DJ_ADMIN_USER` and `DJ_ADMIN_PASSWORD` to control access.
Log in at `/login` with those credentials. DJs go to `/dj/admin` while admins land on `/admin`. Use the "Logout" button to clear the session.

### Manual tests
- Dragging a card between columns persists the new status.
- Reordering cards within a column persists the new `sortIndex`.

## Deployment
Deploy on Vercel and connect to a PostgreSQL database (e.g. Supabase).

### Weekly top cache & cron
- Configura las credenciales de Upstash (`UPSTASH_KV_REST_API_URL`, `UPSTASH_KV_REST_API_TOKEN` o al menos el `UPSTASH_KV_REST_API_READ_ONLY_TOKEN`, más `UPSTASH_KV_URL` para conexiones tradicionales) y un secreto para el cron (`CRON_SECRET`).
- The weekly ranking is exposed via `GET /api/top/weekly`, which serves cached results (7‑day TTL) and recomputes on cache misses.
- Trigger a rebuild with `POST /api/admin/top/rebuild` and header `Authorization: Bearer $CRON_SECRET`.
- On Vercel, add a Cron Job that hits the rebuild endpoint every Monday morning (e.g. `0 10 * * 1` UTC).

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
