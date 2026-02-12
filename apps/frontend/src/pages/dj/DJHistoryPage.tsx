import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, XCircle, DollarSign, Music } from 'lucide-react'
import { api, Request as SongRequest } from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'

export default function DJHistoryPage() {
  const navigate = useNavigate()
  const { dj, loading: authLoading } = useAuth()
  const [requests, setRequests] = useState<SongRequest[]>([])
  const [loading, setLoading] = useState(true)

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !dj) {
      navigate('/dj')
    }
  }, [authLoading, dj, navigate])

  const fetchHistory = useCallback(async () => {
    if (!dj) {
      setLoading(false)
      return
    }

    try {
      const data = await api.getDJRequests(dj.id)
      setRequests(data)
    } catch (error) {
      console.error('Failed to fetch history:', error)
    } finally {
      setLoading(false)
    }
  }, [dj])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const playedRequests = requests.filter((r) => r.status === 'played')
  const declinedRequests = requests.filter((r) => r.status === 'rejected' || r.status === 'expired')
  const totalEarnings = playedRequests.reduce((sum, r) => sum + r.amount, 0)
  const currency = '€'

  // Empty state
  if (requests.length === 0) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-md px-4 pb-24 pt-6">
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
            <Music className="h-12 w-12 text-muted-foreground" />
            <div className="flex flex-col gap-1">
              <p className="font-medium text-foreground">No history yet</p>
              <p className="text-sm text-muted-foreground">
                Completed and declined requests will appear here
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-md px-4 pb-24 pt-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-foreground">History</h1>
          <div className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5">
            <DollarSign className="h-3.5 w-3.5 text-primary" />
            <span className="font-mono text-sm font-bold text-primary">
              {currency}{(totalEarnings / 100).toFixed(0)}
            </span>
            <span className="text-xs text-muted-foreground">earned</span>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col items-center gap-1 rounded-xl bg-card p-3">
            <span className="font-mono text-2xl font-bold text-primary">
              {playedRequests.length}
            </span>
            <span className="text-xs text-muted-foreground">Songs Played</span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-xl bg-card p-3">
            <span className="font-mono text-2xl font-bold text-destructive">
              {declinedRequests.length}
            </span>
            <span className="text-xs text-muted-foreground">Declined</span>
          </div>
        </div>

        {/* Past requests list */}
        <div className="flex flex-col gap-2">
          {requests.map((req) => {
            const isPlayed = req.status === 'played'
            return (
              <div
                key={req.id}
                className="flex items-center gap-3 rounded-xl bg-card p-4"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    isPlayed ? 'bg-primary/10' : 'bg-destructive/10'
                  }`}
                >
                  {isPlayed ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground truncate">
                    {req.song_title}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {req.song_artist}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-0.5 shrink-0">
                  <span
                    className={`font-mono text-sm font-bold ${
                      isPlayed ? 'text-primary' : 'text-muted-foreground line-through'
                    }`}
                  >
                    {currency}{(req.amount / 100).toFixed(0)}
                  </span>
                  <span
                    className={`text-xs font-medium ${
                      isPlayed ? 'text-primary' : 'text-destructive'
                    }`}
                  >
                    {isPlayed ? 'Played' : req.status === 'expired' ? 'Expired' : 'Declined'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
