import { useRef } from 'react'
import { usePolling } from './usePolling'
import type { Session, SessionLogEntry } from '../types'

export function useSessions(agentId: string | null) {
  const polling = usePolling<Session[]>({
    fetcher: async () => {
      if (!agentId) return []
      const res = await fetch(`/api/sessions?agentId=${agentId}`)
      if (!res.ok) throw new Error('Failed to fetch sessions')
      const data: Session[] = await res.json()
      data.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      return data
    },
    interval: 10000,
    enabled: !!agentId,
  })

  return polling
}

/**
 * Fetch session logs with smart polling.
 * - Active sessions: polls every 3s with If-Modified-Since caching
 * - Completed/aborted: fetches once, then stops polling
 */
export function useSessionLogs(
  agentId: string | null,
  sessionId: string | null,
  status?: 'active' | 'completed' | 'aborted' | 'unknown' | null,
) {
  const isActive = status === 'active'
  const lastModified = useRef<string | null>(null)
  const cachedLogs = useRef<SessionLogEntry[]>([])
  const lastSessionId = useRef<string | null>(null)

  // Reset cache when session changes
  if (sessionId !== lastSessionId.current) {
    lastModified.current = null
    cachedLogs.current = []
    lastSessionId.current = sessionId
  }

  const polling = usePolling<SessionLogEntry[]>({
    fetcher: async () => {
      if (!agentId || !sessionId) return []

      const headers: Record<string, string> = {}
      if (lastModified.current) {
        headers['If-Modified-Since'] = lastModified.current
      }

      const res = await fetch(`/api/sessions/${agentId}/${sessionId}`, { headers })

      // 304 Not Modified — return cached data
      if (res.status === 304) {
        return cachedLogs.current
      }

      if (!res.ok) return cachedLogs.current

      // Store Last-Modified for next request
      const lm = res.headers.get('Last-Modified')
      if (lm) lastModified.current = lm

      const text = await res.text()
      const logs = text
        .trim()
        .split('\n')
        .map(line => {
          try { return JSON.parse(line) } catch { return null }
        })
        .filter(Boolean) as SessionLogEntry[]

      cachedLogs.current = logs
      return logs
    },
    // Active: poll every 3s. Completed: poll every 60s (effectively once).
    interval: isActive ? 3000 : 60000,
    enabled: !!agentId && !!sessionId,
  })

  return polling
}
