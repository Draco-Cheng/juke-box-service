const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(error.detail || 'Request failed')
  }

  return res.json()
}

// Types
export interface Venue {
  id: string
  name: string
  slug: string
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
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
}

export interface SessionWithVenue extends Session {
  venues: Venue
}

// API functions
export const api = {
  // Venues
  getVenue: (slug: string) => request<Venue>(`/venues/${slug}`),
  getActiveSession: (slug: string) => request<Session | null>(`/venues/${slug}/active-session`),

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
  getDJByEmail: (email: string) => request<DJ>(`/djs/by-email/${email}`),
  getDJ: (djId: string) => request<DJ>(`/djs/${djId}`),
  getDJVenues: (djId: string) => request<Venue[]>(`/djs/${djId}/venues`),
  getDJActiveSession: (djId: string) => request<SessionWithVenue | null>(`/djs/${djId}/active-session`),

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
