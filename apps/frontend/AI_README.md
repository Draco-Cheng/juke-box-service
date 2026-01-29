# AI_README: Frontend

## Stack

React + Vite + TypeScript + TailwindCSS + PWA

## Key Paths

- `/join/:venueSlug` — Customer entry point (QR scan lands here)
- `/dj/` — DJ dashboard (auth required)

## Structure

- `src/pages/` — Route components
- `src/components/` — Reusable UI
- `src/hooks/` — Custom hooks (Supabase, Stripe, Spotify)
- `src/lib/` — API clients, utilities

## Conventions

- Mobile-first, dark mode for DJ dashboard
- Use Supabase realtime for live updates
- Stripe Payment Request API for one-tap payments
