# Frontend - React SPA

## Tech Stack
- React 18, TypeScript, Vite 6, Tailwind CSS
- React Router DOM 7, Supabase JS, Stripe React SDK
- Vitest + Testing Library

## Patterns
- **Auth**: `useAuth()` hook from `contexts/AuthContext` for user/session/dj state
- **API calls**: Use `api.*` from `lib/api.ts`, never raw fetch
- **Error handling**: Throw `ApiError` or `NetworkError` from `lib/errors.ts`
- **Realtime**: Supabase subscriptions via custom hooks (e.g., `useRequestsRealtime`)
- **Exports**: Barrel files (`index.ts`) in components/, hooks/, lib/


- **Exception**: Inside `onAuthStateChange` callbacks, use raw `fetch` with `session.access_token` to avoid `getSession()` deadlock
## Routes
- `/join/:venueSlug` - Customer joins venue session
- `/register` - DJ registration
- `/login`, `/dj` - DJ login
- `/dj/dashboard` - DJ dashboard (protected)

## Cross-directory Dependencies
- Uses root Supabase types via `@supabase/supabase-js`
- Shares API contract with backend (types in `lib/api.ts` mirror backend schemas)
