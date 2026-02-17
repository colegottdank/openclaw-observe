export interface Session {
  sessionId: string
  agentId: string
  key?: string
  updatedAt: number
  createdAt?: number
  status: 'active' | 'completed' | 'aborted' | 'unknown'
  kind?: string
  channel?: string
  displayName?: string
  channelName?: string | null
  lastTo?: string
  deliveryContext?: Record<string, unknown>
  summary?: string
  label?: string
}

export interface SessionLogEntry {
  type: 'message' | 'tool_use' | 'tool_result' | 'error'
  ts?: number
  timestamp?: number
  createdAt?: number
  message?: {
    role: string
    content: string | SessionContentBlock[]
  }
  tool?: string
  name?: string
  input?: unknown
  args?: unknown
  output?: unknown
  isError?: boolean
}

export interface SessionContentBlock {
  type: 'text' | 'thinking' | 'toolCall'
  text?: string
  thinking?: string
  name?: string
  arguments?: string | Record<string, unknown>
}

export type ActivityType = 'heartbeat' | 'cron' | 'subagent' | 'regular'

export interface SwarmActivity {
  agentId: string
  sessionId: string
  start: number
  end: number
  label: string
  status: 'active' | 'completed' | 'aborted'
  key: string
  kind?: 'heartbeat' | 'cron' | 'subagent' | 'regular'
  parentSessionId?: string
}
