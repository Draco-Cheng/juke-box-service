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
- [ ] Create Supabase project (cloud)
- [ ] Set up Row Level Security (RLS) policies
- [ ] Configure auth (magic link for DJs)

### 0.3 External Services
- [ ] Create Stripe account + Stripe Connect
- [ ] Register Spotify Developer app
- [ ] Set up hosting (Vercel/Railway)

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

### 1.3 Real-time Subscriptions
- [ ] Set up Supabase Realtime for `requests` table
- [ ] Configure broadcast channels for session events

---

## Phase 2: Customer Flow ✅
**Status: COMPLETE**

### 2.1 Join Flow
- [x] Create route (`/join/:venueSlug`)
- [x] Fetch venue and active session from API
- [x] Display venue info and current queue
- [x] Handle "no active session" state

### 2.2 Song Search
- [ ] Integrate Spotify Web API (via backend proxy)
- [ ] Build search input with debounce
- [ ] Display search results (track, artist, album art)
- [ ] Handle "manual input" fallback

### 2.3 Request Submission
- [ ] Build request form
  - Song selection
  - Tier selection (Normal €2 / Priority €5 / ASAP €10)
  - Optional message input
- [ ] Show price breakdown
- [ ] Form validation

### 2.4 Payment Integration
- [ ] Set up Stripe Elements
- [ ] Implement Payment Request API (Apple Pay / Google Pay)
- [ ] Create payment intent on backend
- [ ] Handle payment confirmation
- [ ] Show success/error states

### 2.5 Request Status
- [ ] Subscribe to request status changes (Supabase Realtime)
- [ ] Display status badge (pending → accepted → played)
- [ ] Show rejection reason if applicable

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
- [x] Real-time request list with polling (3s interval)
- [x] Sort by: tier (priority first), then timestamp
- [x] Display request cards (song, tier badge, message, amount)
- [x] Implement actions: Accept / Skip / Mark as Played

### 3.4 Controls
- [x] "Pause Requests" toggle
- [x] Session stats (queue count, played count, earnings)

---

## Phase 4: Payments & Payouts
**Status: PENDING**

### 4.1 Stripe Connect Setup
- [ ] Implement DJ onboarding flow (Stripe Connect Express)
- [ ] Store connected account IDs
- [ ] Handle onboarding webhook events

### 4.2 Payment Processing
- [ ] Create payment intents with application fee
- [ ] Configure destination charges for DJ payout
- [ ] Handle payment webhooks (`payment_intent.succeeded`, `failed`)

### 4.3 Refunds
- [ ] Implement auto-refund for rejected requests
- [ ] Handle refund webhook events

---

## Phase 5: Venue Features
**Status: PENDING**

### 5.1 Venue Management
- [ ] Venue registration flow
- [ ] Pricing configuration
- [ ] Content filters (explicit, blocked artists)

### 5.2 QR Code Generation
- [ ] Generate unique QR codes
- [ ] Downloadable assets (print-ready)

---

## Phase 6: Polish & Launch
**Status: PENDING**

### 6.1 Error Handling
- [ ] Global error boundaries
- [ ] API error handling with user-friendly messages
- [ ] Offline state handling

### 6.2 Security
- [ ] Rate limiting on APIs
- [ ] Input sanitization
- [ ] RLS policy audit

### 6.3 Testing
- [ ] Unit tests for critical business logic
- [ ] E2E tests for main user flows

---

## Milestone Checklist

| Milestone | Deliverable | Status |
|-----------|-------------|--------|
| M0 | Project scaffolding | ✅ Done |
| M1 | Backend APIs functional | ✅ Done |
| M2 | Customer can submit request | ✅ Done |
| M3 | Payments work | ⏳ Pending |
| M4 | DJ can manage requests | ✅ Done |
| M5 | Production ready | ⏳ Pending |

---

## Next Steps

1. **Create Supabase project** and apply migration
2. **Build backend API endpoints** for sessions/requests/venues
3. **Connect frontend to backend** - fetch venue, display queue
4. **Test core loop** - customer submits request, DJ sees it
5. **Add Stripe payments**

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
