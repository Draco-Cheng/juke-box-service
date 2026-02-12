# Frontend - Next.js App Router

## Tech Stack
- Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS + shadcn/ui
- Supabase JS, Stripe React SDK
- UI primitives: shadcn/ui (`@/components/ui/*`) — Button, Input, Slider
- Utility: `cn()` from `@/lib/utils` for Tailwind class merging
- Path alias: `@/` → `./src/`
- Design tokens: CSS variables in `app/globals.css` (HSL format), Teal/Cyan primary, dark theme
- Fonts: `next/font/google` (Inter + Space Mono) via CSS vars

## Patterns
- **Auth**: `useAuth()` hook from `contexts/AuthContext` for user/session/dj state
- **API calls**: Use `api.*` from `lib/api.ts`, never raw fetch
- **Error handling**: Throw `ApiError` or `NetworkError` from `lib/errors.ts`
- **Realtime**: Supabase subscriptions via custom hooks (e.g., `useRequestsRealtime`)
- **Exports**: Barrel files (`index.ts`) in components/, hooks/, lib/
- **Exception**: Inside `onAuthStateChange` callbacks, use raw `fetch` with `session.access_token` to avoid `getSession()` deadlock
- **Env vars**: Use `env.*` from `lib/env.ts`, never `process.env` directly. Uses `NEXT_PUBLIC_*` env vars
- **Routing**: File-system routing via `src/app/`. Page views in `src/views/`
- **Client components**: All pages/components use `'use client'`. Wrap `useSearchParams()` consumers in `<Suspense>`

## Routes (file-system, `src/app/`)
- `/` - Home (live DJs + my requests)
- `/venue/[venueSlug]` - DJ detail page
- `/join/[venueSlug]` - Song request + payment flow
- `/register` - DJ registration
- `/login`, `/dj` - DJ login
- `/dj/dashboard` - DJ dashboard (protected)
- `/dj/go-live` - Go live toggle
- `/dj/history` - DJ request history

## Cross-directory Dependencies
- Uses root Supabase types via `@supabase/supabase-js`
- Shares API contract with backend (types in `lib/api.ts` mirror backend schemas)
