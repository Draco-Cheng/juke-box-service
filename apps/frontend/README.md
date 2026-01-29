# Frontend — DJ Request

React + Vite PWA for both customer and DJ interfaces.

## Apps

| App | Path | Description |
|-----|------|-------------|
| Customer | `/join/:venueSlug` | Scan QR, search songs, pay to request |
| DJ Dashboard | `/dj/*` | Manage requests, control session |

## Development

```bash
# From monorepo root
nx serve frontend
```

App available at http://localhost:3000

## Tech

- **Framework**: React + Vite
- **Styling**: TailwindCSS
- **PWA**: vite-plugin-pwa
- **Payments**: Stripe Elements + Payment Request API
- **Real-time**: Supabase Realtime subscriptions

## Key Features

- **Customer**: QR join, Spotify search, Apple Pay / Google Pay
- **DJ**: Real-time queue, accept/reject, pause requests, earnings view
