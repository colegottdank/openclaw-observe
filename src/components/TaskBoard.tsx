import { useMemo, useState } from 'react'

interface Agent {
  _id: string
  name: string
  emoji?: string
  role?: string
}

export interface Task {
  _id: string
  title: string
  description?: string
  status: 'inbox' | 'assigned' | 'acknowledged' | 'in_progress' | 'review' | 'done' | 'blocked' | 'cancelled'
  assigneeIds: string[]
  priority?: 'low' | 'medium' | 'high'
  createdAt: number
  updatedAt: number
  projectId?: string
}

interface TaskBoardProps {
  tasks: Task[]
  agents: Agent[]
}

const COLUMNS: { id: Task['status']; label: string; color: string; bg: string; text: string }[] = [
  { id: 'inbox', label: 'Inbox', color: 'bg-neutral-500', bg: 'bg-neutral-500/10', text: 'text-neutral-400' },
  { id: 'assigned', label: 'Assigned', color: 'bg-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-400' },
  { id: 'acknowledged', label: 'Ack', color: 'bg-cyan-500', bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-indigo-500', bg: 'bg-indigo-500/10', text: 'text-indigo-400' },
  { id: 'review', label: 'Review', color: 'bg-purple-500', bg: 'bg-purple-500/10', text: 'text-purple-400' },
  { id: 'done', label: 'Done', color: 'bg-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
]

function formatTimeAgo(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getPriorityBadge(title: string, priority?: string) {
  // Infer priority from title if not set, or use explicit
  let p = priority
  if (!p) {
    if (title.toLowerCase().includes('p0')) p = 'high'
    else if (title.toLowerCase().includes('p1')) p = 'medium'
    else if (title.toLowerCase().includes('p2')) p = 'low'
  }

  if (p === 'high') return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">P0</span>
  if (p === 'medium') return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">P1</span>
  if (p === 'low') return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 shrink-0">P2</span>
  return null
}

function getTypeBadge(title: string) {
  if (title.toLowerCase().includes('epic')) return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30 shrink-0">EPIC</span>
  if (title.toLowerCase().includes('fix') || title.toLowerCase().includes('bug')) return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 shrink-0">BUG</span>
  return null
}

export function TaskBoard({ tasks, agents }: TaskBoardProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const tasksByColumn = useMemo(() => {
    const grouped: Record<string, Task[]> = {
      inbox: [],
      assigned: [],
      acknowledged: [],
      in_progress: [],
      review: [],
      done: [],
      blocked: [],
      cancelled: [],
    }
    tasks.forEach(task => {
      if (grouped[task.status]) {
        grouped[task.status].push(task)
      } else {
        if (!grouped['inbox']) grouped['inbox'] = []
        grouped['inbox'].push(task)
      }
    })
    return grouped
  }, [tasks])

  const blockedColumn = { id: 'blocked' as const, label: 'Blocked', color: 'bg-rose-500', bg: 'bg-rose-500/10', text: 'text-rose-400' }
  const visibleColumns = [
    ...COLUMNS,
    ...(tasksByColumn.blocked.length > 0 ? [blockedColumn] : [])
  ]

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-neutral-500 border border-neutral-800 rounded-xl border-dashed bg-neutral-900/30">
        <p className="text-sm">No active tasks</p>
      </div>
    )
  }

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-6 px-1 h-full min-w-full items-start snap-x snap-mandatory lg:snap-none">
        {visibleColumns.map(column => {
          const columnTasks = tasksByColumn[column.id] || []
          
          return (
            <div key={column.id} className="w-[300px] flex-shrink-0 flex flex-col h-full max-h-full snap-center lg:snap-align-none first:ml-4 last:mr-4 lg:first:ml-0 lg:last:mr-0">
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3 px-1 sticky top-0 z-10 bg-[#0A0A0A] py-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${column.color}`}></span>
                  <span className="text-xs font-bold text-neutral-300 uppercase tracking-wide">{column.label}</span>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${column.bg} ${column.text}`}>
                  {columnTasks.length}
                </span>
              </div>

              {/* Task List */}
              <div className="flex flex-col gap-3 overflow-y-auto pr-1 pb-2 scrollbar-thin flex-1 min-h-0">
                {columnTasks.map(task => {
                  const assignee = task.assigneeIds.length > 0 ? agents.find(a => a._id === task.assigneeIds[0]) : null
                  
                  return (
                    <div
                      key={task._id}
                      onClick={() => setSelectedTask(task)}
                      className="group relative bg-neutral-900 border border-neutral-800 rounded-lg p-3 hover:border-neutral-700 hover:shadow-[0_4px_12px_rgba(0,0,0,0.5)] transition-all duration-200 cursor-pointer flex flex-col justify-between h-[160px]"
                    >
                      {/* Hover Accent */}
                      <div className={`absolute left-0 top-3 bottom-3 w-0.5 rounded-r ${column.color} opacity-0 group-hover:opacity-100 transition-opacity`}></div>

                      <div className="flex-1 min-h-0">
                        {/* Meta / Tags */}
                        <div className="flex items-center gap-2 mb-2 flex-wrap h-[20px] overflow-hidden">
                          {getPriorityBadge(task.title, task.priority)}
                          {getTypeBadge(task.title)}
                        </div>

                        {/* Title */}
                        <h4 className="text-[13px] font-medium text-neutral-200 leading-snug mb-1 group-hover:text-white transition-colors line-clamp-2">
                          {task.title}
                        </h4>

                        {/* Description Preview */}
                        {task.description && (
                          <p className="text-[11px] text-neutral-500 leading-relaxed line-clamp-2">
                            {task.description}
                          </p>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between border-t border-neutral-800/50 pt-2 mt-2 h-[24px]">
                        {/* Assignee */}
                        {assignee ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded bg-neutral-800 flex items-center justify-center text-[10px] shadow-sm">
                              {assignee.emoji || '🤖'}
                            </div>
                            <span className="text-[11px] text-neutral-400 font-medium truncate max-w-[80px]">
                              {assignee.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-neutral-600 italic">Unassigned</span>
                        )}

                        {/* Timestamp */}
                        <span className="text-[10px] text-neutral-600 font-mono">
                          {formatTimeAgo(task.updatedAt)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedTask(null)}>
          <div 
            className="bg-[#111] border border-neutral-800 rounded-xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-[#111]">
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                  COLUMNS.find(c => c.id === selectedTask.status)?.bg || 'bg-neutral-800'
                } ${
                  COLUMNS.find(c => c.id === selectedTask.status)?.text || 'text-neutral-400'
                }`}>
                  {selectedTask.status.replace('_', ' ')}
                </span>
                <span className="text-xs text-neutral-500 font-mono">ID: {selectedTask._id.slice(-6)}</span>
              </div>
              <button 
                onClick={() => setSelectedTask(null)}
                className="text-neutral-500 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto">
              <h2 className="text-xl font-semibold text-white mb-4 leading-tight">{selectedTask.title}</h2>
              
              <div className="flex flex-wrap gap-2 mb-6">
                {getPriorityBadge(selectedTask.title, selectedTask.priority)}
                {getTypeBadge(selectedTask.title)}
              </div>

              {selectedTask.description ? (
                <div className="prose prose-invert prose-sm max-w-none text-neutral-300">
                  <p className="whitespace-pre-wrap">{selectedTask.description}</p>
                </div>
              ) : (
                <p className="text-neutral-600 italic text-sm">No description provided.</p>
              )}

              {/* Meta Details */}
              <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-neutral-800">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold block mb-1">Assignee</label>
                  {selectedTask.assigneeIds.length > 0 ? (
                    <div className="flex items-center gap-2">
                      {selectedTask.assigneeIds.map(id => {
                        const agent = agents.find(a => a._id === id)
                        return agent ? (
                          <div key={id} className="flex items-center gap-1.5 bg-neutral-800/50 px-2 py-1 rounded border border-neutral-800">
                            <span className="text-sm">{agent.emoji || '🤖'}</span>
                            <span className="text-sm text-neutral-300">{agent.name}</span>
                          </div>
                        ) : null
                      })}
                    </div>
                  ) : (
                    <span className="text-sm text-neutral-600">Unassigned</span>
                  )}
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold block mb-1">Created</label>
                  <span className="text-sm text-neutral-300 font-mono">
                    {new Date(selectedTask.createdAt).toLocaleString()}
                  </span>
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold block mb-1">Project</label>
                  <span className="text-sm text-neutral-300">
                    {selectedTask.projectId ? 'Project Linked' : 'No Project'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
