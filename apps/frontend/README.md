# Frontend — DropBeat

Vite + React PWA for both customer and DJ interfaces.

## Routes

| Path | Description |
|------|-------------|
| `/` | DJ discovery page — browse live DJs, view past requests |
| `/join/:venueSlug` | Customer song request (QR scan lands here) |
| `/dj/*` | DJ dashboard (login, session management, request queue) |

## Features

- **DJ Discovery**: Homepage shows live DJs with genres, ratings, listener count, and pricing
- **Song Requests**: Spotify search, tiered pricing (normal/priority/ASAP), Stripe payment
- **Payment Authorization**: Funds held until DJ plays; released if rejected (no charge)
- **DJ Dashboard**: Session control, request queue management, profile editing (genres, image)
- **Real-time Updates**: Live request status via Supabase Realtime

## Design

- **Theme**: Dark (#0d0f14 background)
- **Fonts**: Inter (UI) + Space Mono (prices/code)
- **Navigation**: Bottom tab bar (DJs / Requests / DJ Mode)

## Development

```bash
# From monorepo root
nx serve frontend

# Or from this directory
npm run dev
```

App available at http://localhost:3000

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API base URL |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |

Runtime injection via `docker-entrypoint.sh` → `env-config.js` for Docker deployments.

## Tech

- **Framework**: Vite + React 18
- **Styling**: TailwindCSS
- **PWA**: vite-plugin-pwa
- **Routing**: react-router-dom
- **Payments**: Stripe Elements
- **Real-time**: Supabase Realtime
