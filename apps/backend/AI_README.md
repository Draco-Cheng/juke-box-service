# AI_README: Backend

## Stack

Node.js + Express + Supabase + Stripe

## Key Files

- `src/index.ts` — Express app entry
- `src/routes/` — API route handlers
- `src/services/` — Business logic (payments, Spotify)

## Conventions

- All routes prefixed with `/api`
- Use Supabase client for DB operations
- Stripe Connect for multi-party payouts
- TypeScript with strict mode
