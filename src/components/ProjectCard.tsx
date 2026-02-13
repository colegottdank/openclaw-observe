interface Project {
  _id: string
  name: string
  description?: string
  status: 'active' | 'paused' | 'complete' | 'archived'
  taskCount?: number
  updatedAt?: number
}

interface ProjectCardProps {
  project: Project
  agents: Array<{
    _id: string
    name: string
    emoji?: string
    avatar?: string
  }>
  onlineCount: number
  onClick: () => void
}

export function ProjectCard({ project, agents, onlineCount, onClick }: ProjectCardProps) {
  const taskCount = project.taskCount || 0
  
  return (
    <div 
      onClick={onClick}
      className="card card-interactive p-5 group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-title truncate mb-1 group-hover:text-[var(--accent)] transition-colors">
            {project.name}
          </h3>
          <p className="text-small text-[var(--text-secondary)] line-clamp-2">
            {project.description || 'No description'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[var(--success-soft)] ml-3 flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse"></span>
          <span className="text-caption text-[var(--success)]">Active</span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-3">
          {/* Agent avatars */}
          <div className="avatar-stack">
            {agents.slice(0, 3).map(agent => (
              <div
                key={agent._id}
                className="w-7 h-7 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-sm overflow-hidden"
                title={agent.name}
              >
                {agent.emoji || agent.name[0]?.toUpperCase() || '🤖'}
              </div>
            ))}
            {agents.length > 3 && (
              <div className="w-7 h-7 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-caption text-[var(--text-tertiary)]">
                +{agents.length - 3}
              </div>
            )}
            {agents.length === 0 && (
              <div className="w-7 h-7 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-caption text-[var(--text-tertiary)]">
                —
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1 text-caption text-[var(--text-tertiary)]">
            <span className="text-[var(--success)]">●</span>
            <span>{onlineCount} online</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-caption text-[var(--text-tertiary)]">
          <span>◈</span>
          <span>{taskCount} tasks</span>
        </div>
      </div>
    </div>
  )
}
