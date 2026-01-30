# AI_README: Frontend

## Stack

Vite + React 18 + TypeScript + TailwindCSS + PWA

## Key Paths

- `/` — Home page
- `/join/:venueSlug` — Customer entry point (QR scan lands here)
- `/dj/*` — DJ dashboard (auth required)

## Structure

- `src/pages/` — Route components
- `src/components/` — Reusable UI (to be added)
- `src/hooks/` — Custom hooks (to be added)
- `src/lib/` — API clients, utilities (to be added)

## Conventions

- Mobile-first, dark mode for DJ dashboard
- Use Supabase realtime for live updates
- Stripe Payment Request API for one-tap payments
