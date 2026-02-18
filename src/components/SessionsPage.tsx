import { useState, useMemo } from 'react'
import { ScrollText, Bot, X, Search } from 'lucide-react'
import { usePolling } from '../hooks/usePolling'
import { useSessionLogs } from '../hooks'
import { SessionTraceViewer } from './SessionTraceViewer'
import { ResizablePanel, StatusDot, StatusBadge, SimpleSelect } from './ui'
import { getAgentName, getAgentColor, normalizeAgentId } from '../utils/agents'
import { formatTimeAgo, formatDuration, getSessionDuration } from '../utils/time'
import type { Session } from '../types'

async function fetchAllSessions(): Promise<Session[]> {
  const res = await fetch('/api/sessions')
  if (!res.ok) throw new Error('Failed to fetch sessions')
  const data: Session[] = await res.json()
  data.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
  return data
}

export function SessionsPage() {
  const { data: sessions, loading } = usePolling({ fetcher: fetchAllSessions, interval: 5000 })
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [agentFilter, setAgentFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Fetch logs for selected session
  const selectedAgentId = selectedSession ? normalizeAgentId(selectedSession.agentId) : null
  const { data: sessionLogs, loading: logsLoading } = useSessionLogs(
    selectedAgentId,
    selectedSession?.sessionId || null,
    selectedSession?.status || null
  )

  const sessionList = sessions || []

  // Get unique agents from sessions for filter dropdown
  const agentsInSessions = useMemo(() => {
    const ids = new Set(sessionList.map(s => normalizeAgentId(s.agentId)))
    return Array.from(ids).sort()
  }, [sessionList])

  // Filter sessions
  const filteredSessions = useMemo(() => {
    return sessionList.filter(session => {
      if (agentFilter !== 'all' && normalizeAgentId(session.agentId) !== agentFilter) return false
      if (statusFilter !== 'all' && session.status !== statusFilter) return false
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        const matchesLabel = session.label?.toLowerCase().includes(term)
        const matchesSummary = session.summary?.toLowerCase().includes(term)
        const matchesAgent = getAgentName(session.agentId).toLowerCase().includes(term)
        const matchesId = session.sessionId.toLowerCase().includes(term)
        if (!matchesLabel && !matchesSummary && !matchesAgent && !matchesId) return false
      }
      return true
    })
  }, [sessionList, agentFilter, statusFilter, searchTerm])

  const openSession = (session: Session) => {
    setSelectedSession(session)
    setSidebarOpen(true)
  }

  const closeSidebar = () => {
    setSidebarOpen(false)
    setSelectedSession(null)
  }

  const activeSessions = sessionList.filter(s => s.status === 'active').length
  const errorSessions = sessionList.filter(s => s.status === 'aborted').length

  return (
    <div className="h-full bg-neutral-950 text-neutral-300 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-neutral-900 p-4 bg-neutral-900/20 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white">Sessions</h1>
              {activeSessions > 0 && (
                <span className="text-xs px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-emerald-400">
                  {activeSessions} active
                </span>
              )}
            </div>
            <p className="text-neutral-500 text-sm mt-0.5">
              Browse and inspect agent sessions across the swarm
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-2xl font-bold text-white">{sessionList.length}</div>
              <div className="text-xs text-neutral-500">Total</div>
            </div>
            {errorSessions > 0 && (
              <>
                <div className="w-px h-10 bg-neutral-800" />
                <div className="text-right">
                  <div className="text-2xl font-bold text-red-400">{errorSessions}</div>
                  <div className="text-xs text-neutral-500">Errors</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Search sessions..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg py-2 pl-9 pr-3 text-sm text-neutral-300 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-700 transition-colors"
            />
          </div>

          <SimpleSelect
            value={agentFilter}
            options={[
              { value: 'all', label: 'All Agents' },
              ...agentsInSessions.map(id => ({ value: id, label: getAgentName(id) }))
            ]}
            onChange={setAgentFilter}
            className="w-40"
          />

          <SimpleSelect
            value={statusFilter}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'completed', label: 'Completed' },
              { value: 'aborted', label: 'Aborted' }
            ]}
            onChange={setStatusFilter}
            className="w-36"
          />

          {(searchTerm || agentFilter !== 'all' || statusFilter !== 'all') && (
            <button
              onClick={() => { setSearchTerm(''); setAgentFilter('all'); setStatusFilter('all') }}
              className="px-3 py-2 text-xs text-neutral-400 hover:text-white transition-colors"
            >
              Clear filters
            </button>
          )}

          <span className="text-xs text-neutral-600 ml-auto">
            {filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-auto">
        {loading && !sessions ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-3 text-neutral-500">
              <div className="w-5 h-5 border-2 border-neutral-700 border-t-emerald-500 rounded-full animate-spin" />
              Loading sessions...
            </div>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-neutral-500">
            <ScrollText className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">No sessions found</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-800/50">
            {filteredSessions.map(session => {
              const agentColor = getAgentColor(session.agentId)
              const isSelected = selectedSession?.sessionId === session.sessionId
              const duration = getSessionDuration(session)

              return (
                <div
                  key={session.sessionId}
                  onClick={() => openSession(session)}
                  className={`px-4 py-3 hover:bg-neutral-900/50 cursor-pointer transition-colors flex items-center gap-4 ${
                    isSelected ? 'bg-neutral-900/70 border-l-2 border-indigo-500' : 'border-l-2 border-transparent'
                  }`}
                >
                  {/* Status indicator */}
                  <div className="shrink-0">
                    <StatusDot status={session.status} pulse={session.status === 'active'} />
                  </div>

                  {/* Agent badge */}
                  <div className="shrink-0 flex items-center gap-2 w-28">
                    <Bot className="w-3.5 h-3.5" style={{ color: agentColor }} />
                    <span className="text-sm font-medium text-neutral-300 truncate">
                      {getAgentName(session.agentId)}
                    </span>
                  </div>

                  {/* Label / Summary */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-neutral-200 truncate">
                      {session.label || session.summary || session.displayName || 'Untitled session'}
                    </div>
                    {session.channelName && (
                      <div className="text-[10px] text-neutral-600 mt-0.5">
                        via {session.channelName}
                      </div>
                    )}
                  </div>

                  {/* Duration */}
                  {duration != null && duration > 0 && (
                    <span className="text-xs text-neutral-600 font-mono shrink-0 w-14 text-right">
                      {formatDuration(duration)}
                    </span>
                  )}

                  {/* Status badge */}
                  <StatusBadge status={session.status} className="shrink-0" />

                  {/* Time ago */}
                  <span className="text-xs text-neutral-600 font-mono shrink-0 w-16 text-right">
                    {session.updatedAt ? formatTimeAgo(session.updatedAt) : ''}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Session Detail Sidebar */}
      <ResizablePanel open={sidebarOpen} onClose={closeSidebar} storageKey="sessions" defaultWidth={640}>
        <div className="flex items-center justify-between p-4 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Bot className="w-5 h-5 shrink-0" style={{ color: selectedSession ? getAgentColor(selectedSession.agentId) : '#6b7280' }} />
            <div className="min-w-0">
              <h3 className="font-medium text-white truncate">
                {selectedSession?.label || selectedSession?.summary || 'Session Trace'}
              </h3>
              <p className="text-xs text-neutral-500">
                {selectedSession && getAgentName(selectedSession.agentId)}
                {selectedSession?.channelName && ` · ${selectedSession.channelName}`}
              </p>
            </div>
          </div>
          <button onClick={closeSidebar} className="p-2 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {selectedSession && (
          <div className="px-4 py-3 border-b border-neutral-800 bg-neutral-900/50 flex items-center gap-4 text-xs text-neutral-500 shrink-0">
            <StatusBadge status={selectedSession.status} />
            {selectedSession.updatedAt && (
              <span>{formatTimeAgo(selectedSession.updatedAt)}</span>
            )}
            <span className="text-[10px] text-neutral-600 font-mono ml-auto">{selectedSession.sessionId.slice(0, 20)}...</span>
          </div>
        )}

        <SessionTraceViewer logs={sessionLogs || []} loading={logsLoading} />
      </ResizablePanel>
    </div>
  )
}
