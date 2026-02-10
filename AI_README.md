# DropBeat Platform

Paid song request platform for bars and clubs. Nx monorepo.

## Tech Stack
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS (apps/frontend)
- **Backend**: Python 3.10+, FastAPI, Pydantic (apps/backend)
- **Database**: Supabase (PostgreSQL + Auth)
- **Payments**: Stripe Connect for DJ payouts (manual capture: hold on request, capture on play)
- **E2E**: Playwright (apps/frontend-e2e)

## Environment Variables
- Frontend: `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`
- Backend: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`
- Backend: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- Backend: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`

## Cross-directory Dependencies
- Frontend calls backend via `apps/frontend/src/lib/api.ts` typed client
- Both apps share Supabase auth (JWT tokens passed in Authorization header)
- Stripe publishable key fetched from `/api/payments/config`
