# DJ Request - Product Specification

## Overview

DJ Request is a mobile-first platform that enables bar/club customers to pay for song requests to DJs. It monetizes an existing behavior (shouting requests at DJs) while giving DJs full control over their queue.

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

## User Flows

### Customer Flow

```
1. Scan QR code (near DJ booth / bar / table)
         ↓
2. PWA opens → Auto-join this venue/DJ session
         ↓
3. Search for a song (Spotify API / text input)
         ↓
4. Choose request tier:
   • Normal Request (€2)
   • Priority Request (€5)
   • Play ASAP (€10) — DJ can still refuse
         ↓
5. Optional: Add message ("Happy birthday Anna!")
         ↓
6. Pay (Apple Pay / Google Pay / Card)
         ↓
7. See request status (pending → accepted/rejected → played)
```

**No login required for MVP** — frictionless experience.

### DJ Flow

```
1. Log in to DJ Dashboard (tablet/phone)
         ↓
2. Create or join a venue session
         ↓
3. See incoming requests in real-time
   • Priority requests float to top
   • Shows: Song, Artist, Tier, Message, Time
         ↓
4. For each request, can:
   • ✓ Accept
   • ✗ Skip (with optional reason)
   • ⏸ Delay
   • ✓ Mark as Played
         ↓
5. Controls available:
   • Pause all requests
   • Block specific songs/artists
   • Set genre filters
   • View earnings
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

### Customer Pricing (Venue Configurable)

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

### Frontend (Customer)

- **Type**: Progressive Web App (PWA)
- **Why**: Instant access via QR, no App Store friction
- **Key features**: Offline-capable, installable, push notifications

### Frontend (DJ Dashboard)

- **Type**: Responsive web app
- **Optimized for**: Tablet in landscape mode
- **Key features**: Real-time updates, large touch targets, dark mode

### Backend

- **Runtime**: Node.js
- **Database**: PostgreSQL (via Supabase) or Firebase
- **Real-time**: WebSockets or Supabase Realtime
- **Auth**: Magic link for DJs, anonymous for customers

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
