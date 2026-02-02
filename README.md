# DJ Request

A mobile-first platform that lets bar/club customers pay to request songs from DJs. We monetize an existing behavior (shouting requests) while giving DJs full control.

**We are NOT a jukebox. We don't play music — we manage paid requests.** This sidesteps music licensing entirely.

---

## How It Works

1. **Customer** scans QR code at venue
2. **Customer** searches for a song, pays to submit request
3. **DJ** sees request on dashboard, accepts or rejects
4. **Everyone earns** — revenue splits between DJ, venue, and platform

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vite + React 18 (PWA) |
| Backend | Python FastAPI |
| Database | Supabase (PostgreSQL) |
| Real-time | Supabase Realtime |
| Payments | Stripe + Stripe Connect |
| Song Search | Spotify Web API |
| Deployment | Kubernetes + Helm |
| CI/CD | GitHub Actions + Nx |
| Ingress | Traefik |

---

## Project Structure

```
/
├── apps/
│   ├── frontend/       # Vite + React PWA (Customer + DJ)
│   │   └── helm/       # Frontend Helm chart
│   └── backend/        # Python FastAPI
│       └── helm/       # Backend Helm chart
├── helm/               # Infrastructure Helm chart (namespace, ingress)
├── .github/
│   ├── workflows/      # CI/CD pipelines
│   └── scripts/        # Deployment scripts
├── docs/               # Product spec & implementation steps
└── supabase/           # Database migrations & RLS policies
```

---

## Quick Start

```bash
# Install dependencies
npm install
cd apps/backend && pip install -e .

# Start frontend
nx serve frontend

# Start backend
nx serve backend
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8000

### Application URLs

| URL | Purpose | User |
|-----|---------|------|
| `/` | Home page | All |
| `/join/:venueSlug` | Join venue & request songs (via QR code) | Customer |
| `/register` | DJ registration | DJ |
| `/login` or `/dj` | DJ login | DJ |
| `/dj/dashboard` | DJ dashboard (manage requests, venues, QR codes) | DJ |

---

## Environment Variables

### Frontend (`apps/frontend/.env`)

```bash
# Supabase (for Realtime)
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-anon-key

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# Backend API
VITE_API_URL=http://localhost:8000/api
```

### Backend (`apps/backend/.env`)

```bash
# Supabase
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Spotify
SPOTIFY_CLIENT_ID=your-client-id
SPOTIFY_CLIENT_SECRET=your-client-secret
```

---

## Deployment

### GitHub Actions Secrets

Configure these secrets in your GitHub repository settings:

| Secret | Description |
|--------|-------------|
| `DOCKER_USERNAME` | Docker Hub username |
| `DOCKER_PASSWORD` | Docker Hub password or access token |
| `K8S_SERVER` | Kubernetes API server URL |
| `K8S_CA_DATA` | Kubernetes CA certificate (base64) |
| `K8S_CLIENT_CERT` | Kubernetes client certificate (base64) |
| `K8S_CLIENT_KEY` | Kubernetes client key (base64) |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |

### Kubernetes Secrets

Create a secret for backend environment variables:

```bash
kubectl create secret generic backend-secrets \
  --namespace=juke-box-service \
  --from-literal=SUPABASE_URL=https://your-project.supabase.co \
  --from-literal=SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
  --from-literal=STRIPE_SECRET_KEY=sk_live_xxx \
  --from-literal=STRIPE_PUBLISHABLE_KEY=pk_live_xxx \
  --from-literal=STRIPE_WEBHOOK_SECRET=whsec_xxx \
  --from-literal=SPOTIFY_CLIENT_ID=your-client-id \
  --from-literal=SPOTIFY_CLIENT_SECRET=your-client-secret
```

### Deployment Commands

```bash
# Auto deploy (on push to main)
git push origin main

# Manual deploy (via GitHub Actions)
# Go to Actions > Manual Deploy > Run workflow

# Deploy specific version
npx nx run-many -t deploy --all
```

---

## Testing

### Test Accounts

For development and testing, use these pre-configured accounts:

| Role | Email | Password |
|------|-------|----------|
| DJ | `dj@example.com` | `test1234` |
| Venue Owner | `owner@example.com` | `test1234` |

### Test Credit Cards (Stripe)

| Card Number | Scenario |
|-------------|----------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 0002` | Declined card |
| `4000 0000 0000 3220` | 3D Secure authentication |

Use any future expiration date (e.g., `12/34`) and any 3-digit CVC.

---

## Documentation

- [Product Specification](docs/spec.md)
- [Implementation Steps](docs/implementation-steps.md)

---

## License

MIT
