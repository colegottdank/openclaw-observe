export interface GatewayConfig {
  agents?: {
    defaults?: {
      model?: string
    }
    list?: import('./agent').AgentConfig[]
  }
  gateway?: Record<string, unknown>
  env?: Record<string, string>
}

export interface GatewayStatus {
  status: 'online' | 'offline' | 'restarting'
  version?: string
  pid?: number
  port?: number
  uptime?: string
  memoryUsage?: string
}
