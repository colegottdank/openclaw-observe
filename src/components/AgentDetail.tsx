import { useState, useEffect, useMemo } from 'react'
import { ArrowLeft, Bot, X, Search, ScrollText } from 'lucide-react'
import { useSessions, useSessionLogs } from '../hooks'
import { getAgentColor, normalizeAgentId } from '../utils/agents'
import { formatTimeAgo, formatDuration, getSessionDuration } from '../utils/time'
import { ResizablePanel, StatusDot, StatusBadge, SimpleSelect } from './ui'
import { SessionTraceViewer } from './SessionTraceViewer'
import type { Agent, Session } from '../types'

interface AgentDetailProps {
  agent: Agent
  onBack: () => void
}

export function AgentDetail({ agent, onBack }: AgentDetailProps) {
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const agentId = agent.id
  const { data: sessions, loading: loadingSessions, error: sessionsError } = useSessions(agentId)

  const selectedAgentId = selectedSession ? normalizeAgentId(selectedSession.agentId || agentId) : null
  const { data: sessionLogs, loading: logsLoading } = useSessionLogs(
    selectedAgentId,
    selectedSession?.sessionId || null,
    selectedSession?.status || null
  )

  const agentColor = getAgentColor(agentId)

  // Filter sessions
  const filteredSessions = useMemo(() => {
    const list = sessions || []
    return list.filter(session => {
      if (statusFilter !== 'all' && session.status !== statusFilter) return false
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        const matchesLabel = session.label?.toLowerCase().includes(term)
        const matchesSummary = session.summary?.toLowerCase().includes(term)
        const matchesId = session.sessionId.toLowerCase().includes(term)
        if (!matchesLabel && !matchesSummary && !matchesId) return false
      }
      return true
    })
  }, [sessions, statusFilter, searchTerm])

  const openSession = (session: Session) => {
    setSelectedSession(session)
    setSidebarOpen(true)
  }

  const closeSidebar = () => {
    setSidebarOpen(false)
    setSelectedSession(null)
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (sidebarOpen) closeSidebar()
        else onBack()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [sidebarOpen, onBack])

  const sessionList = sessions || []
  const activeSessions = sessionList.filter(s => s.status === 'active').length

  return (
    <div className="flex flex-col h-full bg-neutral-950 text-neutral-300">
      {/* HEADER */}
      <div className="h-16 border-b border-neutral-800 flex items-center px-6 bg-neutral-900/50 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-neutral-800 rounded-md text-neutral-500 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-neutral-800" />
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded flex items-center justify-center text-sm font-bold"
              style={{ backgroundColor: `${agentColor}15`, color: agentColor }}
            >
              {agent.emoji || agent.name[0]}
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-none">{agent.name}</h1>
              <div className="flex items-center gap-2 text-xs font-mono text-neutral-500 mt-1">
                <span>{agent.id}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="border-b border-neutral-900 p-4 bg-neutral-900/20 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-white">Sessions</span>
            {activeSessions > 0 && (
              <span className="text-xs px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-emerald-400">
                {activeSessions} active
              </span>
            )}
          </div>
          <span className="text-xs text-neutral-600">
            {filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-3">
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

          {(searchTerm || statusFilter !== 'all') && (
            <button
              onClick={() => { setSearchTerm(''); setStatusFilter('all') }}
              className="px-3 py-2 text-xs text-neutral-400 hover:text-white transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* SESSION LIST */}
      <div className="flex-1 overflow-auto">
        {loadingSessions && !sessions ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-3 text-neutral-500">
              <div className="w-5 h-5 border-2 border-neutral-700 border-t-emerald-500 rounded-full animate-spin" />
              Loading sessions...
            </div>
          </div>
        ) : sessionsError ? (
          <div className="flex items-center justify-center h-64 text-red-500 text-sm">
            {sessionsError}
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-neutral-500">
            <ScrollText className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">No sessions found</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-800/50">
            {filteredSessions.map(session => {
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
                  <div className="shrink-0">
                    <StatusDot status={session.status} pulse={session.status === 'active'} />
                  </div>

                  <div className="shrink-0">
                    <Bot className="w-3.5 h-3.5" style={{ color: agentColor }} />
                  </div>

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

                  {duration != null && duration > 0 && (
                    <span className="text-xs text-neutral-600 font-mono shrink-0 w-14 text-right">
                      {formatDuration(duration)}
                    </span>
                  )}

                  <StatusBadge status={session.status} className="shrink-0" />

                  <span className="text-xs text-neutral-600 font-mono shrink-0 w-16 text-right">
                    {session.updatedAt ? formatTimeAgo(session.updatedAt) : ''}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* SESSION DETAIL SIDEBAR */}
      <ResizablePanel open={sidebarOpen} onClose={closeSidebar} storageKey="agent-detail" defaultWidth={640}>
        <div className="flex items-center justify-between p-4 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Bot className="w-5 h-5 shrink-0" style={{ color: agentColor }} />
            <div className="min-w-0">
              <h3 className="font-medium text-white truncate">
                {selectedSession?.label || selectedSession?.summary || 'Session Trace'}
              </h3>
              <p className="text-xs text-neutral-500">
                {agent.name}
                {selectedSession?.channelName && ` \u00b7 ${selectedSession.channelName}`}
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
