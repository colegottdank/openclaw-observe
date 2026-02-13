interface ActivityItemProps {
  icon: string
  iconColor: string
  message: string
  timestamp: string
  agent?: string
  last?: boolean
}

export function ActivityItem({ icon, iconColor, message, timestamp, agent, last }: ActivityItemProps) {
  return (
    <div className={`flex items-start gap-3 p-3 transition-colors hover:bg-[var(--bg-elevated)] ${
      !last ? 'border-b border-[var(--border-subtle)]' : ''
    }`}>
      <div 
        className="w-6 h-6 rounded-md flex items-center justify-center text-xs flex-shrink-0 mt-0.5"
        style={{ 
          backgroundColor: `${iconColor}15`,
          color: iconColor 
        }}
      >
        {icon}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-small text-[var(--text-primary)] leading-relaxed">
          {message}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {agent && (
            <span className="text-caption text-[var(--accent)]">
              {agent}
            </span>
          )}
          <span className="text-caption text-[var(--text-tertiary)]">
            {timestamp}
          </span>
        </div>
      </div>
    </div>
  )
}
