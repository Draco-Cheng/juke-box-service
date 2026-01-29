# Backend — DJ Request API

Node.js + Express API server with Supabase for database and real-time features.

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sessions` | Create new DJ session |
| GET | `/api/sessions/:id` | Get session details |
| PATCH | `/api/sessions/:id` | Update session status |
| POST | `/api/requests` | Submit song request |
| PATCH | `/api/requests/:id` | Accept/reject request |
| GET | `/api/venues/:slug` | Get venue by slug |

## Development

```bash
# From monorepo root
nx serve backend
```

API available at http://localhost:8000

## Tech

- **Runtime**: Node.js + Express
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Supabase Realtime
- **Payments**: Stripe Connect
- **Auth**: Magic link (DJs), anonymous (customers)
