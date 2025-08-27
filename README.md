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

Set `DJ_ADMIN_USER` and `DJ_ADMIN_PASSWORD` to control access to the `/admin` area.
Log in at `/login` with those credentials to receive the admin cookie and be redirected to `/admin`. Use the "Logout" button in `/admin` to clear the session.

### Manual tests
- Dragging a card between columns persists the new status.
- Reordering cards within a column persists the new `sortIndex`.

## Deployment
Deploy on Vercel and connect to a PostgreSQL database (e.g. Supabase).

## Module structure

The codebase is organized in a light multi-module layout.

- Shared utilities live under `src/core` and can be imported with the `@core` alias.
- The DJ feature set lives under `src/modules/dj` and is available via the `@dj` alias.
- Public routes and APIs re-export the module implementations so existing URLs like `/login`, `/admin` and `/api/requests` remain unchanged.

### Adding new modules

Create a folder under `src/modules/<name>` and mount any pages or API handlers by re-exporting them from `src/app` just like the DJ module does. Examples: `src/modules/whatsapp`, `src/modules/google`.

### DJ services

The DJ module exposes its API handlers in `src/modules/dj/app/api` and UI components under `src/modules/dj/components`.
