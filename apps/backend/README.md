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

## Tech

- **Framework**: FastAPI
- **Database**: Supabase (PostgreSQL)
- **Payments**: Stripe
- **Auth**: Supabase Auth