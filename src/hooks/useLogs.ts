import { usePolling } from './usePolling'
import { parseLogLines } from '../utils/logs'
import type { LogEntry } from '../types'

async function fetchLogs(): Promise<LogEntry[]> {
  const res = await fetch('/api/gateway/logs?lines=500')
  if (!res.ok) throw new Error('Failed to fetch logs')
  const data = await res.json()
  return parseLogLines(data.logs)
}

export function useLogs(interval = 5000) {
  return usePolling({ fetcher: fetchLogs, interval })
}
