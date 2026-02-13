import { useEffect, useCallback, useRef, useState } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Request as SongRequest, api } from '../lib/api'

const MY_REQUESTS_KEY = 'my_requests'

function getMyRequestIds(): string[] {
  try {
    const stored = localStorage.getItem(MY_REQUESTS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

interface UseMyRequestsRealtimeResult {
  requests: SongRequest[]
  loading: boolean
  error: Error | null
  isRealtime: boolean
  refetch: () => Promise<void>
}

export function useMyRequestsRealtime(enabled: boolean): UseMyRequestsRealtimeResult {
  const [requests, setRequests] = useState<SongRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const channelsRef = useRef<RealtimeChannel[]>([])

  const fetchRequests = useCallback(async () => {
    const ids = getMyRequestIds()
    if (ids.length === 0) {
      setRequests([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const results: SongRequest[] = []
      for (const id of ids) {
        try {
          const req = await api.getRequest(id)
          results.push(req)
        } catch {
          // Request may no longer exist
        }
      }
      setRequests(results)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch requests'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      setRequests([])
      setLoading(false)
      return
    }

    const ids = getMyRequestIds()
    if (ids.length === 0) {
      setRequests([])
      setLoading(false)
      return
    }

    // Always fetch initial data
    fetchRequests()

    // Skip realtime if not enabled — fallback to polling
    if (!supabase.isRealtimeEnabled || !supabase.client) {
      const interval = setInterval(fetchRequests, 30000)
      return () => clearInterval(interval)
    }

    // Subscribe to UPDATE events for each tracked request
    const channels: RealtimeChannel[] = []
    for (const id of ids) {
      const channel = supabase.client
        .channel(`my-request:${id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'requests',
            filter: `id=eq.${id}`,
          },
          (payload) => {
            const updated = payload.new as SongRequest
            setRequests((prev) =>
              prev.map((r) => (r.id === updated.id ? updated : r))
            )
          }
        )
        .subscribe()
      channels.push(channel)
    }
    channelsRef.current = channels

    return () => {
      for (const ch of channelsRef.current) {
        if (supabase.client) {
          supabase.client.removeChannel(ch)
        }
      }
      channelsRef.current = []
    }
  }, [enabled, fetchRequests])

  return {
    requests,
    loading,
    error,
    isRealtime: supabase.isRealtimeEnabled,
    refetch: fetchRequests,
  }
}
