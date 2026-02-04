import { StatusBadge, getTimeAgo } from '../App'
import { useState } from 'react'

interface TaskBoardProps {
  tasksByStatus: Record<string, any[]>
  agents: any[] | undefined
}

const COLUMNS = [
  { key: 'inbox', label: 'Inbox', icon: '📥' },
  { key: 'assigned', label: 'Assigned', icon: '👤' },
  { key: 'in_progress', label: 'In Progress', icon: '🔄' },
  { key: 'review', label: 'Review', icon: '👁️' },
  { key: 'done', label: 'Done', icon: '✅' },
  { key: 'blocked', label: 'Blocked', icon: '🚫' },
]

export default function TaskBoard({ tasksByStatus, agents }: TaskBoardProps) {
  const [expandedTask, setExpandedTask] = useState<string | null>(null)

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((col) => {
        const tasks = tasksByStatus[col.key] || []
        if (col.key === 'blocked' && tasks.length === 0) return null
        return (
          <div key={col.key} className="min-w-[260px] w-[260px] shrink-0">
            {/* Column Header */}
            <div className="flex items-center gap-2 mb-3 px-1">
              <span>{col.icon}</span>
              <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                {col.label}
              </span>
              <span
                className="text-xs px-1.5 py-0.5 rounded-full"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
              >
                {tasks.length}
              </span>
            </div>

            {/* Tasks */}
            <div className="space-y-2">
              {tasks.map((task: any) => (
                <TaskCard
                  key={task._id}
                  task={task}
                  agents={agents}
                  expanded={expandedTask === task._id}
                  onToggle={() =>
                    setExpandedTask(expandedTask === task._id ? null : task._id)
                  }
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TaskCard({
  task,
  agents,
  expanded,
  onToggle,
}: {
  task: any
  agents: any[] | undefined
  expanded: boolean
  onToggle: () => void
}) {
  const assignees = task.assigneeIds
    ?.map((id: string) => agents?.find((a: any) => a._id === id))
    .filter(Boolean) || []

  return (
    <div
      className="rounded-lg p-3 cursor-pointer transition-all duration-150"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
      }}
      onClick={onToggle}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium leading-snug">{task.title}</h4>
        {task.priority && <StatusBadge status={task.priority} />}
      </div>

      {expanded && (
        <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {task.description}
        </p>
      )}

      <div className="flex items-center justify-between mt-2">
        <div className="flex -space-x-1">
          {assignees.map((agent: any) => (
            <span
              key={agent._id}
              className="text-sm"
              title={agent.name}
            >
              {agent.emoji || '🤖'}
            </span>
          ))}
        </div>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {getTimeAgo(task.updatedAt)}
        </span>
      </div>
    </div>
  )
}
