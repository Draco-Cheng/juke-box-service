'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { Check, X, Play, Disc3, DollarSign, Clock, Zap, ArrowLeft, Settings, LogOut, User, QrCode, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { api, Venue, Request, SessionWithVenue, DEFAULT_PRICING, DEFAULT_CONTENT_FILTERS, ContentFilters } from '../../lib/api'
import { useRequestsRealtime } from '../../hooks/useRequestsRealtime'
import { useAuth } from '../../contexts/AuthContext'

// Helper to get pricing from venue settings with defaults
function getVenuePricing(venue: Venue) {
  return venue.settings?.pricing ?? DEFAULT_PRICING
}

interface ConnectStatus {
  connected: boolean
  details_submitted: boolean
  charges_enabled: boolean
  payouts_enabled: boolean
  account_id: string | null
}

export default function DJDashboardPage() {
  const router = useRouter()
  const { dj, loading: authLoading, signOut } = useAuth()
  const [venues, setVenues] = useState<Venue[]>([])
  const [activeSession, setActiveSession] = useState<SessionWithVenue | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedVenueId, setSelectedVenueId] = useState<string>('')
  const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null)
  const [connectLoading, setConnectLoading] = useState(false)

  // Venue management state
  const [showVenueManager, setShowVenueManager] = useState(false)
  const [showCreateVenue, setShowCreateVenue] = useState(false)
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null)
  const [qrVenue, setQrVenue] = useState<Venue | null>(null)
  const [newVenueName, setNewVenueName] = useState('')
  const [newVenueSlug, setNewVenueSlug] = useState('')
  const [editPricing, setEditPricing] = useState({ normal: 200, priority: 500, asap: 1000 })
  const [editContentFilters, setEditContentFilters] = useState<ContentFilters>(DEFAULT_CONTENT_FILTERS)
  const [blockedArtistsInput, setBlockedArtistsInput] = useState('')
  const [venueLoading, setVenueLoading] = useState(false)

  // DJ Profile state
  const [showProfileEditor, setShowProfileEditor] = useState(false)
  const [profileGenres, setProfileGenres] = useState<string[]>([])
  const [profileImage, setProfileImage] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)

  // Realtime subscription for requests
  const {
    requests,
    refetch: refetchRequests,
  } = useRequestsRealtime({
    sessionId: activeSession?.id ?? null,
  })

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !dj) {
      router.push('/dj')
    }
  }, [authLoading, dj, router])

  // Fetch Connect status
  const fetchConnectStatus = useCallback(async () => {
    if (!dj) return
    try {
      const status = await api.connect.getStatus(dj.id)
      setConnectStatus(status)
    } catch (error) {
      console.error('Failed to fetch connect status:', error)
    }
  }, [dj])

  // Fetch DJ data
  const fetchData = useCallback(async () => {
    if (!dj) {
      setLoading(false)
      return
    }

    try {
      const [venuesData, sessionData] = await Promise.all([
        api.getDJVenues(dj.id),
        api.getDJActiveSession(dj.id),
      ])
      setVenues(venuesData)
      setActiveSession(sessionData)

      await fetchConnectStatus()
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }, [dj, fetchConnectStatus])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleStartSession = async () => {
    if (!dj || !selectedVenueId) return

    try {
      await api.createSession(selectedVenueId, dj.id)
      const sessionData = await api.getDJActiveSession(dj.id)
      setActiveSession(sessionData)
    } catch (error) {
      console.error('Failed to start session:', error)
    }
  }

  const handleEndSession = async () => {
    if (!activeSession) return
    if (!confirm('End this session? All pending requests will remain.')) return

    try {
      await api.updateSession(activeSession.id, 'ended')
      setActiveSession(null)
    } catch (error) {
      console.error('Failed to end session:', error)
    }
  }

  const handlePauseSession = async () => {
    if (!activeSession) return

    const newStatus = activeSession.status === 'paused' ? 'active' : 'paused'
    try {
      await api.updateSession(activeSession.id, newStatus)
      setActiveSession({ ...activeSession, status: newStatus })
    } catch (error) {
      console.error('Failed to update session:', error)
    }
  }

  const handleRequestAction = async (requestId: string, status: Request['status']) => {
    try {
      await api.updateRequest(requestId, status)
      // Always refetch after action — don't rely solely on Realtime
      // (Realtime may also fire, but refetch ensures immediate UI update)
      await refetchRequests()
    } catch (error) {
      console.error('Failed to update request:', error)
      refetchRequests()
    }
  }

  const handleLogout = async () => {
    await signOut()
    router.push('/dj')
  }

  // Venue management handlers
  const handleCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dj || !newVenueName.trim() || !newVenueSlug.trim()) return

    setVenueLoading(true)
    try {
      const venue = await api.createDJVenue(dj.id, {
        name: newVenueName.trim(),
        slug: newVenueSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        settings: {
          pricing: { ...DEFAULT_PRICING }
        }
      })
      setVenues([...venues, venue])
      setNewVenueName('')
      setNewVenueSlug('')
      setShowCreateVenue(false)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create venue')
    } finally {
      setVenueLoading(false)
    }
  }

  const handleEditVenue = (venue: Venue) => {
    setEditingVenue(venue)
    const pricing = getVenuePricing(venue)
    setEditPricing({
      normal: pricing.normal,
      priority: pricing.priority,
      asap: pricing.asap
    })
    const filters = venue.settings?.content_filters ?? DEFAULT_CONTENT_FILTERS
    setEditContentFilters(filters)
    setBlockedArtistsInput(filters.blocked_artists.join(', '))
  }

  const handleSaveVenue = async () => {
    if (!editingVenue) return

    setVenueLoading(true)
    try {
      const blockedArtists = blockedArtistsInput
        .split(',')
        .map(a => a.trim())
        .filter(a => a.length > 0)

      const updated = await api.updateVenue(editingVenue.id, {
        settings: {
          pricing: {
            ...editPricing,
            currency: 'EUR'
          },
          content_filters: {
            ...editContentFilters,
            blocked_artists: blockedArtists
          }
        }
      })
      setVenues(venues.map(v => v.id === updated.id ? updated : v))
      setEditingVenue(null)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update venue')
    } finally {
      setVenueLoading(false)
    }
  }

  const handleEditProfile = () => {
    if (dj) {
      setProfileGenres(dj.genres || [])
      setProfileImage(dj.profile_image || '')
      setShowProfileEditor(true)
    }
  }

  const handleSaveProfile = async () => {
    if (!dj) return
    setProfileLoading(true)
    try {
      await api.updateDJProfile(dj.id, {
        genres: profileGenres,
        profile_image: profileImage.trim() || undefined,
      })
      setShowProfileEditor(false)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update profile')
    } finally {
      setProfileLoading(false)
    }
  }

  const AVAILABLE_GENRES = [
    'House', 'Deep House', 'Techno', 'Electronic', 'Hip-Hop', 'R&B',
    'Drum & Bass', 'Jungle', 'Disco', 'Funk', 'Pop', 'Rock',
    'Jazz', 'Latin', 'Reggaeton',
  ]

  const toggleGenre = (genre: string) => {
    setProfileGenres(prev =>
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    )
  }

  const handleShowQR = (venue: Venue) => {
    setQrVenue(venue)
  }

  const handleDownloadQR = () => {
    if (!qrVenue) return
    const svg = document.getElementById('venue-qr-svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([svgData], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = `${qrVenue.slug}-qr.svg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleConnectOnboard = async () => {
    if (!dj) return
    setConnectLoading(true)
    try {
      const baseUrl = window.location.origin
      const result = await api.connect.startOnboard(
        dj.id,
        `${baseUrl}/dj/dashboard?connect=success`,
        `${baseUrl}/dj/dashboard?connect=refresh`
      )
      window.location.href = result.onboarding_url
    } catch (error) {
      console.error('Failed to start onboarding:', error)
      setConnectLoading(false)
    }
  }

  const handleViewDashboard = async () => {
    if (!dj) return
    try {
      const result = await api.connect.getDashboard(dj.id)
      window.open(result.dashboard_url, '_blank')
    } catch (error) {
      console.error('Failed to get dashboard link:', error)
    }
  }

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const connectParam = searchParams.get('connect')
    if (connectParam === 'success' || connectParam === 'refresh') {
      window.history.replaceState({}, '', '/dj/dashboard')
      if (dj) {
        fetchConnectStatus()
      }
    }
  }, [dj, fetchConnectStatus])

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const pendingRequests = requests.filter(r => r.status === 'pending')
  const acceptedRequests = requests.filter(r => r.status === 'accepted')
  const playedRequests = requests.filter(r => r.status === 'played')
  const totalEarnings = playedRequests.reduce((sum, r) => sum + r.amount, 0)
  const pendingEarnings = [...pendingRequests, ...acceptedRequests].reduce((sum, r) => sum + r.amount, 0)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-md px-4 pb-20">
        {/* Header */}
        <header className="flex items-center justify-between pt-6 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="flex items-center justify-center rounded-lg p-1 text-muted-foreground hover:text-foreground transition-colors"
              type="button"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-foreground">{dj?.name || 'DJ Dashboard'}</h1>
              {activeSession && (
                <p className="text-sm text-muted-foreground">
                  @ {activeSession.venues?.name || 'Unknown Venue'}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleEditProfile}
              className="flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:text-foreground transition-colors"
              type="button"
              title="Profile"
            >
              <User className="h-4 w-4" />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:text-foreground transition-colors"
              type="button"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Stripe Connect Status */}
        {connectStatus && !connectStatus.charges_enabled && (
          <div className="rounded-xl bg-accent/10 border border-accent/30 p-4 mb-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {connectStatus.connected
                    ? 'Complete your Stripe setup'
                    : 'Set up Stripe to receive payouts'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {connectStatus.connected
                    ? 'Finish setting up your account to start receiving payments'
                    : 'Connect your bank account to receive money from song requests'}
                </p>
              </div>
              <button
                onClick={handleConnectOnboard}
                disabled={connectLoading}
                className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                type="button"
              >
                {connectLoading ? 'Loading...' : connectStatus.connected ? 'Complete Setup' : 'Connect Stripe'}
              </button>
            </div>
          </div>
        )}

        {connectStatus?.charges_enabled && (
          <div className="rounded-xl bg-primary/10 border border-primary/30 p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-primary">Stripe Connected</p>
              </div>
              <button
                onClick={handleViewDashboard}
                className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors"
                type="button"
              >
                View Dashboard
              </button>
            </div>
          </div>
        )}

        {/* No Active Session — Offline + Start Session + Venues */}
        {!activeSession && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
                <Zap className="h-10 w-10 text-muted-foreground" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-lg font-bold text-foreground">You are offline</p>
                <p className="text-sm text-muted-foreground">
                  Start a session to receive song requests
                </p>
              </div>

              {venues.length === 0 ? (
                <p className="text-sm text-muted-foreground">Create a venue first!</p>
              ) : (
                <div className="flex flex-col items-center gap-3 w-full max-w-xs">
                  <select
                    value={selectedVenueId}
                    onChange={(e) => setSelectedVenueId(e.target.value)}
                    className="w-full rounded-xl bg-card border border-border px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select a venue</option>
                    {venues.map((venue) => (
                      <option key={venue.id} value={venue.id}>
                        {venue.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleStartSession}
                    disabled={!selectedVenueId}
                    className="w-full rounded-xl bg-primary px-8 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                    type="button"
                  >
                    Go Live
                  </button>
                </div>
              )}
            </div>

            {/* Venue Management */}
            <div className="rounded-xl bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">My Venues</h2>
                <button
                  onClick={() => setShowVenueManager(!showVenueManager)}
                  className="text-xs text-primary hover:text-primary/80 transition-colors"
                  type="button"
                >
                  {showVenueManager ? 'Hide' : 'Manage'}
                </button>
              </div>

              {showVenueManager && (
                <div className="flex flex-col gap-3">
                  {venues.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No venues yet</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {venues.map((venue) => {
                        const pricing = getVenuePricing(venue)
                        const currency = pricing.currency === 'EUR' ? '€' : pricing.currency
                        return (
                          <div key={venue.id} className="rounded-lg bg-secondary p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="text-sm font-medium text-foreground">{venue.name}</p>
                                <p className="text-xs text-muted-foreground">/{venue.slug}</p>
                              </div>
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => handleEditVenue(venue)}
                                  className="flex items-center justify-center rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
                                  type="button"
                                  title="Settings"
                                >
                                  <Settings className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleShowQR(venue)}
                                  className="flex items-center justify-center rounded-lg p-1.5 text-primary hover:text-primary/80 hover:bg-card transition-colors"
                                  type="button"
                                  title="QR Code"
                                >
                                  <QrCode className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                            <div className="flex gap-3 text-xs text-muted-foreground">
                              <span>Min: {currency}{(pricing.normal / 100).toFixed(0)}</span>
                              <span>Priority: {currency}{(pricing.priority / 100).toFixed(0)}</span>
                              <span>ASAP: {currency}{(pricing.asap / 100).toFixed(0)}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {!showCreateVenue ? (
                    <button
                      onClick={() => setShowCreateVenue(true)}
                      className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors"
                      type="button"
                    >
                      <Plus className="h-4 w-4" />
                      Add New Venue
                    </button>
                  ) : (
                    <form onSubmit={handleCreateVenue} className="rounded-lg bg-secondary p-4 flex flex-col gap-3">
                      <h3 className="text-sm font-semibold text-foreground">Create New Venue</h3>
                      <Input
                        type="text"
                        placeholder="Venue Name"
                        value={newVenueName}
                        onChange={(e) => setNewVenueName(e.target.value)}
                        className="h-11 rounded-xl bg-card border-border"
                        required
                      />
                      <Input
                        type="text"
                        placeholder="URL Slug (e.g. my-club)"
                        value={newVenueSlug}
                        onChange={(e) => setNewVenueSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                        className="h-11 rounded-xl bg-card border-border"
                        required
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowCreateVenue(false)
                            setNewVenueName('')
                            setNewVenueSlug('')
                          }}
                          className="flex-1 py-2.5 rounded-lg bg-card text-foreground font-medium hover:bg-card/80 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={venueLoading || !newVenueName.trim() || !newVenueSlug.trim()}
                          className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold transition-colors hover:bg-primary/90 disabled:opacity-50"
                        >
                          {venueLoading ? 'Creating...' : 'Create'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Edit Venue Settings Modal */}
        {editingVenue && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-card rounded-2xl p-6 w-full max-w-md my-8 border border-border">
              <h2 className="text-lg font-bold text-foreground mb-4">{editingVenue.name} — Settings</h2>

              <div className="mb-6">
                <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Pricing</h3>
                <div className="flex flex-col gap-3">
                  {(['normal', 'priority', 'asap'] as const).map((tier) => (
                    <div key={tier}>
                      <label className="block text-sm text-muted-foreground mb-1 capitalize">{tier} Tier (cents)</label>
                      <Input
                        type="number"
                        value={editPricing[tier]}
                        onChange={(e) => setEditPricing({ ...editPricing, [tier]: parseInt(e.target.value) || 0 })}
                        className="h-11 rounded-xl bg-secondary border-border"
                        min="0"
                        step="50"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">= €{(editPricing[tier] / 100).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-border pt-5">
                <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Content Filters</h3>
                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editContentFilters.enabled}
                      onChange={(e) => setEditContentFilters({ ...editContentFilters, enabled: e.target.checked })}
                      className="w-4 h-4 rounded bg-secondary border-border text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-foreground">Enable content filters</span>
                  </label>

                  {editContentFilters.enabled && (
                    <div className="pl-7 flex flex-col gap-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editContentFilters.block_explicit}
                          onChange={(e) => setEditContentFilters({ ...editContentFilters, block_explicit: e.target.checked })}
                          className="w-4 h-4 rounded bg-secondary border-border text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-foreground">Block explicit content</span>
                      </label>

                      <div>
                        <label className="block text-sm text-muted-foreground mb-1">Blocked artists</label>
                        <textarea
                          value={blockedArtistsInput}
                          onChange={(e) => setBlockedArtistsInput(e.target.value)}
                          placeholder="Artist 1, Artist 2, Artist 3..."
                          className="w-full rounded-xl bg-secondary border border-border px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
                          rows={2}
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">Comma-separated list</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setEditingVenue(null)}
                  className="flex-1 py-2.5 rounded-xl bg-secondary text-foreground font-medium hover:bg-secondary/80 transition-colors"
                  type="button"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveVenue}
                  disabled={venueLoading}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold transition-colors hover:bg-primary/90 disabled:opacity-50"
                  type="button"
                >
                  {venueLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* QR Code Modal */}
        {qrVenue && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-card rounded-2xl p-6 w-full max-w-sm text-center border border-border">
              <h2 className="text-lg font-bold text-foreground mb-1">{qrVenue.name}</h2>
              <p className="text-sm text-muted-foreground mb-4">Scan to request songs</p>

              <div className="bg-white p-4 rounded-xl inline-block mb-4">
                <QRCodeSVG
                  id="venue-qr-svg"
                  value={`${window.location.origin}/join/${qrVenue.slug}`}
                  size={200}
                  level="L"
                />
              </div>

              <p className="text-[10px] text-muted-foreground mb-4 break-all">
                {window.location.origin}/join/{qrVenue.slug}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => setQrVenue(null)}
                  className="flex-1 py-2.5 rounded-xl bg-secondary text-foreground font-medium hover:bg-secondary/80 transition-colors"
                  type="button"
                >
                  Close
                </button>
                <button
                  onClick={handleDownloadQR}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold transition-colors hover:bg-primary/90"
                  type="button"
                >
                  Download SVG
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Profile Editor Modal */}
        {showProfileEditor && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-card rounded-2xl p-6 w-full max-w-md my-8 border border-border">
              <h2 className="text-lg font-bold text-foreground mb-4">DJ Profile</h2>

              <div className="mb-6">
                <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Genres</h3>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_GENRES.map((genre) => (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => toggleGenre(genre)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                        profileGenres.includes(genre)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Profile Image URL</h3>
                <Input
                  type="url"
                  value={profileImage}
                  onChange={(e) => setProfileImage(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  className="h-11 rounded-xl bg-secondary border-border"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Paste a URL to your profile photo</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowProfileEditor(false)}
                  className="flex-1 py-2.5 rounded-xl bg-secondary text-foreground font-medium hover:bg-secondary/80 transition-colors"
                  type="button"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={profileLoading}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold transition-colors hover:bg-primary/90 disabled:opacity-50"
                  type="button"
                >
                  {profileLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Active Session — DJ Cockpit */}
        {activeSession && (
          <div className="flex flex-col gap-5">
            {/* Cockpit header with LIVE indicator + earnings */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <h2 className="text-lg font-bold text-foreground">DJ Cockpit</h2>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-pulse-live" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                  </span>
                  <span className="text-xs text-primary font-medium">LIVE</span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-mono text-lg font-bold text-primary">
                  €{(totalEarnings / 100).toFixed(0)}
                </span>
                <span className="text-[10px] text-muted-foreground">earned</span>
              </div>
            </div>

            {/* Quick stats row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center gap-1 rounded-xl bg-card p-3">
                <span className="font-mono text-xl font-bold text-accent">{pendingRequests.length}</span>
                <span className="text-[10px] text-muted-foreground">Pending</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-xl bg-card p-3">
                <span className="font-mono text-xl font-bold text-primary">{acceptedRequests.length}</span>
                <span className="text-[10px] text-muted-foreground">In Queue</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-xl bg-card p-3">
                <span className="font-mono text-xl font-bold text-foreground">
                  €{(pendingEarnings / 100).toFixed(0)}
                </span>
                <span className="text-[10px] text-muted-foreground">Potential</span>
              </div>
            </div>

            {/* Session Controls */}
            <div className="flex gap-2">
              <button
                onClick={handlePauseSession}
                className={cn(
                  'flex-1 py-3 rounded-xl font-semibold transition-colors',
                  activeSession.status === 'paused'
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-accent/10 text-accent hover:bg-accent/20'
                )}
                type="button"
              >
                {activeSession.status === 'paused' ? 'Resume Requests' : 'Pause Requests'}
              </button>
              <button
                onClick={handleEndSession}
                className="px-5 py-3 rounded-xl bg-destructive/10 text-destructive font-semibold hover:bg-destructive/20 transition-colors"
                type="button"
              >
                End
              </button>
            </div>

            {activeSession.status === 'paused' && (
              <div className="rounded-xl bg-accent/10 border border-accent/30 p-3 text-center">
                <p className="text-sm text-accent font-semibold">Requests are paused</p>
              </div>
            )}

            {/* Incoming Requests */}
            {pendingRequests.length > 0 && (
              <section className="flex flex-col gap-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-accent">
                  <Clock className="h-3.5 w-3.5" />
                  Incoming ({pendingRequests.length})
                </h2>
                <div className="flex flex-col gap-2">
                  {pendingRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-accent/20"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                          <Disc3 className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="text-sm font-medium text-foreground truncate">
                            {request.song_title}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            {request.song_artist}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-accent shrink-0">
                          €{(request.amount / 100).toFixed(0)}
                        </span>
                      </div>

                      {request.message && (
                        <p className="text-xs text-muted-foreground italic pl-[52px]">"{request.message}"</p>
                      )}

                      {/* Expiry warning */}
                      {(() => {
                        const ageMs = Date.now() - new Date(request.created_at).getTime()
                        const ageDays = ageMs / (1000 * 60 * 60 * 24)
                        if (ageDays > 5) {
                          return (
                            <div className="rounded-lg bg-accent/10 border border-accent/30 p-2">
                              <p className="text-xs text-accent">
                                Authorization expires soon. Play or skip this request.
                              </p>
                            </div>
                          )
                        }
                        return null
                      })()}

                      <div className="flex gap-2 pl-[52px]">
                        <button
                          onClick={() => handleRequestAction(request.id, 'rejected')}
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive transition-colors hover:bg-destructive/20"
                          type="button"
                          aria-label="Reject request"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleRequestAction(request.id, 'accepted')}
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors hover:bg-primary/20"
                          type="button"
                          aria-label="Accept request"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Accepted Queue */}
            {acceptedRequests.length > 0 && (
              <section className="flex flex-col gap-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-primary">
                  <Play className="h-3.5 w-3.5" />
                  Queue ({acceptedRequests.length})
                </h2>
                <div className="flex flex-col gap-2">
                  {acceptedRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center gap-3 rounded-xl bg-card p-4"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Disc3 className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-sm font-medium text-foreground truncate">
                          {request.song_title}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {request.song_artist} · €{(request.amount / 100).toFixed(0)}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRequestAction(request.id, 'played')}
                        className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 shrink-0"
                        type="button"
                      >
                        <DollarSign className="h-3 w-3" />
                        Mark Played
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Empty state when no requests */}
            {pendingRequests.length === 0 && acceptedRequests.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <Disc3 className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No requests right now. Keep the vibes going!
                </p>
              </div>
            )}

            {/* Played Requests */}
            {playedRequests.length > 0 && (
              <section className="flex flex-col gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Played ({playedRequests.length})
                </h2>
                <div className="flex flex-col gap-1">
                  {playedRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center gap-3 rounded-lg p-3"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                        <Check className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="text-sm text-muted-foreground truncate">{request.song_title}</span>
                        {request.song_artist && (
                          <span className="text-xs text-muted-foreground/60 truncate">{request.song_artist}</span>
                        )}
                      </div>
                      <span className="text-xs font-mono text-primary shrink-0">
                        €{(request.amount / 100).toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
