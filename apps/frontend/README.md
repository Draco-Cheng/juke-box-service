# Frontend — DJ Request

Vite + React PWA for both customer and DJ interfaces.

## Routes

| Path | Description |
|------|-------------|
| `/` | Home page |
| `/join/:venueSlug` | Customer entry (QR scan lands here) |
| `/dj/*` | DJ dashboard |

## Development

```bash
# From monorepo root
nx serve frontend

# Or from this directory
npm run dev
```

App available at http://localhost:3000

## Tech

- **Framework**: Vite + React 18
- **Styling**: TailwindCSS
- **PWA**: vite-plugin-pwa
- **Routing**: react-router-dom
- **Payments**: Stripe Elements
- **Real-time**: Supabase Realtime
