/**
 * Format a timestamp as a relative time string (e.g. "5m ago", "2h ago").
 */
export function formatTimeAgo(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Format a date string as relative time (handles "Unknown" and invalid dates).
 */
export function formatLastActive(dateStr: string | null | undefined): string {
  if (!dateStr || dateStr === 'Unknown') return 'Never'
  try {
    const date = new Date(dateStr)
    return formatTimeAgo(date.getTime())
  } catch {
    return dateStr
  }
}

/**
 * Format a timestamp as HH:MM (24h).
 */
export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/**
 * Format a timestamp as HH:MM:SS (24h).
 */
export function formatTimeFull(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

/**
 * Compute session duration in ms, or null if timestamps are missing.
 */
export function getSessionDuration(session: { createdAt?: number; updatedAt?: number }): number | null {
  return session.updatedAt && session.createdAt
    ? session.updatedAt - session.createdAt
    : null
}

/**
 * Format a duration in ms as a human string (e.g. "45s", "12m", "3h").
 */
export function formatDuration(ms: number): string {
  if (ms < 60000) return `${Math.round(ms / 1000)}s`
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`
  return `${Math.round(ms / 3600000)}h`
}
