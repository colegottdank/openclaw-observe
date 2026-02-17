import type { Agent, SwarmActivity, ActivityType } from '../types'

/**
 * Deterministically generate a color from an agent ID.
 * Produces consistent HSL colors with good saturation/lightness for dark UIs.
 */
export function getAgentColor(agentId: string): string {
  let hash = 0
  for (let i = 0; i < agentId.length; i++) {
    hash = agentId.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 70%, 60%)`
}

/**
 * Get a display-friendly name from an agent object or ID string.
 */
export function getAgentName(agentOrId: Agent | string): string {
  if (typeof agentOrId === 'object') {
    return agentOrId.displayName || agentOrId.name || agentOrId.id
  }
  return agentOrId
    .replace(/^agent:/, '')
    .split('-')
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ')
}

/**
 * Normalize an agent ID from session keys or other formats.
 * Handles: "agent:debateai-atlas:abc123" -> "debateai-atlas"
 */
export function normalizeAgentId(raw: string): string {
  let id = raw.replace(/^agent:/, '')
  const parts = id.split(':')
  if (parts.length > 1) id = parts[0]
  return id
}

/**
 * Detect the activity type from a swarm activity entry.
 */
export function getActivityType(activity: SwarmActivity): ActivityType {
  const label = activity.label?.toLowerCase() || ''
  const key = activity.key?.toLowerCase() || ''
  const agentId = activity.agentId?.toLowerCase() || ''

  if (label.includes('heartbeat') || key.includes('heartbeat') || label.includes('HEARTBEAT')) {
    return 'heartbeat'
  }
  if (label.includes('cron') || key.includes('cron') || label.includes('scheduled') || key.includes('scheduled')) {
    return 'cron'
  }
  if (activity.parentSessionId || label.includes('subagent') || agentId.includes('sub') || key.includes('spawn')) {
    return 'subagent'
  }
  return 'regular'
}

/**
 * Get colors for an activity type (used in timeline chart).
 */
export function getActivityTypeColor(type: ActivityType): { bg: string; border: string; text: string } {
  switch (type) {
    case 'heartbeat':
      return { bg: 'rgba(99, 102, 241, 0.2)', border: 'rgba(99, 102, 241, 0.6)', text: '#818cf8' }
    case 'cron':
      return { bg: 'rgba(245, 158, 11, 0.2)', border: 'rgba(245, 158, 11, 0.6)', text: '#fbbf24' }
    case 'subagent':
      return { bg: 'rgba(139, 92, 246, 0.2)', border: 'rgba(139, 92, 246, 0.6)', text: '#a78bfa' }
    default:
      return { bg: 'rgba(16, 185, 129, 0.2)', border: 'rgba(16, 185, 129, 0.6)', text: '#34d399' }
  }
}
