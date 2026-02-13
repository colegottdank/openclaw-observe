interface Agent {
  _id: string
  name: string
  emoji?: string
  avatar?: string
  status?: 'online' | 'away' | 'offline'
  lastHeartbeat?: number
  currentTask?: string
}

interface AgentRowProps {
  agent: Agent
  last?: boolean
}

export function AgentRow({ agent, last }: AgentRowProps) {
  const isOnline = agent.lastHeartbeat && Date.now() - agent.lastHeartbeat < 3600000
  
  return (
    <div className={`flex items-center gap-3 p-3 transition-colors hover:bg-[var(--bg-elevated)] ${
      !last ? 'border-b border-[var(--border-subtle)]' : ''
    }`}>
      {/* Avatar */}
      <div className="relative">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent)] flex items-center justify-center text-base overflow-hidden"
          style={{ opacity: isOnline ? 1 : 0.5 }}
        >
          {agent.emoji || agent.name[0]?.toUpperCase() || '🤖'}
        </div>
        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--bg-card)] ${
          isOnline ? 'bg-[var(--success)]' : 'bg-[var(--text-muted)]'
        }`}></div>
      </div>
      
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-small font-medium text-[var(--text-primary)] truncate">
            {agent.name}
          </span>
        </div>
        <div className="text-caption text-[var(--text-tertiary)] truncate">
          {agent.currentTask || 'Idle'}
        </div>
      </div>
      
      {/* Status */}
      <div className={`text-caption ${isOnline ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}`}>
        {isOnline ? 'Online' : 'Offline'}
      </div>
    </div>
  )
}
