# DropBeat - Product Specification

## Overview

DropBeat is a mobile-first platform that enables bar/club customers to discover live DJs, request songs, and pay tips. It monetizes an existing behavior (shouting requests at DJs) while giving DJs full control over their queue.

**Key Differentiator**: We are NOT a jukebox. We don't play music — we manage paid requests. This sidesteps music licensing entirely.

---

## Problem Statement

### Current Pain Points

| Stakeholder | Problem |
|-------------|---------|
| **Customers** | Requests get lost in noise, no way to stand out |
| **DJs** | Constant interruptions, awkward tip handling, repetitive bad requests |
| **Venues** | Missing revenue opportunity, no visibility into crowd preferences |

### Our Solution

A paid, orderly, DJ-friendly way for the crowd to request songs — where:
- Customers pay to be heard
- DJs stay in control
- Everyone earns a cut

---

## Design System

| Property | Value |
|----------|-------|
| Theme | Dark (#0d0f14 background) |
| Primary | Teal/Cyan (#51c2d8, HSL 160 84% 39%) |
| Accent | Orange/Yellow (#ffcc00) |
| Destructive | Red (#e74c3c) |
| Fonts | Inter (UI) + Space Mono (prices/monospace) |
| Layout | Mobile-first, max-width 500px |
| Border Radius | 0.75rem (12px) |
| UI Library | shadcn/ui components |
| Navigation | Bottom nav bar with Listener/DJ mode toggle |

### Animations
- `pulse-live`: Pulsing effect for live DJ indicators
- `slide-up`: Page transition (0.3s ease-out)
- `progress-pulse`: Status indicator breathing effect

---

## User Flows

### Listener Flow (Updated)

```
1. Open app → DJ Discovery page
   • Browse live DJs with avatar, genre, rating, min price
   • See "Live Now" section with animated indicators
         ↓
2. Tap DJ card → DJ Detail page
   • View DJ profile, stats, bio, venue info
   • Trust signal: "Only charged if song is played"
         ↓
3. Tap "Request a Song" → Song Search
   • Search via Spotify API
   • Select song with checkmark
         ↓
4. Set offer amount → Offer Screen
   • Quick amount buttons (€5, €10, €15, €20, €30, €50)
   • Slider for custom amount (min = DJ's minimum price)
         ↓
5. Pay (Apple Pay / Google Pay / Card)
   • Payment authorized (held, not charged)
         ↓
6. Request Status page
   • Animated status icon
   • Progress bar: pending → accepted → playing → completed
   • Cancel/Withdraw option
```

**No login required for listeners** — frictionless experience.

### Legacy Listener Flow (QR Code)

```
1. Scan QR code → /join/:venueSlug
   • Direct access to song request form
   • Fixed tier pricing (Normal €2 / Priority €5 / ASAP €10)
```

### DJ Flow (Updated)

```
1. Log in → DJ Dashboard ("DJ Cockpit")
   • Total earnings display
   • Stats: Pending / In Queue / Potential earnings
         ↓
2. Go Live page
   • Set minimum price (€1–€50 slider)
   • Set venue name
   • Tap "GO LIVE" button
         ↓
3. Dashboard shows incoming requests
   • Request cards: requester name, song, artist, offer amount
   • Actions: Accept / Reject per request
   • Queue: accepted songs ready to play
   • "Mark Played" to complete and charge
         ↓
4. DJ History
   • Total earnings summary
   • Songs played vs declined stats
   • Past request list with amounts
```

**Mantra: "The DJ is always in control."**

### Venue/Promoter Flow

```
1. Register venue on platform
         ↓
2. Configure settings:
   • Pricing tiers
   • Revenue split (DJ vs Venue vs Platform)
   • Blocked content (songs/artists/explicit)
   • Operating hours
         ↓
3. Generate QR codes for tables/bar/DJ booth
         ↓
4. View analytics:
   • Revenue per night
   • Popular requests
   • Peak hours
   • Top supporters
```

---

## Pricing Model

### Offer-Based Pricing (New)

DJs set a minimum price (€1–€50). Listeners choose their own offer amount via:
- Quick buttons: €5, €10, €15, €20, €30, €50
- Custom slider: min = DJ's minimum, max = €100

Higher offers naturally get DJ attention. No fixed tiers required.

### Legacy Tier Pricing (QR join flow)

| Tier | Default Price | Description |
|------|---------------|-------------|
| Normal | €2 | Added to queue |
| Priority | €5 | Floats above normal requests |
| Play ASAP | €10 | Highlighted, but DJ can still refuse |

### Revenue Split (Default)

| Party | Share |
|-------|-------|
| DJ | 50% |
| Venue | 25% |
| Platform | 25% |

*Note: For early adoption, consider DJ keeps 70%, Platform 30%, Venue 0% — let DJs bring the product into venues.*

---

## Core Features (MVP)

### Must Have (v1.0)

- [ ] QR code join (no app download)
- [ ] Song search (Spotify metadata API)
- [ ] Request submission with payment
- [ ] Real-time DJ dashboard
- [ ] Accept/Reject/Played workflow
- [ ] Basic revenue tracking
- [ ] Stripe payment integration (Apple Pay, Google Pay)

### Should Have (v1.1)

- [ ] Request status notifications
- [ ] DJ block list (songs/artists)
- [ ] Cooldown rules (no same song twice in 30 min)
- [ ] Venue dashboard with analytics
- [ ] Multi-DJ support per venue

### Nice to Have (v2.0)

- [ ] Crowd voting on queued songs
- [ ] Top supporter leaderboard
- [ ] DJ profiles and ratings
- [ ] Event mode (private parties)
- [ ] Brand sponsorships

---

## Anti-Abuse Rules

| Rule | Implementation |
|------|----------------|
| Rate limiting | Max 5 requests per user per 30 min |
| Spam prevention | Cooldown after rejected request |
| DJ protection | "Panic button" to pause all requests |
| Content filter | Profanity filter on messages |
| Refunds | Auto-refund if request auto-rejected by rules |
| Troll prevention | Temporary ban after 3 rejected requests |

---

## Technical Requirements

### Frontend

- **Type**: Progressive Web App (PWA) — React 18 + Vite + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Layout**: Mobile-first (max-width 500px), dark theme only
- **Navigation**: Bottom nav bar with role-based tabs (Listener/DJ)
- **Key features**: Offline-capable, installable, real-time updates
- **Design reference**: `docs/jukebox-app-design/` (Next.js prototype — UI only, framework stays React+Vite)

### Backend

- **Runtime**: Python FastAPI
- **Database**: Supabase (PostgreSQL + Auth)
- **Real-time**: Supabase Realtime (WebSocket subscriptions)
- **Auth**: Email/password for DJs, anonymous for listeners

### Payments

- **Provider**: Stripe
- **Methods**: Apple Pay, Google Pay, Card
- **Flow**: Stripe Connect for multi-party payouts

### External APIs

- **Spotify Web API**: Song search (metadata only, no playback)
- **Alternative**: Apple Music API or plain text input

---

## Data Models

### Core Entities

```
Venue
├── id
├── name
├── location
├── settings (pricing, splits, filters)
└── qr_codes[]

DJ
├── id
├── name
├── email
├── stripe_account_id
└── venues[] (many-to-many)

Session
├── id
├── venue_id
├── dj_id
├── status (active/paused/ended)
├── started_at
└── ended_at

Request
├── id
├── session_id
├── song_title
├── song_artist
├── spotify_track_id (optional)
├── tier (normal/priority/asap)
├── message (optional)
├── amount_paid
├── status (pending/accepted/rejected/played)
├── customer_id (anonymous)
└── created_at

Payment
├── id
├── request_id
├── stripe_payment_id
├── amount
├── platform_fee
├── dj_payout
├── venue_payout
└── status
```

---

## Success Metrics

### North Star Metric
**Requests per active session per night**

### Supporting Metrics

| Metric | Target (Month 1) |
|--------|------------------|
| Active DJs | 10 |
| Sessions per week | 30 |
| Requests per session | 15 |
| Avg. request value | €3 |
| DJ retention (weekly) | 70% |

---

## Go-to-Market Strategy

### Phase 1: DJ-First Adoption

1. Find 5-10 local DJs
2. Offer: Free use + 0% platform fee for 1 month
3. Print QR cards for them
4. Let DJs bring product into venues

**DJs are the Trojan horse.**

### Phase 2: Venue Partnerships

1. Show venue owners the revenue data
2. Offer official partnership with venue dashboard
3. Provide branded QR materials

### Phase 3: Scale

1. City-by-city expansion
2. Festival/event partnerships
3. White-label options

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| DJs refuse to use | Guarantee full control, make rejection easy |
| Low customer adoption | QR placement strategy, DJ announces it |
| Payment friction | Apple Pay / Google Pay one-tap |
| Venue resistance | Start with DJ-only, prove revenue first |
| Trolls/abuse | Rate limits, bans, panic button |

---

## Out of Scope (MVP)

- Music playback / streaming
- Hardware devices
- Multi-language support
- Offline mode for DJs
- Social features (profiles, following)
