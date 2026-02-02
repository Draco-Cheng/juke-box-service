import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, DJ, Venue, Request, SessionWithVenue, DEFAULT_PRICING } from '../../lib/api'
import { useRequestsRealtime } from '../../hooks/useRequestsRealtime'

// Helper to get pricing from venue settings with defaults
function getVenuePricing(venue: Venue) {
  return venue.settings?.pricing ?? DEFAULT_PRICING
}

const TIER_COLORS = {
  asap: 'bg-red-600',
  priority: 'bg-yellow-500',
  normal: 'bg-gray-600',
}

const TIER_LABELS = {
  asap: 'ASAP',
  priority: 'Priority',
  normal: 'Normal',
}

const STATUS_COLORS = {
  pending: 'bg-blue-600',
  accepted: 'bg-green-600',
  rejected: 'bg-red-600',
  played: 'bg-purple-600',
}

interface ConnectStatus {
  connected: boolean
  details_submitted: boolean
  charges_enabled: boolean
  payouts_enabled: boolean
  account_id: string | null
}

export default function DJDashboardPage() {
  const navigate = useNavigate()
  const [dj, setDJ] = useState<DJ | null>(null)
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
  const [newVenueName, setNewVenueName] = useState('')
  const [newVenueSlug, setNewVenueSlug] = useState('')
  const [editPricing, setEditPricing] = useState({ normal: 200, priority: 500, asap: 1000 })
  const [venueLoading, setVenueLoading] = useState(false)

  // Realtime subscription for requests
  const {
    requests,
    isRealtime,
    refetch: refetchRequests,
  } = useRequestsRealtime({
    sessionId: activeSession?.id ?? null,
  })

  // Load DJ from localStorage
  useEffect(() => {
    const storedDJ = localStorage.getItem('dj')
    if (!storedDJ) {
      navigate('/dj')
      return
    }
    setDJ(JSON.parse(storedDJ))
  }, [navigate])

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
    if (!dj) return

    try {
      const [venuesData, sessionData] = await Promise.all([
        api.getDJVenues(dj.id),
        api.getDJActiveSession(dj.id),
      ])
      setVenues(venuesData)
      setActiveSession(sessionData)

      // Fetch Connect status
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
      const session = await api.createSession(selectedVenueId, dj.id)
      // Refetch to get session with venue
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
      // Realtime subscription will automatically update the UI
    } catch (error) {
      console.error('Failed to update request:', error)
      // Refetch on error to ensure consistency
      refetchRequests()
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('dj')
    navigate('/dj')
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
  }

  const handleSaveVenue = async () => {
    if (!editingVenue) return

    setVenueLoading(true)
    try {
      const updated = await api.updateVenue(editingVenue.id, {
        settings: {
          pricing: {
            ...editPricing,
            currency: 'EUR'
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

  const handleDownloadQR = async (venue: Venue) => {
    const qrUrl = api.getVenueQR(venue.id)
    // Open QR in new tab for download
    window.open(qrUrl, '_blank')
  }

  // Handle Stripe Connect onboarding
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
      // Redirect to Stripe onboarding
      window.location.href = result.onboarding_url
    } catch (error) {
      console.error('Failed to start onboarding:', error)
      setConnectLoading(false)
    }
  }

  // Handle Stripe Dashboard link
  const handleViewDashboard = async () => {
    if (!dj) return
    try {
      const result = await api.connect.getDashboard(dj.id)
      window.open(result.dashboard_url, '_blank')
    } catch (error) {
      console.error('Failed to get dashboard link:', error)
    }
  }

  // Handle connect return URL parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const connectParam = searchParams.get('connect')
    if (connectParam === 'success' || connectParam === 'refresh') {
      // Clean URL
      window.history.replaceState({}, '', '/dj/dashboard')
      // Refresh connect status
      if (dj) {
        fetchConnectStatus()
      }
    }
  }, [dj, fetchConnectStatus])

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  const pendingRequests = requests.filter(r => r.status === 'pending' || r.status === 'accepted')
  const playedRequests = requests.filter(r => r.status === 'played')

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">{dj?.name || 'DJ Dashboard'}</h1>
            {activeSession && (
              <p className="text-sm text-gray-400">
                @ {activeSession.venues?.name || 'Unknown Venue'}
              </p>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-white text-sm"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        {/* Stripe Connect Status */}
        {connectStatus && !connectStatus.charges_enabled && (
          <div className={`rounded-lg p-4 mb-6 ${
            connectStatus.connected
              ? 'bg-orange-900/50 border border-orange-600'
              : 'bg-yellow-900/50 border border-yellow-600'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">
                  {connectStatus.connected
                    ? 'Complete your Stripe setup'
                    : 'Set up Stripe to receive payouts'}
                </p>
                <p className="text-sm text-gray-400">
                  {connectStatus.connected
                    ? 'Finish setting up your account to start receiving payments'
                    : 'Connect your bank account to receive money from song requests'}
                </p>
              </div>
              <button
                onClick={handleConnectOnboard}
                disabled={connectLoading}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg font-semibold text-sm transition whitespace-nowrap"
              >
                {connectLoading ? 'Loading...' : connectStatus.connected ? 'Complete Setup' : 'Connect Stripe'}
              </button>
            </div>
          </div>
        )}

        {connectStatus?.charges_enabled && (
          <div className="bg-green-900/50 border border-green-600 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <p className="font-semibold text-green-300">Stripe Connected</p>
              </div>
              <button
                onClick={handleViewDashboard}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition"
              >
                View Stripe Dashboard
              </button>
            </div>
          </div>
        )}
        {/* No active session - Start Session UI */}
        {!activeSession && (
          <div className="bg-gray-900 rounded-lg p-6 text-center mb-6">
            <h2 className="text-xl font-semibold mb-4">Start a Session</h2>

            {venues.length === 0 ? (
              <p className="text-gray-400">No venues available. Create one below!</p>
            ) : (
              <div className="space-y-4">
                <select
                  value={selectedVenueId}
                  onChange={(e) => setSelectedVenueId(e.target.value)}
                  className="w-full max-w-xs px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg"
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
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-semibold transition"
                >
                  Start Session
                </button>
              </div>
            )}
          </div>
        )}

        {/* Venue Management Section */}
        {!activeSession && (
          <div className="bg-gray-900 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">My Venues</h2>
              <button
                onClick={() => setShowVenueManager(!showVenueManager)}
                className="text-gray-400 hover:text-white text-sm"
              >
                {showVenueManager ? 'Hide' : 'Manage'}
              </button>
            </div>

            {showVenueManager && (
              <div className="space-y-4">
                {/* Venue List */}
                {venues.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No venues yet</p>
                ) : (
                  <div className="space-y-3">
                    {venues.map((venue) => {
                      const pricing = getVenuePricing(venue)
                      return (
                        <div key={venue.id} className="bg-gray-800 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-semibold">{venue.name}</p>
                              <p className="text-gray-400 text-sm">/{venue.slug}</p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditVenue(venue)}
                                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm transition"
                              >
                                Edit Pricing
                              </button>
                              <button
                                onClick={() => handleDownloadQR(venue)}
                                className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm transition"
                              >
                                QR Code
                              </button>
                            </div>
                          </div>
                          <div className="flex gap-4 text-sm text-gray-400">
                            <span>Normal: {pricing.currency === 'EUR' ? '€' : pricing.currency}{(pricing.normal / 100).toFixed(0)}</span>
                            <span>Priority: {pricing.currency === 'EUR' ? '€' : pricing.currency}{(pricing.priority / 100).toFixed(0)}</span>
                            <span>ASAP: {pricing.currency === 'EUR' ? '€' : pricing.currency}{(pricing.asap / 100).toFixed(0)}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Create New Venue Button */}
                {!showCreateVenue ? (
                  <button
                    onClick={() => setShowCreateVenue(true)}
                    className="w-full py-3 border-2 border-dashed border-gray-700 hover:border-gray-600 rounded-lg text-gray-400 hover:text-white transition"
                  >
                    + Add New Venue
                  </button>
                ) : (
                  <form onSubmit={handleCreateVenue} className="bg-gray-800 rounded-lg p-4 space-y-3">
                    <h3 className="font-semibold">Create New Venue</h3>
                    <input
                      type="text"
                      placeholder="Venue Name"
                      value={newVenueName}
                      onChange={(e) => setNewVenueName(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg"
                      required
                    />
                    <input
                      type="text"
                      placeholder="URL Slug (e.g. my-club)"
                      value={newVenueSlug}
                      onChange={(e) => setNewVenueSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg"
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
                        className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={venueLoading || !newVenueName.trim() || !newVenueSlug.trim()}
                        className="flex-1 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-semibold transition"
                      >
                        {venueLoading ? 'Creating...' : 'Create'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        )}

        {/* Edit Pricing Modal */}
        {editingVenue && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-semibold mb-4">Edit Pricing - {editingVenue.name}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Normal Tier (cents)</label>
                  <input
                    type="number"
                    value={editPricing.normal}
                    onChange={(e) => setEditPricing({ ...editPricing, normal: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                    min="0"
                    step="50"
                  />
                  <p className="text-xs text-gray-500 mt-1">= €{(editPricing.normal / 100).toFixed(2)}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Priority Tier (cents)</label>
                  <input
                    type="number"
                    value={editPricing.priority}
                    onChange={(e) => setEditPricing({ ...editPricing, priority: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                    min="0"
                    step="50"
                  />
                  <p className="text-xs text-gray-500 mt-1">= €{(editPricing.priority / 100).toFixed(2)}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">ASAP Tier (cents)</label>
                  <input
                    type="number"
                    value={editPricing.asap}
                    onChange={(e) => setEditPricing({ ...editPricing, asap: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                    min="0"
                    step="50"
                  />
                  <p className="text-xs text-gray-500 mt-1">= €{(editPricing.asap / 100).toFixed(2)}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setEditingVenue(null)}
                  className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveVenue}
                  disabled={venueLoading}
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg font-semibold transition"
                >
                  {venueLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Active session */}
        {activeSession && (
          <>
            {/* Session Controls */}
            <div className="flex gap-3 mb-6">
              <button
                onClick={handlePauseSession}
                className={`flex-1 py-3 rounded-lg font-semibold transition ${
                  activeSession.status === 'paused'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-yellow-600 hover:bg-yellow-700'
                }`}
              >
                {activeSession.status === 'paused' ? 'Resume Requests' : 'Pause Requests'}
              </button>
              <button
                onClick={handleEndSession}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition"
              >
                End Session
              </button>
            </div>

            {activeSession.status === 'paused' && (
              <div className="bg-yellow-900/50 border border-yellow-600 rounded-lg p-4 mb-6 text-center">
                <p className="text-yellow-300 font-semibold">Requests are paused</p>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-900 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold">{pendingRequests.length}</p>
                <p className="text-sm text-gray-400">Queue</p>
              </div>
              <div className="bg-gray-900 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold">{playedRequests.length}</p>
                <p className="text-sm text-gray-400">Played</p>
              </div>
              <div className="bg-gray-900 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold">
                  €{(requests.reduce((sum, r) => sum + r.amount, 0) / 100).toFixed(0)}
                </p>
                <p className="text-sm text-gray-400">Earnings</p>
              </div>
            </div>

            {/* Request Queue */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Request Queue</h2>

              {pendingRequests.length === 0 ? (
                <div className="bg-gray-900 rounded-lg p-8 text-center">
                  <p className="text-gray-500">No pending requests</p>
                  <p className="text-gray-600 text-sm mt-1">
                    Share the QR code to get requests!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map((request) => (
                    <div
                      key={request.id}
                      className="bg-gray-900 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-semibold">{request.song_title}</p>
                          {request.song_artist && (
                            <p className="text-gray-400 text-sm">{request.song_artist}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`${TIER_COLORS[request.tier]} px-2 py-0.5 rounded text-xs font-semibold`}>
                            {TIER_LABELS[request.tier]}
                          </span>
                          <span className="text-green-400 font-semibold">
                            €{(request.amount / 100).toFixed(0)}
                          </span>
                        </div>
                      </div>

                      {request.message && (
                        <p className="text-gray-400 text-sm mb-3 italic">"{request.message}"</p>
                      )}

                      <div className="flex gap-2">
                        {request.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleRequestAction(request.id, 'accepted')}
                              className="flex-1 py-2 bg-green-600 hover:bg-green-700 rounded font-semibold text-sm transition"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleRequestAction(request.id, 'rejected')}
                              className="py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded font-semibold text-sm transition"
                            >
                              Skip
                            </button>
                          </>
                        )}
                        {request.status === 'accepted' && (
                          <button
                            onClick={() => handleRequestAction(request.id, 'played')}
                            className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 rounded font-semibold text-sm transition"
                          >
                            Mark as Played
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Played Requests */}
            {playedRequests.length > 0 && (
              <div className="mt-8 space-y-4">
                <h2 className="text-lg font-semibold text-gray-400">Played</h2>
                <div className="space-y-2">
                  {playedRequests.map((request) => (
                    <div
                      key={request.id}
                      className="bg-gray-900/50 rounded-lg p-3 flex justify-between items-center"
                    >
                      <div>
                        <p className="text-gray-400">{request.song_title}</p>
                        {request.song_artist && (
                          <p className="text-gray-500 text-sm">{request.song_artist}</p>
                        )}
                      </div>
                      <span className="text-purple-400 text-sm">✓ Played</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
