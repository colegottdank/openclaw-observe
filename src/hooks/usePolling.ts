import { useState, useEffect, useCallback, useRef } from 'react'

interface UsePollingOptions<T> {
  fetcher: () => Promise<T>
  interval?: number
  enabled?: boolean
}

interface UsePollingResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Generic polling hook. Fetches data on mount and at a regular interval.
 */
export function usePolling<T>({ fetcher, interval = 5000, enabled = true }: UsePollingOptions<T>): UsePollingResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const refetch = useCallback(async () => {
    try {
      setError(null)
      const result = await fetcherRef.current()
      setData(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return

    refetch()
    const id = setInterval(refetch, interval)
    return () => clearInterval(id)
  }, [refetch, interval, enabled])

  return { data, loading, error, refetch }
}
