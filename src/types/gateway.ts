export interface LogEntry {
  id: string
  timestamp: string
  level: string
  source: string
  message: string
  raw: string
}

export interface GatewayStatus {
  status: 'online' | 'offline' | 'restarting'
  version?: string
  pid?: number
  port?: number
  uptime?: string
  memoryUsage?: string
}
