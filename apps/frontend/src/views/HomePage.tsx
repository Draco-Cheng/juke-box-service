'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Music, Radio, Star, Users, Disc3, Clock, CheckCircle2, XCircle, Ban, ChevronDown, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api, LiveDJ, Request as SongRequest } from '../lib/api'
import { useLiveDJs } from '../hooks/useLiveDJs'
import { useMyRequestsRealtime } from '../hooks/useMyRequestsRealtime'

// Status configuration for request cards
const STATUS_CONFIG: Record<
  SongRequest['status'],
  { label: string; description: string; icon: typeof Clock; color: string; bgColor: string }
> = {
  pending: {
    label: 'Pending',
    description: 'Waiting for DJ to accept your request',
    icon: Clock,
    color: 'text-accent',
    bgColor: 'bg-accent/10',
  },
  accepted: {
    label: 'Accepted',
    description: 'Your song is in the queue',
    icon: CheckCircle2,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  played: {
    label: 'Completed',
    description: 'Payment processed. Thanks for the tip!',
    icon: CheckCircle2,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  rejected: {
    label: 'Declined',
    description: "The DJ couldn't play your request this time",
    icon: XCircle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
  },
  expired: {
    label: 'Expired',
    description: 'This request has expired',
    icon: Ban,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
}

const PROGRESS_STEPS = ['pending', 'accepted', 'played'] as const

// DJ Card — matches prototype design
function DJCard({ liveDJ, onClick }: { liveDJ: LiveDJ; onClick: () => void }) {
  const { dj, venue, listener_count, base_price } = liveDJ
  const currency =
    venue.settings?.pricing?.currency === 'EUR'
      ? '€'
      : venue.settings?.pricing?.currency || '€'

  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-xl bg-card p-4 text-left transition-colors hover:bg-secondary"
      type="button"
    >
      {/* Avatar */}
      <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-secondary">
        {dj.profile_image ? (
          <img
            src={dj.profile_image}
            alt={dj.name}
            className="h-14 w-14 rounded-full object-cover"
          />
        ) : (
          <Radio className="h-6 w-6 text-primary" />
        )}
        <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
        </span>
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-foreground truncate">{dj.name}</span>
          <span className="font-mono text-sm font-bold text-primary shrink-0">
            From {currency}{(base_price / 100).toFixed(0)}
          </span>
        </div>
        {dj.genres && dj.genres.length > 0 && (
          <span className="text-sm text-muted-foreground truncate">
            {dj.genres.join(' · ')}
          </span>
        )}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {dj.rating > 0 && (
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 text-accent" />
              {dj.rating.toFixed(1)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {listener_count} listening
          </span>
          <span className="truncate">{venue.name}</span>
        </div>
      </div>
    </button>
  )
}

// Request Card — expandable accordion with cancel/withdraw
function RequestCard({
  req,
  isExpanded,
  onToggle,
  onCancel,
}: {
  req: SongRequest
  isExpanded: boolean
  onToggle: () => void
  onCancel: (requestId: string) => Promise<void>
}) {
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const config = STATUS_CONFIG[req.status]
  const StatusIcon = config.icon
  const stepIndex = (PROGRESS_STEPS as readonly string[]).indexOf(req.status)
  const canCancel = req.status === 'pending' || req.status === 'accepted'
  const currency = '€'

  const handleCancel = async () => {
    setCancelling(true)
    try {
      await onCancel(req.id)
    } finally {
      setCancelling(false)
      setConfirmingCancel(false)
    }
  }

  return (
    <div className="flex flex-col rounded-xl bg-card overflow-hidden transition-all">
      {/* Header — always visible */}
      <button
        onClick={onToggle}
        className="flex items-center gap-3 p-4 text-left w-full"
        type="button"
        aria-expanded={isExpanded}
      >
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
            config.bgColor,
          )}
        >
          <StatusIcon className={cn('h-5 w-5', config.color)} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm font-medium text-foreground truncate">
            {req.song_title}
          </span>
          {req.song_artist && (
            <span className="text-xs text-muted-foreground truncate">
              {req.song_artist}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex flex-col items-end gap-0.5">
            <span className="font-mono text-sm font-bold text-foreground">
              {currency}{(req.amount / 100).toFixed(0)}
            </span>
            <span className={cn('text-xs font-medium', config.color)}>
              {config.label}
            </span>
          </div>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform duration-200',
              isExpanded && 'rotate-180',
            )}
          />
        </div>
      </button>

      {/* Expanded detail */}
      <div
        className={cn(
          'grid transition-all duration-200 ease-in-out',
          isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-4 border-t border-border/50 px-4 pb-4 pt-4">
            {/* DJ info */}
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Requested from</span>
              <span className="font-medium text-foreground">DJ</span>
            </div>

            {/* Progress steps */}
            <div className="flex w-full items-center gap-2">
              {PROGRESS_STEPS.map((step, i) => {
                const currentIdx =
                  req.status === 'rejected' || req.status === 'expired'
                    ? -1
                    : stepIndex
                const isActive = i <= currentIdx
                const isCurrent = step === req.status
                return (
                  <div
                    key={step}
                    className="flex flex-1 flex-col items-center gap-1.5"
                  >
                    <div
                      className={cn(
                        'h-1.5 w-full rounded-full transition-colors',
                        isActive ? 'bg-primary' : 'bg-secondary',
                        isCurrent && 'animate-pulse',
                      )}
                    />
                    <span className="text-[10px] text-muted-foreground capitalize">
                      {step === 'played' ? 'completed' : step}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Status description */}
            <p className="text-xs text-muted-foreground text-center">
              {config.description}
            </p>

            {/* Date */}
            <div className="flex items-center justify-end text-xs text-muted-foreground">
              <span>{new Date(req.created_at).toLocaleDateString()}</span>
            </div>

            {/* Cancel / Withdraw */}
            {canCancel && (
              <>
                {confirmingCancel ? (
                  <div className="flex flex-col gap-3 rounded-xl bg-destructive/10 p-3">
                    <p className="text-sm text-foreground">
                      {req.status === 'accepted'
                        ? 'The DJ already accepted this. Are you sure you want to withdraw?'
                        : 'Cancel this song request?'}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCancel()
                        }}
                        disabled={cancelling}
                        className="flex-1 rounded-lg bg-destructive py-2 text-sm font-medium text-destructive-foreground disabled:opacity-50"
                        type="button"
                      >
                        {cancelling
                          ? 'Cancelling...'
                          : req.status === 'accepted'
                            ? 'Yes, withdraw'
                            : 'Yes, cancel'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setConfirmingCancel(false)
                        }}
                        disabled={cancelling}
                        className="flex-1 rounded-lg bg-secondary py-2 text-sm font-medium text-foreground"
                        type="button"
                      >
                        Keep request
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (req.status === 'accepted') {
                        setConfirmingCancel(true)
                      } else {
                        setConfirmingCancel(true)
                      }
                    }}
                    className="w-full rounded-xl border border-destructive/30 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                    type="button"
                  >
                    {req.status === 'accepted' ? 'Withdraw Request' : 'Cancel Request'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = (searchParams?.get('tab') || 'djs') as 'djs' | 'requests'
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null)

  // Live DJs — polls every 30s + refetches on visibility change
  const { liveDJs, loading } = useLiveDJs()

  // My requests — Supabase Realtime subscriptions with polling fallback
  const {
    requests: myRequests,
    loading: requestsLoading,
    refetch: refetchMyRequests,
  } = useMyRequestsRealtime(activeTab === 'requests')

  // Cancel/withdraw a request
  async function handleCancelRequest(requestId: string) {
    try {
      await api.updateRequest(requestId, 'rejected')
      // Refetch to get updated state (realtime will also update, but this is immediate)
      await refetchMyRequests()
    } catch (err) {
      console.error('Failed to cancel request:', err)
    }
  }

  function handleDJClick(liveDJ: LiveDJ) {
    router.push(`/venue/${liveDJ.venue.slug}`)
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="flex flex-col gap-2 px-4 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <Music className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">DropBeat</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Request songs from live DJs. Your song, your moment.
        </p>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 pb-20 overflow-y-auto">
        {activeTab === 'djs' && (
          <div className="flex flex-col gap-6">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* Live Now */}
                {liveDJs.length > 0 && (
                  <section className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-pulse-live" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                      </span>
                      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        Live Now ({liveDJs.length})
                      </h2>
                    </div>
                    <div className="flex flex-col gap-3">
                      {liveDJs.map((liveDJ) => (
                        <DJCard
                          key={liveDJ.session_id}
                          liveDJ={liveDJ}
                          onClick={() => handleDJClick(liveDJ)}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Empty state */}
                {liveDJs.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
                    <Disc3 className="h-12 w-12 text-muted-foreground" />
                    <div className="flex flex-col gap-1">
                      <p className="font-medium text-foreground">No DJs live right now</p>
                      <p className="text-sm text-muted-foreground">
                        Check back later for live sessions
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="flex flex-col gap-4 pt-2">
            <h2 className="text-lg font-bold text-foreground">My Requests</h2>
            {requestsLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : myRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
                <Disc3 className="h-12 w-12 text-muted-foreground" />
                <div className="flex flex-col gap-1">
                  <p className="font-medium text-foreground">No requests yet</p>
                  <p className="text-sm text-muted-foreground">
                    Find a DJ and request your first song
                  </p>
                </div>
                <button
                  onClick={() => router.push('/?tab=djs')}
                  className="mt-2 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground"
                  type="button"
                >
                  Find DJs
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {myRequests.map((req) => (
                  <RequestCard
                    key={req.id}
                    req={req}
                    isExpanded={expandedRequestId === req.id}
                    onToggle={() =>
                      setExpandedRequestId(
                        expandedRequestId === req.id ? null : req.id,
                      )
                    }
                    onCancel={handleCancelRequest}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
