import { ApiError, NetworkError } from './errors'
import { supabase } from './supabase'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

/**
 * Get the current auth token from Supabase
 */
async function getAuthToken(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

/**
 * Make an API request with optional authentication
 */
async function request<T>(
  endpoint: string,
  options?: RequestInit & { auth?: boolean }
): Promise<T> {
  let res: Response

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options?.headers || {}),
  }

  // Add auth token if requested or for DJ-related endpoints
  const shouldAuth = options?.auth !== false && (
    options?.auth === true ||
    endpoint.startsWith('/djs/') ||
    endpoint.startsWith('/sessions/') ||
    endpoint.startsWith('/connect/')
  )

  if (shouldAuth) {
    const token = await getAuthToken()
    if (token) {
      ;(headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
    }
  }

  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    })
  } catch (error) {
    // Network error (offline, DNS failure, CORS, etc.)
    throw new NetworkError(error instanceof Error ? error.message : 'Network error')
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Request failed' }))
    const message = errorData.detail || 'Request failed'
    throw new ApiError(res.status, message)
  }

  return res.json()
}

// Types
export interface VenuePricing {
  normal: number  // cents
  priority: number  // cents
  asap: number  // cents
  currency: string
}

export interface ContentFilters {
  enabled: boolean
  block_explicit: boolean
  blocked_artists: string[]
}

export interface VenueSettings {
  pricing: VenuePricing
  content_filters?: ContentFilters
}

export interface Venue {
  id: string
  name: string
  slug: string
  settings: VenueSettings
  created_at: string
  updated_at: string
}

export interface VenueCreate {
  name: string
  slug: string
  settings?: VenueSettings
}

export interface VenueUpdate {
  name?: string
  settings?: VenueSettings
}

// Default pricing values
export const DEFAULT_PRICING: VenuePricing = {
  normal: 200,
  priority: 500,
  asap: 1000,
  currency: 'EUR'
}

// Default content filters
export const DEFAULT_CONTENT_FILTERS: ContentFilters = {
  enabled: false,
  block_explicit: false,
  blocked_artists: []
}

export interface Session {
  id: string
  venue_id: string
  dj_id: string
  status: 'active' | 'paused' | 'ended'
  started_at: string
  ended_at: string | null
}

export interface Request {
  id: string
  session_id: string
  song_title: string
  song_artist: string | null
  spotify_track_id: string | null
  tier: 'normal' | 'priority' | 'asap'
  message: string | null
  amount: number
  status: 'pending' | 'accepted' | 'rejected' | 'played'
  customer_id: string | null
  created_at: string
  updated_at: string
}

export interface RequestCreate {
  session_id: string
  song_title: string
  song_artist?: string
  spotify_track_id?: string
  tier: 'normal' | 'priority' | 'asap'
  message?: string
  amount: number
  customer_id?: string
}

export interface DJ {
  id: string
  user_id: string | null
  name: string
  email: string
  stripe_account_id: string | null
  created_at: string
  updated_at: string
}

export interface SpotifyTrack {
  id: string
  name: string
  artists: string[]
  album: string
  image_url: string | null
  duration_ms: number
  explicit: boolean
}

export interface SessionWithVenue extends Session {
  venues: Venue
}

// API functions
export const api = {
  // Venues
  getVenue: (slug: string) => request<Venue>(`/venues/${slug}`),
  getActiveSession: (slug: string) => request<Session | null>(`/venues/${slug}/active-session`),
  updateVenue: (venueId: string, data: VenueUpdate) =>
    request<Venue>(`/venues/${venueId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Requests
  createRequest: (data: RequestCreate) =>
    request<Request>('/requests/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getRequest: (requestId: string) => request<Request>(`/requests/${requestId}`),
  getSessionRequests: (sessionId: string) => request<Request[]>(`/requests/session/${sessionId}`),
  updateRequest: (requestId: string, status: Request['status']) =>
    request<Request>(`/requests/${requestId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // DJs
  createDJ: (data: { name: string; email: string }) =>
    request<DJ>('/djs/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getDJByEmail: (email: string) => request<DJ>(`/djs/by-email/${email}`),
  getDJ: (djId: string) => request<DJ>(`/djs/${djId}`),
  getDJVenues: (djId: string) => request<Venue[]>(`/djs/${djId}/venues`),
  getDJActiveSession: (djId: string) => request<SessionWithVenue | null>(`/djs/${djId}/active-session`),
  createDJVenue: (djId: string, venue: VenueCreate) =>
    request<Venue>(`/djs/${djId}/venues`, {
      method: 'POST',
      body: JSON.stringify(venue),
    }),

  // Sessions
  createSession: (venueId: string, djId: string) =>
    request<Session>('/sessions/', {
      method: 'POST',
      body: JSON.stringify({ venue_id: venueId, dj_id: djId }),
    }),
  updateSession: (sessionId: string, status: Session['status']) =>
    request<Session>(`/sessions/${sessionId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // Payments
  getStripeConfig: () => request<{ publishable_key: string }>('/payments/config'),
  createPaymentIntent: (data: {
    session_id: string
    song_title: string
    song_artist?: string
    spotify_track_id?: string
    explicit?: boolean
    message?: string
    tier: 'normal' | 'priority' | 'asap'
    amount: number
  }) =>
    request<{ client_secret: string; payment_intent_id: string }>('/payments/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  confirmPayment: (paymentIntentId: string) =>
    request<{ success: boolean; request: Request }>(`/payments/confirm-payment/${paymentIntentId}`, {
      method: 'POST',
    }),

  // Stripe Connect
  connect: {
    startOnboard: (djId: string, returnUrl: string, refreshUrl: string) =>
      request<{ onboarding_url: string; account_id: string }>(`/connect/${djId}/onboard`, {
        method: 'POST',
        body: JSON.stringify({ return_url: returnUrl, refresh_url: refreshUrl }),
      }),
    getStatus: (djId: string) =>
      request<{
        connected: boolean
        details_submitted: boolean
        charges_enabled: boolean
        payouts_enabled: boolean
        account_id: string | null
      }>(`/connect/${djId}/status`),
    getDashboard: (djId: string) =>
      request<{ dashboard_url: string }>(`/connect/${djId}/dashboard`),
  },

  // Spotify
  spotify: {
    search: (query: string, limit: number = 10) =>
      request<SpotifyTrack[]>(`/spotify/search?q=${encodeURIComponent(query)}&limit=${limit}`),
    getTrack: (trackId: string) =>
      request<SpotifyTrack>(`/spotify/track/${trackId}`),
  },
}
