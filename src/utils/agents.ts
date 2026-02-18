import type { Agent, SwarmGroup, SwarmActivity, ActivityType } from '../types'

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
 * Group agents into swarms based on subagent relationships.
 * An agent with subagents is the "leader" of a swarm.
 * Agents listed in another agent's subagents are "members".
 * Agents with no relationships are "standalone" (returned with leader === the agent itself, empty members).
 */
export function groupAgentsBySwarm(agents: Agent[]): { swarms: SwarmGroup[]; standalone: Agent[] } {
  const agentMap = new Map(agents.map(a => [a.id, a]))
  const memberOf = new Set<string>()

  // Find leaders: agents that have subagents
  const swarms: SwarmGroup[] = []
  for (const agent of agents) {
    const subs = agent.subagents || []
    if (subs.length === 0) continue

    const members = subs
      .map(id => agentMap.get(id))
      .filter((a): a is Agent => !!a)

    if (members.length === 0) continue

    // Derive swarm name from common prefix or leader name
    const prefix = getCommonPrefix(agent.id, subs)
    const name = prefix
      ? prefix.replace(/-$/, '').split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')
      : agent.name

    subs.forEach(id => memberOf.add(id))
    memberOf.add(agent.id) // leader is also part of the swarm

    swarms.push({ id: prefix || agent.id, name, leader: agent, members })
  }

  // Standalone: not a leader and not a member of any swarm
  const standalone = agents.filter(a => !memberOf.has(a.id))

  return { swarms, standalone }
}

/**
 * Find the common prefix shared by a leader ID and its member IDs.
 * e.g. "debateai-atlas" + ["debateai-forge", "debateai-pixel"] → "debateai-"
 */
function getCommonPrefix(leaderId: string, memberIds: string[]): string {
  const all = [leaderId, ...memberIds]
  if (all.length < 2) return ''

  let prefix = ''
  for (let i = 0; i < all[0].length; i++) {
    const char = all[0][i]
    if (all.every(id => id[i] === char)) {
      prefix += char
    } else {
      break
    }
  }

  // Only return if it's a meaningful prefix (at least one segment before a dash)
  if (prefix.includes('-') && prefix.length > 2) return prefix
  return ''
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
