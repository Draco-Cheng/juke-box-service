import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Radio, Zap } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { api, Venue, SessionWithVenue, DEFAULT_PRICING } from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'

export default function DJGoLivePage() {
  const navigate = useNavigate()
  const { dj, loading: authLoading } = useAuth()
  const [venues, setVenues] = useState<Venue[]>([])
  const [activeSession, setActiveSession] = useState<SessionWithVenue | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedVenueId, setSelectedVenueId] = useState<string>('')
  const [toggling, setToggling] = useState(false)

  // Min price in EUR (whole euros), default 2
  const [minPrice, setMinPrice] = useState(2)

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !dj) {
      navigate('/dj')
    }
  }, [authLoading, dj, navigate])

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

      // Pre-select venue if only one exists
      if (venuesData.length === 1 && !sessionData) {
        setSelectedVenueId(venuesData[0].id)
      }

      // If active session, load its venue's min price
      if (sessionData?.venues) {
        const pricing = sessionData.venues.settings?.pricing ?? DEFAULT_PRICING
        setMinPrice(Math.round(pricing.normal / 100))
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }, [dj])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleGoLive = async () => {
    if (!dj || !selectedVenueId) return

    setToggling(true)
    try {
      await api.createSession(selectedVenueId, dj.id)
      const sessionData = await api.getDJActiveSession(dj.id)
      setActiveSession(sessionData)
    } catch (error) {
      console.error('Failed to start session:', error)
    } finally {
      setToggling(false)
    }
  }

  const handleStopSession = async () => {
    if (!activeSession) return

    setToggling(true)
    try {
      await api.updateSession(activeSession.id, 'ended')
      setActiveSession(null)
    } catch (error) {
      console.error('Failed to end session:', error)
    } finally {
      setToggling(false)
    }
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const isLive = !!activeSession
  const currency = '€'

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-md px-4 pb-24 pt-6 flex flex-col gap-6">

        {/* Status indicator */}
        <div className="flex flex-col items-center gap-6 py-8">
          <div
            className={`flex h-32 w-32 items-center justify-center rounded-full transition-colors ${
              isLive ? 'bg-primary/20 animate-pulse-live' : 'bg-secondary'
            }`}
          >
            <div
              className={`flex h-24 w-24 items-center justify-center rounded-full transition-colors ${
                isLive ? 'bg-primary/30' : 'bg-secondary'
              }`}
            >
              <Radio
                className={`h-12 w-12 transition-colors ${
                  isLive ? 'text-primary' : 'text-muted-foreground'
                }`}
              />
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-lg font-bold text-foreground">
              {isLive ? 'You are LIVE' : 'Go Live'}
            </span>
            <p className="text-sm text-muted-foreground text-center">
              {isLive
                ? 'Listeners can see you and send song requests'
                : 'Set your preferences and start receiving requests'}
            </p>
            {isLive && activeSession?.venues && (
              <p className="text-xs text-primary font-medium mt-1">
                @ {activeSession.venues.name}
              </p>
            )}
          </div>
        </div>

        {/* Venue selector — only when offline */}
        {!isLive && (
          <div className="flex flex-col gap-2 rounded-xl bg-card p-4">
            <label htmlFor="venue-select" className="text-sm font-medium text-foreground">
              Venue
            </label>
            {venues.length === 0 ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">No venues yet.</p>
                <button
                  onClick={() => navigate('/dj/dashboard')}
                  className="text-sm text-primary hover:underline"
                  type="button"
                >
                  Create a venue in Dashboard
                </button>
              </div>
            ) : (
              <select
                id="venue-select"
                value={selectedVenueId}
                onChange={(e) => setSelectedVenueId(e.target.value)}
                className="w-full rounded-xl bg-secondary border border-border px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select a venue</option>
                {venues.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Min price slider */}
        <div className="flex flex-col gap-3 rounded-xl bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Minimum Request Price</span>
            <span className="font-mono font-bold text-primary">{currency}{minPrice}</span>
          </div>
          <Slider
            value={[minPrice]}
            onValueChange={(val: number[]) => setMinPrice(val[0])}
            min={1}
            max={50}
            step={1}
            disabled={isLive}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{currency}1</span>
            <span>{currency}50</span>
          </div>
        </div>

        {/* Toggle button */}
        <button
          onClick={isLive ? handleStopSession : handleGoLive}
          disabled={toggling || (!isLive && !selectedVenueId)}
          className={`flex h-16 w-full items-center justify-center gap-2 rounded-xl text-lg font-bold transition-colors disabled:opacity-50 ${
            isLive
              ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          }`}
          type="button"
        >
          {toggling ? (
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : isLive ? (
            'Stop Session'
          ) : (
            <>
              <Zap className="h-5 w-5" />
              GO LIVE
            </>
          )}
        </button>
      </div>
    </div>
  )
}
