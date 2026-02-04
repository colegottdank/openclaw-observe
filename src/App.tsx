import { useState } from 'react'
import { useQuery } from 'convex/react'
import { projectsList, agentsList, activitiesFeed } from './convex'
import PasswordGate from './components/PasswordGate'
import Sidebar from './components/Sidebar'
import ProjectView from './components/ProjectView'
import ActivityFeed from './components/ActivityFeed'
import AgentsOverview from './components/AgentsOverview'

type View = 'overview' | 'project' | 'activity' | 'agents'

function Dashboard() {
  const [view, setView] = useState<View>('overview')
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  const projects = useQuery(projectsList, { status: "active" })
  const agents = useQuery(agentsList, {})
  const activities = useQuery(activitiesFeed, { limit: 50 })

  const handleSelectProject = (id: string) => {
    setSelectedProjectId(id)
    setView('project')
  }

  return (
    <div className="flex h-screen">
      <Sidebar
        projects={projects}
        agents={agents}
        currentView={view}
        selectedProjectId={selectedProjectId}
        onSelectView={setView}
        onSelectProject={handleSelectProject}
      />
      <main className="flex-1 overflow-auto" style={{ background: 'var(--bg-primary)' }}>
        {view === 'overview' && (
          <Overview
            projects={projects}
            agents={agents}
            activities={activities}
            onSelectProject={handleSelectProject}
          />
        )}
        {view === 'project' && selectedProjectId && (
          <ProjectView projectId={selectedProjectId} allAgents={agents} />
        )}
        {view === 'activity' && <ActivityFeed activities={activities} agents={agents} />}
        {view === 'agents' && <AgentsOverview agents={agents} projects={projects} />}
      </main>
    </div>
  )
}

function Overview({
  projects,
  agents,
  activities,
  onSelectProject,
}: {
  projects: any[] | undefined
  agents: any[] | undefined
  activities: any[] | undefined
  onSelectProject: (id: string) => void
}) {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
        Mission Control
      </h1>
      <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
        {agents?.length || 0} agents across {projects?.length || 0} projects
      </p>

      {/* Project Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {projects?.map((project: any) => {
          const projectAgents = agents?.filter((a: any) => a.projectId === project._id) || []
          return (
            <div
              key={project._id}
              onClick={() => onSelectProject(project._id)}
              className="rounded-lg p-5 cursor-pointer transition-all duration-200 hover:translate-y-[-2px]"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">{project.name}</h3>
                <StatusBadge status={project.status} />
              </div>
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                {project.description}
              </p>
              <div className="flex gap-2">
                {projectAgents.map((agent: any) => (
                  <span
                    key={agent._id}
                    className="text-xs px-2 py-1 rounded-full"
                    style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                  >
                    {agent.emoji || '🤖'} {agent.name}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
        {projects?.length === 0 && (
          <div className="col-span-2 text-center py-12" style={{ color: 'var(--text-muted)' }}>
            No active projects. Spin up a swarm to get started.
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
      <div className="space-y-2">
        {activities?.slice(0, 10).map((activity: any) => (
          <ActivityItem key={activity._id} activity={activity} agents={agents} />
        ))}
        {(!activities || activities.length === 0) && (
          <p style={{ color: 'var(--text-muted)' }}>No activity yet.</p>
        )}
      </div>
    </div>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    active: { bg: 'rgba(63, 185, 80, 0.15)', text: 'var(--accent-green)' },
    paused: { bg: 'rgba(210, 153, 34, 0.15)', text: 'var(--accent-yellow)' },
    complete: { bg: 'rgba(88, 166, 255, 0.15)', text: 'var(--accent-blue)' },
    archived: { bg: 'rgba(139, 148, 158, 0.15)', text: 'var(--text-secondary)' },
    idle: { bg: 'rgba(139, 148, 158, 0.15)', text: 'var(--text-secondary)' },
    blocked: { bg: 'rgba(248, 81, 73, 0.15)', text: 'var(--accent-red)' },
    inbox: { bg: 'rgba(139, 148, 158, 0.15)', text: 'var(--text-secondary)' },
    assigned: { bg: 'rgba(188, 140, 255, 0.15)', text: 'var(--accent-purple)' },
    in_progress: { bg: 'rgba(88, 166, 255, 0.15)', text: 'var(--accent-blue)' },
    review: { bg: 'rgba(210, 153, 34, 0.15)', text: 'var(--accent-yellow)' },
    done: { bg: 'rgba(63, 185, 80, 0.15)', text: 'var(--accent-green)' },
    high: { bg: 'rgba(248, 81, 73, 0.15)', text: 'var(--accent-red)' },
    medium: { bg: 'rgba(210, 153, 34, 0.15)', text: 'var(--accent-yellow)' },
    low: { bg: 'rgba(139, 148, 158, 0.15)', text: 'var(--text-secondary)' },
  }
  const c = colors[status] || colors.idle
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: c.bg, color: c.text }}
    >
      {status.replace('_', ' ')}
    </span>
  )
}

export function ActivityItem({ activity, agents }: { activity: any; agents: any[] | undefined }) {
  const agent = agents?.find((a: any) => a._id === activity.agentId)
  const timeAgo = getTimeAgo(activity.createdAt)

  const iconMap: Record<string, string> = {
    task_created: '📋',
    task_updated: '✏️',
    task_assigned: '👤',
    message_sent: '💬',
    document_created: '📄',
    agent_status_changed: '🔄',
    project_created: '🚀',
    swarm_created: '🐝',
    swarm_dissolved: '💨',
  }

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-lg"
      style={{ background: 'var(--bg-secondary)' }}
    >
      <span className="text-lg">{iconMap[activity.type] || '📌'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          {agent && (
            <span className="font-medium" style={{ color: 'var(--accent-blue)' }}>
              {agent.emoji} {agent.name}
            </span>
          )}{' '}
          <span style={{ color: 'var(--text-secondary)' }}>{activity.message}</span>
        </p>
      </div>
      <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
        {timeAgo}
      </span>
    </div>
  )
}

export function getTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString()
}

export default function App() {
  return (
    <PasswordGate>
      <Dashboard />
    </PasswordGate>
  )
}
