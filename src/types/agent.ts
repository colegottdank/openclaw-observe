export type AgentStatus = 'active' | 'idle' | 'busy' | 'blocked' | 'paused' | 'error'

export interface Agent {
  id: string
  name: string
  status: AgentStatus
  role?: string
  emoji?: string
  model?: string
  enabled?: boolean
  lastActive?: string | null
  workspace?: string
  displayName?: string
  subagents?: string[]
  sessionCount?: number
  errorCount?: number
  currentTask?: string | null
  totalTokens?: number
}

export interface SwarmGroup {
  id: string
  name: string
  leader: Agent
  members: Agent[]
}
