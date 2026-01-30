# AI_README: Backend

## Stack

Python 3.10+ / FastAPI / Supabase / Stripe

## Key Files

- `main.py` — FastAPI app entry
- `routes/` — venues, sessions, requests API handlers
- `models/` — Pydantic schemas
- `database.py` — Supabase client
- `config.py` — Environment config

## Commands

```bash
nx serve backend    # Start dev server (port 8000)
nx test backend     # Run tests
nx lint backend     # Run ruff linter
```

## Database

Migration files: `supabase/migrations/<timestamp>_name.sql`

```bash
npx supabase db push   # Apply migrations to cloud
```

Note: Migration filenames must follow `<timestamp>_name.sql` format (e.g., `20250130000000_init.sql`)




