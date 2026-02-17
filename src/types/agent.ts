export type AgentStatus = 'active' | 'idle' | 'busy' | 'blocked' | 'paused' | 'error'

export interface Agent {
  _id: string
  name: string
  status: AgentStatus
  role?: string
  emoji?: string
  model?: string
  enabled?: boolean
  lastActive?: string | null
  workspace?: string
  displayName?: string
}

export interface AgentConfig {
  id: string
  name?: string
  enabled?: boolean
  model?: string
  lastActive?: string
  workspace?: string
  identity?: {
    name?: string
    emoji?: string
    theme?: string
  }
  [key: string]: unknown
}
