import { usePolling } from './usePolling'
import type { Agent } from '../types'

async function fetchAgents(): Promise<Agent[]> {
  const res = await fetch('/api/agents')
  if (!res.ok) throw new Error('Failed to fetch agents')
  return res.json()
}

export function useAgents() {
  return usePolling({ fetcher: fetchAgents, interval: 5000 })
}
