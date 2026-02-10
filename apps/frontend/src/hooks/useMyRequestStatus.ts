import { useEffect, useCallback, useRef, useState } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { supabase, isRealtimeEnabled } from '../lib/supabase'
import { Request as SongRequest, api } from '../lib/api'

interface UseMyRequestStatusOptions {
  requestId: string | null
  onStatusChange?: (request: SongRequest) => void
}

interface UseMyRequestStatusResult {
  request: SongRequest | null
  loading: boolean
  error: Error | null
  isRealtime: boolean
  refetch: () => Promise<void>
}

export function useMyRequestStatus({
  requestId,
  onStatusChange,
}: UseMyRequestStatusOptions): UseMyRequestStatusResult {
  const [request, setRequest] = useState<SongRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const onStatusChangeRef = useRef(onStatusChange)
  onStatusChangeRef.current = onStatusChange

  // Fetch request by ID
  const fetchRequest = useCallback(async () => {
    if (!requestId) {
      setRequest(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const data = await api.getRequest(requestId)
      setRequest(data)
      setError(null)
    } catch (err) {
      const fetchError =
        err instanceof Error ? err : new Error('Failed to fetch request')
      setError(fetchError)
    } finally {
      setLoading(false)
    }
  }, [requestId])

  // Setup Realtime subscription for single request
  useEffect(() => {
    if (!requestId) {
      setRequest(null)
      setLoading(false)
      return
    }

    // Always fetch initial data
    fetchRequest()

    // Skip realtime if not enabled - fallback to polling
    if (!isRealtimeEnabled || !supabase) {
      console.log('[Realtime] Not available for request status, falling back to polling')
      const interval = setInterval(fetchRequest, 30000)
      return () => clearInterval(interval)
    }

    // Create realtime channel for this specific request
    const channel = supabase
      .channel(`request:${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'requests',
          filter: `id=eq.${requestId}`,
        },
        (payload) => {
          const updatedRequest = payload.new as SongRequest
          setRequest(updatedRequest)
          onStatusChangeRef.current?.(updatedRequest)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Connected to request status channel')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] Request status channel error')
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
  }, [requestId, fetchRequest])

  return {
    request,
    loading,
    error,
    isRealtime: isRealtimeEnabled,
    refetch: fetchRequest,
  }
}
