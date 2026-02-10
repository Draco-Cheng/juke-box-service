# Backend — DropBeat API

Python FastAPI server with Supabase for database and Stripe Connect for payments.

## Endpoints

### DJs
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/djs` | Create a new DJ profile |
| GET | `/api/djs/live` | Get all currently live DJs (public) |
| GET | `/api/djs/me` | Get authenticated DJ's profile |
| GET | `/api/djs/by-email/{email}` | Get DJ by email |
| GET | `/api/djs/{dj_id}` | Get DJ by ID |
| PATCH | `/api/djs/{dj_id}/profile` | Update DJ profile (genres, image) |
| GET | `/api/djs/{dj_id}/venues` | Get DJ's venues |
| POST | `/api/djs/{dj_id}/venues` | Create a venue for DJ |
| GET | `/api/djs/{dj_id}/active-session` | Get DJ's active session |

### Sessions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sessions` | Create a DJ session |
| GET | `/api/sessions/{session_id}` | Get session by ID |
| PATCH | `/api/sessions/{session_id}` | Update session status |

### Venues
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/venues/{slug}` | Get venue by slug (QR scan) |
| GET | `/api/venues/{slug}/active-session` | Get venue's active session |
| POST | `/api/venues` | Create a new venue |
| PUT | `/api/venues/{venue_id}` | Update a venue |

### Song Requests
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/requests` | Submit a song request |
| GET | `/api/requests/{request_id}` | Get request by ID |
| PATCH | `/api/requests/{request_id}` | Accept/reject/play request |
| GET | `/api/requests/session/{session_id}` | Get all requests for a session |
| POST | `/api/requests/expire-stale` | Expire old authorization holds (cron) |

### Payments (Stripe Manual Capture)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payments/create-payment-intent` | Create PaymentIntent with hold |
| POST | `/api/payments/confirm-payment/{id}` | Confirm authorized payment |
| POST | `/api/payments/capture/{id}` | Capture payment (on play) |
| POST | `/api/payments/cancel/{id}` | Cancel hold (on reject) |
| GET | `/api/payments/config` | Get Stripe publishable key |

### Stripe Connect
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/connect/{dj_id}/onboard` | Start Stripe Connect onboarding |
| GET | `/api/connect/{dj_id}/status` | Get Connect account status |
| GET | `/api/connect/{dj_id}/dashboard` | Get Express dashboard link |

### Spotify
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/spotify/search` | Search tracks |
| GET | `/api/spotify/track/{track_id}` | Get track by ID |

### Webhooks
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/webhooks/stripe` | Handle Stripe webhook events |

## Payment Flow (Manual Capture)

1. Customer submits request → `create-payment-intent` (hold only, `capture_method='manual'`)
2. Customer confirms → `confirm-payment` (authorization hold placed)
3. DJ plays song → `PATCH /requests/{id}` with `played` → auto-captures payment
4. DJ rejects → `PATCH /requests/{id}` with `rejected` → auto-cancels hold (no charge)
5. Stale holds (>6 days) → `expire-stale` endpoint cancels them automatically

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
| `SUPABASE_JWT_SECRET` | JWT secret for verifying auth tokens |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `SPOTIFY_CLIENT_ID` | Spotify API client ID |
| `SPOTIFY_CLIENT_SECRET` | Spotify API client secret |

## Tech

- **Framework**: FastAPI
- **Database**: Supabase (PostgreSQL)
- **Payments**: Stripe Connect (manual capture)
- **Auth**: Supabase Auth (JWT verification)
- **Rate Limiting**: SlowAPI
