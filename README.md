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
| Frontend (Customer) | React + Vite (PWA) |
| Frontend (DJ) | React + Vite |
| Backend | Node.js + Express |
| Database | Supabase (PostgreSQL) |
| Real-time | Supabase Realtime |
| Payments | Stripe Connect |
| Song Search | Spotify Web API |

---

## Project Structure

```
/
├── apps/
│   ├── frontend/       # Customer PWA + DJ Dashboard
│   └── backend/        # Node.js API server
├── docs/               # Product spec & implementation steps
│   ├── spec.md
│   └── implementation-steps.md
└── supabase/           # Database migrations & functions
```

---

## Quick Start

```bash
# Install dependencies
npm install

# Start backend
nx serve backend

# Start frontend
nx serve frontend
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8000

---

## Documentation

- [Product Specification](docs/spec.md)
- [Implementation Steps](docs/implementation-steps.md)

---

## License

MIT
