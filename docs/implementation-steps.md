# DJ Request - Implementation Steps

This document outlines the step-by-step implementation plan for building the DJ Request MVP. Each phase is designed to be completed incrementally, with working software at each milestone.

---

## Tech Stack

| Layer | Technology | Reason |
|-------|------------|--------|
| Frontend (Customer) | React + Vite (PWA) | Fast, modern, easy PWA setup |
| Frontend (DJ) | React + Vite | Shared codebase with customer app |
| Backend | Node.js + Express | Simple, well-supported |
| Database | Supabase (PostgreSQL) | Real-time, auth, hosting included |
| Real-time | Supabase Realtime | Built-in WebSocket subscriptions |
| Payments | Stripe + Stripe Connect | Multi-party payouts |
| Song Search | Spotify Web API | Rich metadata, free tier available |
| Hosting | Vercel (frontend) + Supabase (backend) | Free tier friendly |

---

## Phase 0: Project Setup
**Estimated scope: Foundation**

### 0.1 Repository Setup
- [ ] Initialize monorepo structure
  ```
  /
  ├── apps/
  │   ├── customer/     # Customer PWA
  │   └── dj/           # DJ Dashboard
  ├── packages/
  │   ├── shared/       # Shared types, utils
  │   └── ui/           # Shared UI components
  ├── supabase/         # Database migrations, functions
  └── docs/             # Documentation
  ```
- [ ] Set up pnpm workspaces
- [ ] Configure TypeScript
- [ ] Set up ESLint + Prettier
- [ ] Create `.env.example` files

### 0.2 Supabase Setup
- [ ] Create Supabase project
- [ ] Design initial database schema
- [ ] Set up Row Level Security (RLS) policies
- [ ] Configure auth (magic link for DJs)

### 0.3 External Services
- [ ] Create Stripe account + Stripe Connect
- [ ] Register Spotify Developer app
- [ ] Set up Vercel project

---

## Phase 1: Core Backend
**Estimated scope: Data layer + APIs**

### 1.1 Database Schema
- [ ] Create `venues` table
  ```sql
  - id, name, slug, location, settings (jsonb)
  - created_at, updated_at
  ```
- [ ] Create `djs` table
  ```sql
  - id, user_id (auth), name, email, stripe_account_id
  - created_at, updated_at
  ```
- [ ] Create `sessions` table
  ```sql
  - id, venue_id, dj_id, status, started_at, ended_at
  ```
- [ ] Create `requests` table
  ```sql
  - id, session_id, song_title, song_artist, spotify_track_id
  - tier, message, amount, status, customer_id
  - created_at, updated_at
  ```
- [ ] Create `payments` table
  ```sql
  - id, request_id, stripe_payment_id, amount
  - platform_fee, dj_payout, venue_payout, status
  ```

### 1.2 API Endpoints
- [ ] **Sessions**
  - `POST /sessions` - Create new session (DJ)
  - `GET /sessions/:id` - Get session details
  - `PATCH /sessions/:id` - Update session status
  - `GET /sessions/:id/requests` - Get all requests for session

- [ ] **Requests**
  - `POST /requests` - Submit new request (Customer)
  - `PATCH /requests/:id` - Update request status (DJ)
  - `GET /requests/:id` - Get request details

- [ ] **Venues**
  - `GET /venues/:slug` - Get venue by slug (for QR join)
  - `GET /venues/:id/active-session` - Get current active session

### 1.3 Real-time Subscriptions
- [ ] Set up Supabase Realtime for `requests` table
- [ ] Configure broadcast channels for session events

---

## Phase 2: Customer PWA
**Estimated scope: Customer-facing app**

### 2.1 Project Setup
- [ ] Initialize Vite + React project
- [ ] Configure PWA plugin (vite-plugin-pwa)
- [ ] Set up TailwindCSS
- [ ] Create app shell and routing

### 2.2 Join Flow
- [ ] Create QR landing page (`/join/:venueSlug`)
- [ ] Fetch venue and active session
- [ ] Display venue info and current queue
- [ ] Handle "no active session" state

### 2.3 Song Search
- [ ] Integrate Spotify Web API (client credentials flow)
- [ ] Build search input with debounce
- [ ] Display search results (track, artist, album art)
- [ ] Handle "manual input" fallback

### 2.4 Request Submission
- [ ] Build request form
  - Song selection
  - Tier selection (Normal / Priority / ASAP)
  - Optional message input
- [ ] Show price breakdown
- [ ] Form validation

### 2.5 Payment Integration
- [ ] Set up Stripe Elements
- [ ] Implement Payment Request API (Apple Pay / Google Pay)
- [ ] Create payment intent on backend
- [ ] Handle payment confirmation
- [ ] Show success/error states

### 2.6 Request Status
- [ ] Subscribe to request status changes
- [ ] Display status badge (pending → accepted → played)
- [ ] Show rejection reason if applicable

### 2.7 PWA Features
- [ ] Configure manifest.json
- [ ] Add service worker for offline shell
- [ ] Implement "Add to Home Screen" prompt
- [ ] Set up push notifications (optional for MVP)

---

## Phase 3: DJ Dashboard
**Estimated scope: DJ-facing app**

### 3.1 Project Setup
- [ ] Initialize Vite + React project
- [ ] Configure for tablet-first responsive design
- [ ] Set up dark mode theme
- [ ] Create app shell and routing

### 3.2 Authentication
- [ ] Implement magic link login
- [ ] Create DJ profile setup flow
- [ ] Handle session persistence

### 3.3 Session Management
- [ ] Create "Start Session" flow
  - Select venue
  - Confirm settings
- [ ] Display active session info
- [ ] Implement "End Session" with confirmation

### 3.4 Request Queue
- [ ] Real-time request list with Supabase subscription
- [ ] Sort by: tier (priority first), then timestamp
- [ ] Display request cards:
  - Song title + artist
  - Tier badge
  - Customer message
  - Time submitted
- [ ] Implement actions:
  - ✓ Accept
  - ✗ Skip (with optional quick reasons)
  - ✓ Mark as Played
- [ ] Add pull-to-refresh

### 3.5 Controls
- [ ] "Pause Requests" toggle (panic button)
- [ ] Quick filters (show priority only, etc.)
- [ ] Session stats (requests count, earnings)

### 3.6 Settings
- [ ] Block list management (songs/artists)
- [ ] Genre filters
- [ ] Notification sounds

---

## Phase 4: Payments & Payouts
**Estimated scope: Money flow**

### 4.1 Stripe Connect Setup
- [ ] Implement DJ onboarding flow (Stripe Connect Express)
- [ ] Store connected account IDs
- [ ] Handle onboarding webhook events

### 4.2 Payment Processing
- [ ] Create payment intents with application fee
- [ ] Configure destination charges for DJ payout
- [ ] Handle payment webhook events:
  - `payment_intent.succeeded`
  - `payment_intent.failed`

### 4.3 Revenue Tracking
- [ ] Calculate splits per transaction
- [ ] Store payout records
- [ ] Build earnings dashboard for DJs

### 4.4 Refunds
- [ ] Implement auto-refund for rejected requests
- [ ] Handle refund webhook events
- [ ] Update payment records

---

## Phase 5: Venue Features
**Estimated scope: Venue management**

### 5.1 Venue Registration
- [ ] Create venue signup flow
- [ ] Venue profile setup (name, location, logo)
- [ ] Link DJs to venues

### 5.2 Venue Settings
- [ ] Pricing configuration
- [ ] Revenue split settings
- [ ] Content filters (explicit, blocked artists)
- [ ] Operating hours

### 5.3 QR Code Generation
- [ ] Generate unique QR codes
- [ ] Downloadable assets (print-ready PDFs)
- [ ] Multiple QR codes per venue (tables, bar, booth)

### 5.4 Venue Dashboard
- [ ] Revenue overview
- [ ] Session history
- [ ] Popular songs analytics
- [ ] Active session monitoring

---

## Phase 6: Polish & Launch Prep
**Estimated scope: Production readiness**

### 6.1 Error Handling
- [ ] Global error boundaries
- [ ] API error handling with user-friendly messages
- [ ] Offline state handling
- [ ] Retry logic for failed requests

### 6.2 Performance
- [ ] Image optimization (album art lazy loading)
- [ ] Bundle size optimization
- [ ] Lighthouse audit (target: 90+ scores)

### 6.3 Security
- [ ] Rate limiting on APIs
- [ ] Input sanitization
- [ ] RLS policy audit
- [ ] CORS configuration

### 6.4 Testing
- [ ] Unit tests for critical business logic
- [ ] Integration tests for payment flow
- [ ] E2E tests for main user flows
- [ ] Manual QA checklist

### 6.5 Monitoring
- [ ] Error tracking (Sentry)
- [ ] Analytics (Plausible/Mixpanel)
- [ ] Uptime monitoring

### 6.6 Documentation
- [ ] API documentation
- [ ] DJ onboarding guide
- [ ] Venue partner guide
- [ ] FAQ / Help center content

---

## Phase 7: Beta Launch
**Estimated scope: Real-world testing**

### 7.1 Beta Preparation
- [ ] Recruit 5-10 beta DJs
- [ ] Print QR materials
- [ ] Set up support channel (Discord/WhatsApp)
- [ ] Create feedback collection system

### 7.2 Beta Rollout
- [ ] Deploy to production
- [ ] Onboard beta DJs
- [ ] Monitor first sessions closely
- [ ] Collect and prioritize feedback

### 7.3 Iteration
- [ ] Fix critical bugs
- [ ] Implement top-requested features
- [ ] Optimize based on real usage data

---

## Milestone Checklist

| Milestone | Deliverable | Success Criteria |
|-----------|-------------|------------------|
| M0 | Project scaffolding | All tooling configured, deploys work |
| M1 | Backend complete | All APIs functional, real-time works |
| M2 | Customer can submit | End-to-end request flow (no payment) |
| M3 | Payments work | Customer can pay, DJ sees earnings |
| M4 | DJ can manage | Full DJ workflow functional |
| M5 | Production ready | Security, monitoring, docs complete |
| M6 | Beta launched | 5+ DJs using in real venues |

---

## Next Steps

1. **Start with Phase 0** - Set up the monorepo and Supabase project
2. **Build Phase 1 & 2 in parallel** - Backend APIs + Customer UI
3. **Test the core loop** - Can a customer submit a request that a DJ sees?
4. **Add payments** - Complete the money flow
5. **Polish and launch** - Beta with real DJs

---

## Resources

- [Supabase Docs](https://supabase.com/docs)
- [Stripe Connect Docs](https://stripe.com/docs/connect)
- [Spotify Web API](https://developer.spotify.com/documentation/web-api)
- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)
- [TailwindCSS](https://tailwindcss.com/docs)
