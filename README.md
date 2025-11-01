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

### Rankings cache & cron
- Configura las credenciales de Upstash (`KV_REST_API_URL`, `KV_REST_API_TOKEN` o el `KV_REST_API_READ_ONLY_TOKEN`, más `KV_URL` si necesitas conexión Redis tradicional), el secreto del cron (`CRON_SECRET`) y, para sincronizar Spotify, `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN` y `TOP_HISTORICAL_PLAYLIST_ID`.
- `GET /api/top/weekly` devuelve el top de la última semana (cacheado por 7 días). Se recalcula manualmente con `POST /api/admin/top/rebuild` y se agenda con el cron semanal (`0 6 * * 1`).
- `GET /api/top/historical` expone el top global histórico (cacheado por 24 h) y retorna el enlace a la playlist sincronizada. Se reconstruye con `POST /api/admin/top/rebuild/historical`, que también actualiza la playlist de Spotify si las variables están configuradas. Cron diario recomendado: `0 6 * * *`.

## Module structure

The codebase is organized in a light multi-module layout.

- Shared utilities live under `src/core` and can be imported with the `@core` alias.
- The DJ feature set lives under `src/modules/dj` and is available via the `@dj` alias.
- The DJ routes are mounted under `/dj`; legacy URLs like `/` and `/queue` redirect to the new paths.

### Adding new modules

Create a folder under `src/modules/<name>` and mount any pages or API handlers under `src/app/<name>` using the desired route. Examples: `src/modules/whatsapp`, `src/modules/google`.

### DJ services

The DJ module exposes its API handlers in `src/app/api` and UI components under `src/modules/dj/components`.

## Ticket Module

The ticketing workflow lives under `src/modules/ticket` and is mounted at `/tickets`.

- Admin views:
  - `/tickets` listado de eventos con métricas.
  - `/tickets/new` formulario de creación con upload a S3.
  - `/tickets/[id]` dashboard del evento (tipos de ticket, envíos manuales, historial).
  - `/tickets/scanner` lector con cámara + ingreso manual.
- API admin (`x-admin-token: DJ_ADMIN_TOKEN` o sesión ADMIN):
  - `GET/POST /api/admin/tickets/events`
  - `GET/PUT /api/admin/tickets/events/:eventId`
  - `GET/POST /api/admin/tickets/events/:eventId/ticket-types`
  - `PUT /api/admin/tickets/ticket-types/:ticketTypeId`
  - `POST /api/admin/tickets/issues` (emisión + correo)
  - `POST /api/admin/tickets/scan` (validación/registro)
  - `POST /api/admin/tickets/uploads/banner` (upload directo a S3)
- Público: `/tickets/verify/:code` muestra el estado del ticket incluido en el QR.

### Configuración

1. **S3**: define `TICKET_S3_BUCKET`, `TICKET_S3_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (opcional `TICKET_S3_PREFIX`) para subir banners.
2. **Correo SMTP** (opcional pero recomendado): `TICKET_EMAIL_FROM`, `TICKET_SMTP_HOST`, `TICKET_SMTP_PORT`, `TICKET_SMTP_USER`, `TICKET_SMTP_PASS` y `TICKET_EMAIL_REPLY_TO`. Si faltan datos, el envío se omite pero la emisión se registra.
3. Ajusta `NEXT_PUBLIC_APP_URL` para que los QR apunten a tu dominio (se usa en el payload).

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
