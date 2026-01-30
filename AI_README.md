# AI_README

## What This Is

DJ Request — paid song request platform for bars/clubs. Customers pay to request songs, DJs accept/reject via dashboard.

## Tech Stack

- **Frontend**: Vite + React 18 (PWA), TypeScript, TailwindCSS
- **Backend**: Python FastAPI + Supabase
- **Payments**: Stripe
- **Song Search**: Spotify Web API (metadata only)

## Key Concepts

- `Session` — DJ starts a session at a venue, customers join via QR
- `Request` — customer pays to submit, DJ accepts/rejects
- No music playback — we only manage the queue

## Conventions

- API prefix: `/api`
- Use Supabase for DB + real-time subscriptions
- Frontend is PWA — no app store

## Docs

- [spec.md](docs/spec.md) — full product spec
- [implementation-steps.md](docs/implementation-steps.md) — dev roadmap
