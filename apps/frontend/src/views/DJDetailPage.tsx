'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Star, Users, MapPin, Radio, Shield } from 'lucide-react'
import { api, Venue, Session, LiveDJ } from '../lib/api'

export default function DJDetailPage() {
  const params = useParams()
  const venueSlug = params?.venueSlug as string | undefined
  const router = useRouter()
  const [venue, setVenue] = useState<Venue | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [liveDJ, setLiveDJ] = useState<LiveDJ | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!venueSlug) return

    async function loadData() {
      try {
        setLoading(true)

        // Fetch venue and active session in parallel
        const [venueData, sessionData] = await Promise.all([
          api.getVenue(venueSlug!),
          api.getActiveSession(venueSlug!),
        ])
        setVenue(venueData)
        setSession(sessionData)

        // Find the live DJ for this venue from the live DJs list
        const liveDJs = await api.getLiveDJs()
        const match = liveDJs.find((l) => l.venue.slug === venueSlug)
        if (match) setLiveDJ(match)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [venueSlug])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !venue) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-destructive">{error || 'Venue not found'}</p>
        <button
          onClick={() => router.push('/')}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          type="button"
        >
          Back to DJs
        </button>
      </div>
    )
  }

  const dj = liveDJ?.dj
  const currency =
    venue.settings?.pricing?.currency === 'EUR'
      ? '€'
      : venue.settings?.pricing?.currency || '€'
  const minPrice = liveDJ?.base_price ?? venue.settings?.pricing?.normal ?? 200

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-md px-4 pb-8">
        {/* Back button */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 pt-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
          type="button"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to DJs
        </button>

        <div className="flex flex-col gap-6 pt-6">
          {/* DJ Header */}
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-secondary">
              {dj?.profile_image ? (
                <img
                  src={dj.profile_image}
                  alt={dj.name}
                  className="h-24 w-24 rounded-full object-cover"
                />
              ) : (
                <Radio className="h-10 w-10 text-primary" />
              )}
              {session && (
                <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                  <span className="h-2 w-2 rounded-full bg-primary-foreground" />
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-bold text-foreground">
                {dj?.name ?? venue.name}
              </h1>
              {dj?.genres && dj.genres.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {dj.genres.join(' · ')}
                </p>
              )}
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex items-center justify-center gap-6 rounded-xl bg-card p-4">
            {dj && dj.rating > 0 && (
              <>
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1 text-accent">
                    <Star className="h-4 w-4" />
                    <span className="font-mono font-bold">
                      {dj.rating.toFixed(1)}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">Rating</span>
                </div>
                <div className="h-8 w-px bg-border" />
              </>
            )}
            {liveDJ && (
              <>
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1 text-foreground">
                    <Users className="h-4 w-4" />
                    <span className="font-mono font-bold">
                      {liveDJ.listener_count}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Listening
                  </span>
                </div>
                <div className="h-8 w-px bg-border" />
              </>
            )}
            <div className="flex flex-col items-center gap-1">
              <span className="font-mono font-bold text-primary">
                {currency}
                {(minPrice / 100).toFixed(0)}
              </span>
              <span className="text-xs text-muted-foreground">Min. bid</span>
            </div>
          </div>

          {/* Venue */}
          <div className="flex items-center gap-2 rounded-lg bg-card p-3">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{venue.name}</span>
          </div>

          {/* Trust signal */}
          <div className="flex items-center gap-2 rounded-lg bg-primary/10 p-3">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-xs text-primary">
              You are only charged if your song is played
            </span>
          </div>

          {/* CTA */}
          {session ? (
            <button
              onClick={() => router.push(`/join/${venueSlug}`)}
              className="h-14 rounded-xl bg-primary text-primary-foreground text-base font-semibold hover:bg-primary/90 transition-colors"
              type="button"
            >
              Request a Song
            </button>
          ) : (
            <div className="rounded-xl bg-card p-6 text-center">
              <p className="text-muted-foreground">
                No active session right now
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Check back later!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
