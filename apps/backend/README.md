# Backend — DJ Request API

Python FastAPI server with Supabase for database and Stripe for payments.

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ping` | Health check |
| POST | `/api/sessions` | Create DJ session (TODO) |
| POST | `/api/requests` | Submit song request (TODO) |
| PATCH | `/api/requests/:id` | Accept/reject request (TODO) |

## Development

```bash
# From monorepo root
nx serve backend
```

API available at http://localhost:8000
Docs at http://localhost:8000/docs

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (for admin operations) |
| `SUPABASE_JWT_SECRET` | JWT secret for verifying auth tokens (found in Supabase Dashboard > Settings > API) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `SPOTIFY_CLIENT_ID` | Spotify API client ID |
| `SPOTIFY_CLIENT_SECRET` | Spotify API client secret |

## Tech

- **Framework**: FastAPI
- **Database**: Supabase (PostgreSQL)
- **Payments**: Stripe
- **Auth**: Supabase Auth (JWT verification)