import { useLocation } from 'wouter'
import { Crown, AlertCircle, Zap, Clock } from 'lucide-react'
import { StatusDot, STATUS_STYLES } from './ui'
import { formatTimeAgo } from '../utils/time'
import type { Agent } from '../types'

interface AgentCardProps {
  agent: Agent
  isLeader?: boolean
}

export function AgentCard({ agent, isLeader }: AgentCardProps) {
  const [, setLocation] = useLocation()

  const style = STATUS_STYLES[agent.status] || STATUS_STYLES.offline

  // Calculate activity level based on session count and recency
  const isActive = agent.status === 'active' || agent.status === 'busy'
  const hasRecentActivity = agent.lastActive && 
    (Date.now() - new Date(agent.lastActive).getTime()) < 24 * 60 * 60 * 1000

  return (
    <div
      onClick={() => setLocation(`/agents/${agent.id}`)}
      className="group relative bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 hover:border-indigo-500/40 rounded-2xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] hover:-translate-y-0.5 cursor-pointer overflow-hidden"
    >
      {/* Status glow effect for active agents */}
      {isActive && (
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      )}

      <div className="relative p-5">
        {/* Header with avatar and status */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div 
              className={`
                w-12 h-12 rounded-xl flex items-center justify-center text-xl 
                ${style.bg} ${style.text} 
                ${isActive ? 'ring-2 ring-offset-2 ring-offset-neutral-900 ring-indigo-500/30' : ''}
                transition-all duration-300 group-hover:scale-105
              `}
            >
              {agent.emoji || agent.name[0]}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-neutral-200 text-sm truncate">{agent.name}</span>
                {isLeader && (
                  <span 
                    title="Swarm Leader"
                    className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20"
                  >
                    <Crown className="w-3 h-3 text-amber-400" />
                    <span className="text-[9px] font-semibold text-amber-400 uppercase tracking-wider">Lead</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] font-medium text-neutral-500">{agent.role || 'Agent'}</span>
                {agent.model && (
                  <span className="text-[10px] font-mono text-indigo-400/80 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                    {agent.model}
                  </span>
                )}
              </div>
            </div>
          </div>
          <StatusDot status={agent.status} pulse={isActive} />
        </div>

        {/* Current task or activity indicator */}
        <div className="mb-4">
          {agent.currentTask ? (
            <div className="flex items-center gap-2 text-xs text-neutral-400 bg-neutral-950/80 border border-neutral-800/50 rounded-lg p-3">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-mono truncate">{agent.currentTask}</span>
            </div>
          ) : hasRecentActivity ? (
            <div className="flex items-center gap-2 text-xs text-neutral-500 bg-neutral-950/50 border border-neutral-800/30 rounded-lg p-3">
              <Clock className="w-3.5 h-3.5" />
              <span>Last active {formatTimeAgo(new Date(agent.lastActive!).getTime())}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-neutral-600 bg-neutral-950/30 border border-neutral-800/20 rounded-lg p-3">
              <Zap className="w-3.5 h-3.5" />
              <span>Waiting for tasks</span>
            </div>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded-lg bg-neutral-950/50 border border-neutral-800/30">
            <div className="text-sm font-bold text-neutral-300">{agent.sessionCount ?? 0}</div>
            <div className="text-[10px] text-neutral-600 uppercase tracking-wider">Sessions</div>
          </div>
          
          <div className={`text-center p-2 rounded-lg border ${(agent.errorCount || 0) > 0 ? 'bg-red-950/20 border-red-500/20' : 'bg-neutral-950/50 border-neutral-800/30'}`}>
            <div className={`text-sm font-bold ${(agent.errorCount || 0) > 0 ? 'text-red-400' : 'text-neutral-300'}`}>
              {agent.errorCount || 0}
            </div>
            <div className="text-[10px] text-neutral-600 uppercase tracking-wider flex items-center justify-center gap-1">
              {(agent.errorCount || 0) > 0 && <AlertCircle className="w-3 h-3 text-red-400" />}
              Errors
            </div>
          </div>
          
          <div className="text-center p-2 rounded-lg bg-neutral-950/50 border border-neutral-800/30">
            <div className="text-sm font-bold text-neutral-300">{formatTokens(agent.totalTokens || 0)}</div>
            <div className="text-[10px] text-neutral-600 uppercase tracking-wider">Tokens</div>
          </div>
        </div>
      </div>

      {/* Bottom accent line for active agents */}
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
      )}
    </div>
  )
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`
  return n.toString()
}
