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
  getSessionRequests: (sessionId: string) => request<Request[]>(`/requests/session/${sessionId}`),
}
