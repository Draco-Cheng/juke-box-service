import { useEffect, useCallback, useRef, useState } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { supabase, isRealtimeEnabled } from '../lib/supabase'
import { Request as SongRequest, api } from '../lib/api'

interface UseRequestsRealtimeOptions {
  sessionId: string | null
  onInsert?: (request: SongRequest) => void
  onUpdate?: (request: SongRequest) => void
  onError?: (error: Error) => void
}

interface UseRequestsRealtimeResult {
  requests: SongRequest[]
  loading: boolean
  error: Error | null
  isRealtime: boolean
  refetch: () => Promise<void>
}

// Sort requests by tier priority and created_at
function sortRequests(requests: SongRequest[]): SongRequest[] {
  const tierOrder = { asap: 0, priority: 1, normal: 2 }
  return [...requests].sort((a, b) => {
    const tierDiff = tierOrder[a.tier] - tierOrder[b.tier]
    if (tierDiff !== 0) return tierDiff
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
}

export function useRequestsRealtime({
  sessionId,
  onInsert,
  onUpdate,
  onError,
}: UseRequestsRealtimeOptions): UseRequestsRealtimeResult {
  const [requests, setRequests] = useState<SongRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)

  // Initial fetch
  const fetchRequests = useCallback(async () => {
    if (!sessionId) return

    try {
      setLoading(true)
      const data = await api.getSessionRequests(sessionId)
      setRequests(data)
      setError(null)
    } catch (err) {
      const fetchError =
        err instanceof Error ? err : new Error('Failed to fetch requests')
      setError(fetchError)
      onError?.(fetchError)
    } finally {
      setLoading(false)
    }
  }, [sessionId, onError])

  // Setup Realtime subscription
  useEffect(() => {
    if (!sessionId) {
      setRequests([])
      setLoading(false)
      return
    }

    // Always fetch initial data
    fetchRequests()

    // Skip realtime if not enabled - fallback to polling
    if (!isRealtimeEnabled || !supabase) {
      console.log('[Realtime] Not available, falling back to polling')
      const interval = setInterval(fetchRequests, 30000)
      return () => clearInterval(interval)
    }

    // Create realtime channel with filter
    const channel = supabase
      .channel(`requests:session:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'requests',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const newRequest = payload.new as SongRequest
          setRequests((prev) => {
            // Avoid duplicates
            if (prev.some((r) => r.id === newRequest.id)) return prev
            return sortRequests([...prev, newRequest])
          })
          onInsert?.(newRequest)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'requests',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const updatedRequest = payload.new as SongRequest
          setRequests((prev) =>
            sortRequests(prev.map((r) => (r.id === updatedRequest.id ? updatedRequest : r)))
          )
          onUpdate?.(updatedRequest)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Connected to requests channel')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] Channel error')
          setError(new Error('Realtime connection failed'))
        }
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current && supabase) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [sessionId, fetchRequests, onInsert, onUpdate])

  return {
    requests,
    loading,
    error,
    isRealtime: isRealtimeEnabled,
    refetch: fetchRequests,
  }
}
