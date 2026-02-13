# DropBeat

A mobile-first paid song request platform for bars, clubs, and live DJs. Customers discover live DJs, request songs, and pay tips — DJs stay in control.

**We are NOT a jukebox. We don't play music — we manage paid requests.** This sidesteps music licensing entirely.

---

## How It Works

1. **Discover** — Listener opens app, browses live DJs nearby
2. **Request** — Select a DJ, search for a song, set an offer amount
3. **Pay** — Payment is authorized (held, not charged yet)
4. **Play** — DJ accepts and plays the song → payment captured
5. **Reject** — DJ declines → payment released, no charge

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS (PWA) |
| UI Components | shadcn/ui (planned migration) |
| Backend | Python 3.10+ FastAPI |
| Database | Supabase (PostgreSQL + Auth + Realtime) |
| Payments | Stripe Connect (manual capture) |
| Song Search | Spotify Web API (metadata only) |
| Deployment | Kubernetes + Helm + Traefik |
| CI/CD | GitHub Actions + Nx |

---

## Project Structure

```
├── apps/
│   ├── frontend/          # React + Vite PWA (Listener + DJ)
│   │   └── helm/          # Frontend Helm chart
│   ├── frontend-e2e/      # Playwright E2E tests
│   └── backend/           # Python FastAPI
│       └── helm/          # Backend Helm chart
├── helm/                  # Infrastructure Helm chart (namespace, ingress)
├── .github/
│   ├── workflows/         # CI/CD pipelines
│   └── scripts/           # Deployment scripts
├── docs/
│   ├── idea.md            # Original brainstorm
│   ├── spec.md            # Product specification
│   ├── implementation-steps.md  # Phase-by-phase build log
│   └── jukebox-app-design/     # UI design prototype (Next.js reference)
└── supabase/              # Database migrations & RLS policies
```

---

## Design System

| Property | Value |
|----------|-------|
| Theme | Dark (#0d0f14 background) |
| Primary | Teal/Cyan (#51c2d8, HSL 160 84% 39%) |
| Accent | Orange/Yellow (#ffcc00) |
| Destructive | Red (#e74c3c) |
| Fonts | Inter (UI) + Space Mono (prices) |
| Layout | Mobile-first, max-width 500px |
| Border Radius | 0.75rem (12px) |

See [docs/jukebox-app-design/](docs/jukebox-app-design/) for the full UI design prototype with all components and views.

---

## Application Views

### Listener Mode

| View | Description |
|------|-------------|
| DJ Discovery | Browse live DJs with avatar, genre, rating, min price |
| DJ Detail | DJ profile with stats, bio, venue info |
| Song Search | Spotify-powered song search with selection |
| Offer | Set custom offer amount (slider + quick buttons) |
| Request Status | Real-time status tracking with progress bar |
| My Requests | All past requests in expandable cards |

### DJ Mode

| View | Description |
|------|-------------|
| Dashboard | "DJ Cockpit" — incoming requests, queue, earnings |
| Go Live | Set minimum price, start/stop session |
| History | Earnings summary, completed/declined requests |

### Navigation

- Bottom navigation bar with Listener / DJ mode toggle
- Listener tabs: DJs, Requests
- DJ tabs: Dashboard, Go Live, History

---

## Quick Start

```bash
# Install dependencies
npm install
cd apps/backend && pip install -e .

# Start frontend
npx nx serve frontend

# Start backend
npx nx serve backend
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8000

### Application URLs

| URL | Purpose | User |
|-----|---------|------|
| `/` | DJ Discovery (home) | Listener |
| `/join/:venueSlug` | Song request + payment | Listener |
| `/dj/:djId` | DJ detail page (planned) | Listener |
| `/register` | DJ registration | DJ |
| `/login` or `/dj` | DJ login | DJ |
| `/dj/dashboard` | DJ dashboard | DJ |

---

## Environment Variables

### Frontend (`apps/frontend/.env`)

```bash
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

### Backend (`apps/backend/.env`)

```bash
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
SPOTIFY_CLIENT_ID=your-client-id
SPOTIFY_CLIENT_SECRET=your-client-secret
```

---

## Payment Flow

```
Customer submits request
    → Payment authorized (held, not charged)
        → DJ accepts → DJ marks played → Payment captured
        → DJ rejects → Payment canceled (released, no charge)
        → 6 days pass → Auto-expired (Stripe limit ~7 days)
```

Revenue split: DJ 50% / Venue 25% / Platform 25%

---

## Deployment

### GitHub Actions Secrets

| Secret | Description |
|--------|-------------|
| `DOCKER_USERNAME` | Docker Hub username |
| `DOCKER_PASSWORD` | Docker Hub password or access token |
| `K8S_SERVER` | Kubernetes API server URL |
| `K8S_CA_DATA` | Kubernetes CA certificate (base64) |
| `K8S_CLIENT_CERT` | Kubernetes client certificate (base64) |
| `K8S_CLIENT_KEY` | Kubernetes client key (base64) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `K8S_NAMESPACE` | Kubernetes namespace (default: `juke-box-service`) |
| `INGRESS_HOST` | Domain for ingress routing |

### Kubernetes Secrets

```bash
kubectl create secret generic backend-secrets \
  --namespace=juke-box-service \
  --from-literal=SUPABASE_URL=https://your-project.supabase.co \
  --from-literal=SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
  --from-literal=SUPABASE_JWT_SECRET=your-jwt-secret \
  --from-literal=STRIPE_SECRET_KEY=sk_live_xxx \
  --from-literal=STRIPE_PUBLISHABLE_KEY=pk_live_xxx \
  --from-literal=STRIPE_WEBHOOK_SECRET=whsec_xxx \
  --from-literal=SPOTIFY_CLIENT_ID=your-client-id \
  --from-literal=SPOTIFY_CLIENT_SECRET=your-client-secret
```

### Deploy Commands

```bash
# Auto deploy (push to main)
git push origin main

# Manual deploy (GitHub Actions > Manual Deploy > Run workflow)

# Helm
helm upgrade --install jukebox ./helm \
  --set namespace.name=juke-box-service \
  --set ingress.host=jukebox.music.com
```

---

## Testing

### Test Accounts

| Role | Email | Password |
|------|-------|----------|
| DJ | `dj@example.com` | `test1234` |

### Test Credit Cards (Stripe)

| Card Number | Scenario |
|-------------|----------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 0002` | Declined card |
| `4000 0000 0000 3220` | 3D Secure authentication |

Use any future expiration date and any 3-digit CVC.

---

## Documentation

- [Product Specification](docs/spec.md)
- [Implementation Steps](docs/implementation-steps.md)
- [UI Design Prototype](docs/jukebox-app-design/) — Full reference design (Next.js)

---

## License

MIT
