import { useState, useEffect, useMemo } from 'react'
import { ArrowLeft, Cpu, ScrollText } from 'lucide-react'
import { useSessions, useSessionLogs } from '../hooks'
import { getAgentColor } from '../utils/agents'
import { formatTimeAgo, formatDuration, getSessionDuration } from '../utils/time'
import { StatusDot } from './ui'
import { SessionTraceViewer } from './SessionTraceViewer'
import type { Agent } from '../types'

interface AgentDetailProps {
  agent: Agent
  onBack: () => void
}

export function AgentDetail({ agent, onBack }: AgentDetailProps) {
  const searchParams = new URLSearchParams(window.location.search)
  const initialTab = searchParams.get('tab') || 'overview'

  const [activeTab, setActiveTab] = useState<'overview' | 'sessions'>(initialTab as 'overview' | 'sessions')
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)

  const agentId = agent.id
  // Always fetch sessions so overview can show stats
  const { data: sessions, loading: loadingSessions, error: sessionsError } = useSessions(agentId)
  const selectedSessionStatus = sessions?.find(s => s.sessionId === selectedSessionId)?.status || null
  const { data: sessionLogs, loading: loadingLogs } = useSessionLogs(agentId, selectedSessionId, selectedSessionStatus)

  const agentColor = getAgentColor(agentId)

  // Session stats
  const sessionStats = useMemo(() => {
    if (!sessions) return { total: 0, active: 0, aborted: 0, recent: [] }
    const active = sessions.filter(s => s.status === 'active').length
    const aborted = sessions.filter(s => s.status === 'aborted').length
    const recent = sessions.slice(0, 8)
    return { total: sessions.length, active, aborted, recent }
  }, [sessions])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedSessionId) setSelectedSessionId(null)
        else onBack()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedSessionId, onBack])

  return (
    <div className="flex flex-col h-full bg-neutral-950 text-neutral-300">
      {/* HEADER */}
      <div className="h-16 border-b border-neutral-800 flex items-center justify-between px-6 bg-neutral-900/50">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (selectedSessionId) setSelectedSessionId(null)
              else onBack()
            }}
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
                <span>{selectedSessionId ? `Session: ${selectedSessionId.slice(0, 12)}...` : agent.id}</span>
              </div>
            </div>
          </div>
        </div>

        {/* TABS */}
        {!selectedSessionId && (
          <div className="flex gap-1 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
            {(['overview', 'sessions'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${
                  activeTab === tab
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-hidden flex flex-col">

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && !selectedSessionId && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-5xl mx-auto space-y-6">

              {/* Agent Info Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-neutral-900/50 border border-neutral-800">
                  <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-1">Status</div>
                  <div className={`text-sm font-mono ${
                    agent.status === 'active' || agent.status === 'busy' ? 'text-emerald-400' :
                    agent.status === 'idle' ? 'text-amber-400' : 'text-neutral-400'
                  }`}>
                    {agent.status}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-neutral-900/50 border border-neutral-800">
                  <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-1">Model</div>
                  <div className="text-sm font-mono text-indigo-400 truncate">{agent.model || 'default'}</div>
                </div>
                <div className="p-4 rounded-xl bg-neutral-900/50 border border-neutral-800">
                  <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-1">Sessions</div>
                  <div className="text-sm font-mono text-neutral-300">
                    {loadingSessions ? '...' : sessionStats.total}
                    {sessionStats.active > 0 && (
                      <span className="text-emerald-400 ml-1.5 text-xs">({sessionStats.active} active)</span>
                    )}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-neutral-900/50 border border-neutral-800">
                  <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-1">Last Active</div>
                  <div className="text-sm font-mono text-neutral-300">
                    {agent.lastActive ? formatTimeAgo(new Date(agent.lastActive).getTime()) : 'Never'}
                  </div>
                </div>
              </div>

              {/* Config & Workspace */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-neutral-900/50 border border-neutral-800 p-5 rounded-xl">
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-neutral-500" />
                    Configuration
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Agent ID</span>
                      <span className="font-mono text-neutral-300">{agent.id}</span>
                    </div>
                    {agent.role && (
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Role</span>
                        <span className="text-neutral-300">{agent.role}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Model</span>
                      <span className="font-mono text-indigo-400">{agent.model || 'default'}</span>
                    </div>
                    {agent.workspace && (
                      <div className="flex justify-between gap-4">
                        <span className="text-neutral-500 shrink-0">Workspace</span>
                        <span className="font-mono text-neutral-400 truncate text-right">{agent.workspace}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Enabled</span>
                      <span className={agent.enabled !== false ? 'text-emerald-400' : 'text-red-400'}>
                        {agent.enabled !== false ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recent Sessions */}
                <div className="bg-neutral-900/50 border border-neutral-800 p-5 rounded-xl flex flex-col">
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <ScrollText className="w-4 h-4 text-neutral-500" />
                    Recent Sessions
                  </h3>
                  {loadingSessions ? (
                    <div className="text-sm text-neutral-500 text-center py-6">Loading...</div>
                  ) : sessionStats.recent.length === 0 ? (
                    <div className="text-sm text-neutral-500 text-center py-6">No sessions found</div>
                  ) : (
                    <div className="space-y-1.5 flex-1 overflow-y-auto">
                      {sessionStats.recent.map(session => (
                        <button
                          key={session.sessionId}
                          onClick={() => { setActiveTab('sessions'); setSelectedSessionId(session.sessionId) }}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-neutral-800/50 transition-colors group"
                        >
                          <StatusDot status={session.status} pulse={session.status === 'active'} />
                          <span className="text-xs text-neutral-300 truncate flex-1 group-hover:text-white">
                            {session.label || session.displayName || session.sessionId.slice(0, 12)}
                          </span>
                          <span className="text-[10px] text-neutral-600 font-mono shrink-0">
                            {session.updatedAt ? formatTimeAgo(session.updatedAt) : ''}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {sessionStats.total > 8 && (
                    <button
                      onClick={() => setActiveTab('sessions')}
                      className="mt-3 text-xs text-neutral-500 hover:text-white transition-colors"
                    >
                      View all {sessionStats.total} sessions →
                    </button>
                  )}
                </div>
              </div>

              {/* Errors / Aborted */}
              {sessionStats.aborted > 0 && (
                <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-xl">
                  <div className="flex items-center gap-2 text-sm text-red-400 font-medium mb-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    {sessionStats.aborted} aborted session{sessionStats.aborted > 1 ? 's' : ''}
                  </div>
                  <p className="text-xs text-neutral-500">Check the Sessions tab to inspect aborted sessions.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SESSIONS TAB */}
        {activeTab === 'sessions' && !selectedSessionId && (
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-neutral-900/50 sticky top-0 z-10 border-b border-neutral-800">
                <tr>
                  <th className="px-6 py-3 font-medium text-neutral-500 w-12" />
                  <th className="px-6 py-3 font-medium text-neutral-500">Session ID</th>
                  <th className="px-6 py-3 font-medium text-neutral-500">Context</th>
                  <th className="px-6 py-3 font-medium text-neutral-500 text-right">Duration</th>
                  <th className="px-6 py-3 font-medium text-neutral-500 text-right">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/50">
                {loadingSessions ? (
                  <tr><td colSpan={5} className="p-8 text-center text-neutral-500">Loading sessions...</td></tr>
                ) : sessionsError ? (
                  <tr><td colSpan={5} className="p-8 text-center text-red-500">{sessionsError}</td></tr>
                ) : !sessions || sessions.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-neutral-500">No sessions found.</td></tr>
                ) : (
                  sessions.map(session => {
                    const duration = getSessionDuration(session)
                    return (
                      <tr
                        key={session.sessionId}
                        onClick={() => setSelectedSessionId(session.sessionId)}
                        className="hover:bg-neutral-900/40 cursor-pointer transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <StatusDot status={session.status} pulse={session.status === 'active'} />
                        </td>
                        <td className="px-6 py-4 font-mono text-neutral-300 group-hover:text-white">
                          {session.sessionId.split('-')[0]}...
                        </td>
                        <td className="px-6 py-4 text-neutral-400">
                          <div className="flex flex-col gap-1">
                            {session.channel && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                                {session.channel}
                              </span>
                            )}
                            <span className="truncate max-w-[300px] text-xs font-mono text-neutral-300">
                              {session.label || session.displayName || 'Unknown Context'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right text-neutral-500 font-mono text-xs">
                          {duration != null && duration > 0 ? formatDuration(duration) : '-'}
                        </td>
                        <td className="px-6 py-4 text-right text-neutral-500 font-mono text-xs">
                          {session.updatedAt ? formatTimeAgo(session.updatedAt) : '-'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TRACE VIEWER */}
        {selectedSessionId && (
          <SessionTraceViewer logs={sessionLogs || []} loading={loadingLogs} />
        )}

      </div>
    </div>
  )
}
