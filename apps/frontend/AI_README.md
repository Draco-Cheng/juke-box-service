# Frontend - React SPA

## Tech Stack
- React 18, TypeScript, Vite 6, Tailwind CSS + shadcn/ui
- React Router DOM 7, Supabase JS, Stripe React SDK
- Vitest + Testing Library
- UI primitives: shadcn/ui (`@/components/ui/*`) — Button, Input, Slider
- Utility: `cn()` from `@/lib/utils` for Tailwind class merging
- Path alias: `@/` → `./src/`
- Design tokens: CSS variables in `index.css` (HSL format), Teal/Cyan primary, dark theme

## Patterns
- **Auth**: `useAuth()` hook from `contexts/AuthContext` for user/session/dj state
- **API calls**: Use `api.*` from `lib/api.ts`, never raw fetch
- **Error handling**: Throw `ApiError` or `NetworkError` from `lib/errors.ts`
- **Realtime**: Supabase subscriptions via custom hooks (e.g., `useRequestsRealtime`)
- **Exports**: Barrel files (`index.ts`) in components/, hooks/, lib/


- **Exception**: Inside `onAuthStateChange` callbacks, use raw `fetch` with `session.access_token` to avoid `getSession()` deadlock

- **Env vars**: Use `env.*` from `lib/env.ts`, never `import.meta.env` directly. Runtime injection via `window.__ENV__` (container), build-time fallback (Vite dev)
## Routes
- `/venue/:venueSlug` - DJ detail page (stats, trust signal, CTA)
- `/join/:venueSlug` - Customer request form + payment
- `/register` - DJ registration
- `/login`, `/dj` - DJ login
- `/dj/dashboard` - DJ dashboard (protected)

## Cross-directory Dependencies
- Uses root Supabase types via `@supabase/supabase-js`
- Shares API contract with backend (types in `lib/api.ts` mirror backend schemas)
