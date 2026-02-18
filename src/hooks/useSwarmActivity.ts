import { useEffect } from 'react'
import { usePolling } from './usePolling'
import type { SwarmActivity } from '../types'

interface SwarmResponse {
  activities: SwarmActivity[]
  window: { start: number; end: number; hours: number }
}

export function useSwarmActivity(windowHours: number = 1) {
  const { data, loading, error, refetch } = usePolling<SwarmResponse>({
    fetcher: async () => {
      const res = await fetch(`/api/swarm/activity?window=${windowHours}`)
      if (!res.ok) throw new Error('Failed to fetch activity')
      return res.json()
    },
    interval: 5000,
  })

  // Auto-refresh when window changes
  useEffect(() => {
    refetch()
  }, [windowHours, refetch])

  return { data, loading, error, refetch }
}
