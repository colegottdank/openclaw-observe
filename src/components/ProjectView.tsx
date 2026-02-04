import { useQuery } from 'convex/react'
import { projectsGet, tasksList, agentsGetByProject, activitiesFeed } from '../convex'
import { StatusBadge, ActivityItem, getTimeAgo } from '../App'
import TaskBoard from './TaskBoard'

interface ProjectViewProps {
  projectId: string
  allAgents: any[] | undefined
}

export default function ProjectView({ projectId, allAgents }: ProjectViewProps) {
  const project = useQuery(projectsGet, { id: projectId as any })
  const allTasks = useQuery(tasksList, {})
  const projectAgents = useQuery(agentsGetByProject, { projectId: projectId as any })
  const activities = useQuery(activitiesFeed, { limit: 100 })

  // Filter tasks for this project
  const tasks = allTasks?.filter((t: any) => t.projectId === projectId)
  const projectActivities = activities?.filter((a: any) => a.projectId === projectId)

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-muted)' }}>
        Loading...
      </div>
    )
  }

  const tasksByStatus = {
    inbox: tasks?.filter((t: any) => t.status === 'inbox') || [],
    assigned: tasks?.filter((t: any) => t.status === 'assigned') || [],
    in_progress: tasks?.filter((t: any) => t.status === 'in_progress') || [],
    review: tasks?.filter((t: any) => t.status === 'review') || [],
    done: tasks?.filter((t: any) => t.status === 'done') || [],
    blocked: tasks?.filter((t: any) => t.status === 'blocked') || [],
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Project Header */}
      <div className="flex items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <StatusBadge status={project.status} />
          </div>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>
            {project.description}
          </p>
        </div>
      </div>

      {/* Agent Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {projectAgents?.map((agent: any) => (
          <AgentCard key={agent._id} agent={agent} tasks={tasks} />
        ))}
      </div>

      {/* Task Board */}
      <h2 className="text-lg font-semibold mb-4">Tasks</h2>
      {tasks && tasks.length > 0 ? (
        <TaskBoard tasksByStatus={tasksByStatus} agents={allAgents} />
      ) : (
        <div
          className="rounded-lg p-8 text-center"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
        >
          No tasks yet. Agents will create tasks as they work.
        </div>
      )}

      {/* Project Activity */}
      <h2 className="text-lg font-semibold mt-8 mb-4">Activity</h2>
      <div className="space-y-2">
        {projectActivities?.slice(0, 15).map((activity: any) => (
          <ActivityItem key={activity._id} activity={activity} agents={allAgents} />
        ))}
        {(!projectActivities || projectActivities.length === 0) && (
          <p style={{ color: 'var(--text-muted)' }}>No activity yet.</p>
        )}
      </div>
    </div>
  )
}

function AgentCard({ agent, tasks }: { agent: any; tasks: any[] | undefined }) {
  const agentTasks = tasks?.filter((t: any) => t.assigneeIds?.includes(agent._id)) || []
  const activeTasks = agentTasks.filter((t: any) => t.status === 'in_progress')
  const isOnline = agent.lastHeartbeat && Date.now() - agent.lastHeartbeat < 3600000
  const isStale = agent.lastHeartbeat && Date.now() - agent.lastHeartbeat < 7200000 && !isOnline

  return (
    <div
      className="rounded-lg p-4"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{agent.emoji || '🤖'}</span>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{agent.name}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {agent.role}
          </p>
        </div>
        <span
          className="ml-auto w-2 h-2 rounded-full shrink-0"
          style={{
            background: isOnline
              ? 'var(--accent-green)'
              : isStale
                ? 'var(--accent-yellow)'
                : 'var(--text-muted)',
          }}
          title={
            isOnline
              ? 'Online (heartbeat < 1h)'
              : isStale
                ? 'Stale (heartbeat 1-2h)'
                : 'Offline'
          }
        />
      </div>
      <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
        <span>{agentTasks.length} tasks</span>
        {activeTasks.length > 0 && (
          <span style={{ color: 'var(--accent-blue)' }}>{activeTasks.length} active</span>
        )}
      </div>
      {agent.lastHeartbeat && (
        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
          Last seen {getTimeAgo(agent.lastHeartbeat)}
        </p>
      )}
    </div>
  )
}
