# DJ Request - Implementation Steps

This document outlines the step-by-step implementation plan for building the DJ Request MVP.

---

## Tech Stack

| Layer | Technology | Reason |
|-------|------------|--------|
| Frontend | Vite + React 18 (PWA) | Fast, modern, easy PWA setup |
| Backend | Python FastAPI | Simple, async-ready |
| Database | Supabase (PostgreSQL) | Real-time, auth, hosting included |
| Real-time | Supabase Realtime | Built-in WebSocket subscriptions |
| Payments | Stripe + Stripe Connect | Multi-party payouts |
| Song Search | Spotify Web API | Rich metadata, free tier available |
| Deployment | Kubernetes + Helm | Scalable, cloud-agnostic |
| CI/CD | GitHub Actions + Nx | Automated builds, semantic versioning |
| Ingress | Traefik | Flexible routing, easy TLS |

---

## Phase 0: Project Setup ✅
**Status: COMPLETE**

### 0.1 Repository Setup
- [x] Monorepo structure with Nx
  ```
  /
  ├── apps/
  │   ├── frontend/     # Vite + React PWA (Customer + DJ)
  │   └── backend/      # Python FastAPI
  ├── supabase/         # Database migrations
  └── docs/             # Documentation
  ```
- [x] Configure TypeScript (frontend)
- [x] Create `.env.example` files

### 0.2 Supabase Setup
- [x] Design initial database schema
- [x] Create migration file (`00001_initial_schema.sql`)
- [x] Create Supabase project (cloud)
- [x] Set up Row Level Security (RLS) policies
  - `venues`: Public read, authenticated write
  - `djs`: Own profile only, service role for creation
  - `sessions`: Active/paused visible, service role for management
  - `requests`: Public read, service role for write
  - `payments`: Service role only (highly restricted)
- [x] Configure auth (email-based DJ login for MVP)

### 0.3 External Services
- [x] Create Stripe account + Stripe Connect
- [x] Register Spotify Developer app
- [x] Set up deployment infrastructure (Kubernetes + Helm)

---

## Phase 1: Core Backend ✅
**Status: COMPLETE**

### 1.1 Database Schema
- [x] Create migration with tables:
  - `venues` (id, name, slug, settings)
  - `djs` (id, user_id, name, email, stripe_account_id)
  - `sessions` (id, venue_id, dj_id, status)
  - `requests` (id, session_id, song_title, tier, amount, status)
  - `payments` (id, request_id, stripe_payment_id, amount)
- [x] Apply migration to Supabase Cloud

### 1.2 API Endpoints
- [x] **Sessions**
  - `POST /api/sessions` - Create new session (DJ)
  - `GET /api/sessions/:id` - Get session details
  - `PATCH /api/sessions/:id` - Update session status

- [x] **Requests**
  - `POST /api/requests` - Submit new request (Customer)
  - `PATCH /api/requests/:id` - Update request status (DJ)
  - `GET /api/requests/session/:id` - Get requests for session

- [x] **Venues**
  - `GET /api/venues/:slug` - Get venue by slug
  - `GET /api/venues/:slug/active-session` - Get current active session
  - `POST /api/venues` - Create venue

### 1.3 Real-time Subscriptions ✅
- [x] Set up Supabase Realtime for `requests` table
- [x] Create `useRequestsRealtime` hook with INSERT/UPDATE subscriptions
- [x] Fallback to polling when Supabase not configured
- [ ] Configure broadcast channels for session events (optional)

---

## Phase 2: Customer Flow ✅
**Status: COMPLETE**

### 2.1 Join Flow
- [x] Create route (`/join/:venueSlug`)
- [x] Fetch venue and active session from API
- [x] Display venue info and current queue
- [x] Handle "no active session" state

### 2.2 Song Search ✅
- [x] Integrate Spotify Web API (via backend proxy)
- [x] Build search input with debounce
- [x] Display search results (track, artist, album art)
- [x] Handle "manual input" fallback

### 2.3 Request Submission ✅
- [x] Build request form
  - Song selection (SongSearch component)
  - Tier selection (Normal €2 / Priority €5 / ASAP €10)
  - Optional message input
- [x] Show price breakdown
- [x] Form validation

### 2.4 Payment Integration ✅
- [x] Set up Stripe Elements
- [ ] Implement Payment Request API (Apple Pay / Google Pay)
- [x] Create payment intent on backend
- [x] Handle payment confirmation
- [x] Show success/error states

### 2.5 Request Status ✅
- [x] Subscribe to request status changes (Supabase Realtime) - Customer side
  - Created `useMyRequestStatus` hook for single request tracking
  - Stores customer's request IDs in localStorage
- [x] Display status badge (pending → accepted → played) - Customer side
  - "Your Request" card with realtime status updates
  - Color-coded status: pending (yellow), accepted (blue), played (green), rejected (red)
- [x] Show rejection reason if applicable
  - Displays "Skipped - Refunded" with refund message

### 2.6 PWA Features
- [x] Configure vite-plugin-pwa
- [ ] Add app icons (pwa-192x192.png, pwa-512x512.png)
- [ ] Test "Add to Home Screen" on mobile

---

## Phase 3: DJ Dashboard ✅
**Status: COMPLETE**

### 3.1 Authentication
- [x] Implement email-based login (MVP)
- [x] Create DJ profile lookup
- [x] Handle session persistence (localStorage)

### 3.2 Session Management
- [x] Create routes (`/dj`, `/dj/dashboard`)
- [x] "Start Session" flow (select venue)
- [x] Display active session info
- [x] "End Session" with confirmation

### 3.3 Request Queue
- [x] Real-time request list via Supabase Realtime (fallback: 3s polling)
- [x] Sort by: tier (priority first), then timestamp
- [x] Display request cards (song, tier badge, message, amount)
- [x] Implement actions: Accept / Skip / Mark as Played

### 3.4 Controls
- [x] "Pause Requests" toggle
- [x] Session stats (queue count, played count, earnings)

---

## Phase 4: Payments & Payouts ✅
**Status: COMPLETE**

### 4.1 Stripe Basic Integration ✅
- [x] Set up Stripe API keys (backend)
- [x] Create `/api/payments/config` endpoint (publishable key)
- [x] Create `/api/payments/create-payment-intent` endpoint
- [x] Create `/api/payments/confirm-payment/:id` endpoint
- [x] Frontend Stripe Elements integration
- [x] Payment flow working end-to-end

### 4.2 Stripe Connect Setup ✅
- [x] Implement DJ onboarding flow (Stripe Connect Express)
- [x] Create `/api/connect/{dj_id}/onboard` endpoint
- [x] Create `/api/connect/{dj_id}/status` endpoint
- [x] Create `/api/connect/{dj_id}/dashboard` endpoint
- [x] Store connected account IDs
- [x] Frontend Connect status UI in DJ Dashboard
- [ ] Handle onboarding webhook events (optional for MVP)

### 4.3 Payment Processing (Advanced) ✅
- [x] Configure destination charges for DJ payout (in payments.py)
- [x] Set up application fee splitting (15% platform fee)
- [x] Handle payment webhooks (`payment_intent.succeeded`, `failed`)
  - Created `/api/webhooks/stripe` endpoint
  - Added `stripe_payment_id` column to requests table (migration)
  - Idempotency check to prevent duplicate processing
  - Fallback: `/confirm-payment` endpoint still works without webhook

### 4.4 Refunds ✅
- [x] Implement auto-refund for rejected requests
  - Triggered automatically when DJ rejects a request
  - Uses `stripe.Refund.create()` with the payment_intent
- [x] Handle refund webhook events
  - Added `charge.refunded` handler in webhooks.py
  - Updates payment record status to "refunded"

---

## Phase 5: Venue Features ✅
**Status: COMPLETE**

### 5.1 Venue Management ✅
- [x] Venue registration flow (DJ can create venues)
- [x] Pricing configuration (per-venue pricing for normal/priority/ASAP tiers)
- [x] Content filters (explicit, blocked artists)
  - DJ can enable/disable content filters per venue
  - Block explicit content (uses Spotify's explicit flag)
  - Block specific artists (comma-separated list)

### 5.2 QR Code Generation ✅
- [x] Generate unique QR codes (SVG format)
- [x] Downloadable assets (opens in new tab for save/print)

---

## Phase 6: Deployment & Infrastructure ✅
**Status: COMPLETE**

### 6.0 Kubernetes Deployment
- [x] Create Dockerfiles (multi-stage builds)
  - `apps/frontend/Dockerfile` - Node build → Nginx production
  - `apps/backend/Dockerfile` - Python FastAPI + Uvicorn
- [x] Create Helm Charts
  - `helm/` - Infrastructure (namespace, ingress)
  - `apps/frontend/helm/` - Frontend deployment & service
  - `apps/backend/helm/` - Backend deployment & service
- [x] Configure Ingress (Traefik)
  - Route `/api` → backend-service:8000
  - Route `/` → frontend-service:80
- [x] Set up CI/CD (GitHub Actions)
  - `.github/workflows/ci.yml` - PR validation, lint, test, build
  - `.github/workflows/deploy.yml` - Auto deploy on push to main
  - `.github/workflows/manual-deploy.yml` - Manual deployment with version selection
- [x] Semantic versioning with Nx Release

### 6.0.1 Deployment Checklist (Cloud Provider Setup)
- [ ] Create Kubernetes cluster on cloud provider
- [ ] Install Ingress Controller (Traefik or cloud-native)
- [ ] Configure DNS to point to Ingress IP
- [ ] Set up TLS/SSL certificates (cert-manager or cloud SSL)
- [ ] Configure GitHub Secrets:
  - `DOCKER_USERNAME`, `DOCKER_PASSWORD`
  - `K8S_SERVER`, `K8S_CA_DATA`, `K8S_CLIENT_CERT`, `K8S_CLIENT_KEY`
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`
- [ ] Create Kubernetes Secrets for backend environment variables

---

## Phase 7: Polish & Launch
**Status: IN PROGRESS**

### 7.1 Error Handling ✅
- [x] Global error boundaries
  - `ErrorBoundary` component wraps entire app
  - Shows user-friendly error page with retry/home buttons
  - Displays technical details in collapsible section
- [x] API error handling with user-friendly messages
  - Custom `ApiError` and `NetworkError` classes
  - Status code to user message mapping
  - Common error messages translated to friendly text
- [x] Offline state handling
  - `useOnlineStatus` hook for detecting network state
  - `OfflineBanner` component shows warning when offline
- [x] Toast notification system
  - `ToastProvider` and `useToast` hook
  - Support for success/error/warning/info toasts

### 7.2 Security ✅
- [x] Rate limiting on APIs
  - Added `slowapi` middleware for rate limiting
  - Payment endpoints: 10/minute
  - Search endpoints: 30/minute
  - Auth endpoints: 20/minute
  - Write operations: 30/minute
- [x] Input sanitization
  - Pydantic validators for all user inputs
  - HTML entity escaping to prevent XSS
  - Length limits on all text fields
  - Regex patterns for slugs, emails, Spotify IDs
- [x] RLS policy audit
  - Comprehensive policies in `20250201100000_rls_policies.sql`
  - Database constraints in `20250202000000_security_enhancements.sql`
  - Length constraints, amount ranges, auto-update timestamps

### 7.3 Testing ✅
- [x] Unit tests for critical business logic
  - Backend pytest tests in `apps/backend/tests/`
  - Test coverage for payments, requests, sessions, venues
  - 60 unit tests covering API endpoints and business logic
  - Test fixtures and mocks for Supabase and Stripe
- [x] E2E tests for main user flows
  - Playwright tests in `apps/frontend-e2e/tests/`
  - Homepage navigation tests
  - DJ login page tests
  - Customer join page tests with mocked API responses
  - Tier selection and form validation tests

---

## Milestone Checklist

| Milestone | Deliverable | Status |
|-----------|-------------|--------|
| M0 | Project scaffolding | ✅ Done |
| M1 | Backend APIs functional | ✅ Done |
| M2 | Customer can submit request | ✅ Done |
| M3 | Payments work | ✅ Done |
| M4 | DJ can manage requests | ✅ Done |
| M5 | Deployment infrastructure | ✅ Done |
| M6 | Production ready | ⏳ In Progress |

---

## Next Steps

1. ~~**Create Supabase project** and apply migration~~ ✅
2. ~~**Build backend API endpoints** for sessions/requests/venues~~ ✅
3. ~~**Connect frontend to backend** - fetch venue, display queue~~ ✅
4. ~~**Test core loop** - customer submits request, DJ sees it~~ ✅
5. ~~**Add Stripe payments**~~ ✅ (Basic integration done)
6. ~~**Complete Stripe Connect**~~ ✅ - DJ onboarding and payout splitting
7. ~~**Add Supabase Realtime**~~ ✅ - Replace polling with WebSocket subscriptions
8. ~~**Integrate Spotify API**~~ ✅ - Song search functionality
9. ~~**Add Payment Webhooks**~~ ✅ - Webhook endpoint created (local testing requires Stripe CLI)
10. ~~**Set up deployment infrastructure**~~ ✅ - Kubernetes + Helm + CI/CD
11. **Deploy to production** - Configure cloud K8s cluster and secrets

---

## Commands

```bash
# Install dependencies
npm install
cd apps/backend && pip install -e .

# Start frontend
nx serve frontend

# Start backend
nx serve backend

# Run frontend tests
nx test frontend
```

---

## Resources

- [Supabase Docs](https://supabase.com/docs)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [Stripe Connect Docs](https://stripe.com/docs/connect)
- [Spotify Web API](https://developer.spotify.com/documentation/web-api)
- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)
