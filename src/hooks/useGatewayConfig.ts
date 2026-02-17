import { useState, useCallback } from 'react'
import { usePolling } from './usePolling'
import type { GatewayConfig } from '../types'

async function fetchConfig(): Promise<GatewayConfig> {
  const res = await fetch('/api/gateway/config')
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `Failed to fetch config: ${res.status}`)
  }
  return res.json()
}

export function useGatewayConfig() {
  const polling = usePolling({ fetcher: fetchConfig, interval: 60000 })

  const patchConfig = useCallback(async (patch: Partial<GatewayConfig>) => {
    const res = await fetch('/api/gateway/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!res.ok) throw new Error(`Failed to update config: ${res.status}`)
    // Refetch after patch
    await polling.refetch()
    return res.json()
  }, [polling.refetch])

  return { ...polling, patchConfig }
}
