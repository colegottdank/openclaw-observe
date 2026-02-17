import { usePolling } from './usePolling'
import type { GatewayStatus } from '../types'

async function fetchStatus(): Promise<GatewayStatus> {
  const res = await fetch('/api/gateway/status')
  if (!res.ok) throw new Error('Failed to fetch gateway status')
  return res.json()
}

export function useGatewayStatus() {
  return usePolling({ fetcher: fetchStatus, interval: 10000 })
}
