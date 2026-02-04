import { StatusBadge, getTimeAgo } from '../App'

interface AgentsOverviewProps {
  agents: any[] | undefined
  projects: any[] | undefined
}

export default function AgentsOverview({ agents, projects }: AgentsOverviewProps) {
  // Group agents: global (no project) and by project
  const globalAgents = agents?.filter((a: any) => !a.projectId) || []
  const projectGroups = new Map<string, { project: any; agents: any[] }>()

  projects?.forEach((p: any) => {
    const projectAgents = agents?.filter((a: any) => a.projectId === p._id) || []
    if (projectAgents.length > 0) {
      projectGroups.set(p._id, { project: p, agents: projectAgents })
    }
  })

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Agents</h1>
      <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
        {agents?.length || 0} total agents
      </p>

      {/* Global Agents */}
      {globalAgents.length > 0 && (
        <div className="mb-8">
          <h2
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'var(--text-muted)' }}
          >
            Global
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {globalAgents.map((agent: any) => (
              <AgentDetailCard key={agent._id} agent={agent} />
            ))}
          </div>
        </div>
      )}

      {/* Project-scoped Agents */}
      {Array.from(projectGroups.values()).map(({ project, agents: pAgents }) => (
        <div key={project._id} className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <h2
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}
            >
              {project.name}
            </h2>
            <StatusBadge status={project.status} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pAgents.map((agent: any) => (
              <AgentDetailCard key={agent._id} agent={agent} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function AgentDetailCard({ agent }: { agent: any }) {
  const isOnline = agent.lastHeartbeat && Date.now() - agent.lastHeartbeat < 3600000
  const isStale = agent.lastHeartbeat && Date.now() - agent.lastHeartbeat < 7200000 && !isOnline

  const statusColor = isOnline
    ? 'var(--accent-green)'
    : isStale
      ? 'var(--accent-yellow)'
      : 'var(--text-muted)'

  const statusLabel = isOnline ? 'Online' : isStale ? 'Stale' : 'Offline'

  return (
    <div
      className="rounded-lg p-4"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex items-start gap-3">
        <span className="text-3xl">{agent.emoji || '🤖'}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">{agent.name}</h3>
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: statusColor }}
            />
          </div>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {agent.role}
          </p>
        </div>
      </div>

      <div
        className="mt-3 pt-3 grid grid-cols-2 gap-y-2 text-xs"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div>
          <span style={{ color: 'var(--text-muted)' }}>Status</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: statusColor }}
            />
            <span style={{ color: statusColor }}>{statusLabel}</span>
          </div>
        </div>
        <div>
          <span style={{ color: 'var(--text-muted)' }}>Agent Status</span>
          <div className="mt-0.5">
            <StatusBadge status={agent.status} />
          </div>
        </div>
        <div className="col-span-2">
          <span style={{ color: 'var(--text-muted)' }}>Last Heartbeat</span>
          <p className="mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {agent.lastHeartbeat ? getTimeAgo(agent.lastHeartbeat) : 'Never'}
          </p>
        </div>
        <div className="col-span-2">
          <span style={{ color: 'var(--text-muted)' }}>Session</span>
          <p className="mt-0.5 font-mono truncate" style={{ color: 'var(--text-secondary)' }}>
            {agent.sessionKey}
          </p>
        </div>
      </div>
    </div>
  )
}
