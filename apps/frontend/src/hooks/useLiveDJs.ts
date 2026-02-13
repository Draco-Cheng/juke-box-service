import { useEffect, useCallback, useRef, useState } from 'react'
import { api, LiveDJ } from '../lib/api'

const POLL_INTERVAL = 30_000

interface UseLiveDJsResult {
  liveDJs: LiveDJ[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useLiveDJs(): UseLiveDJsResult {
  const [liveDJs, setLiveDJs] = useState<LiveDJ[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchLiveDJs = useCallback(async () => {
    try {
      const data = await api.getLiveDJs()
      setLiveDJs(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch live DJs'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Initial fetch
    fetchLiveDJs()

    // Poll every 30s
    intervalRef.current = setInterval(fetchLiveDJs, POLL_INTERVAL)

    // Refetch when the user tabs back to the page
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        fetchLiveDJs()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [fetchLiveDJs])

  return { liveDJs, loading, error, refetch: fetchLiveDJs }
}
