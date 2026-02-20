import { useLocation } from 'wouter'
import { Crown, AlertCircle } from 'lucide-react'
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

  return (
    <div
      onClick={() => setLocation(`/agents/${agent.id}`)}
      className="group relative bg-neutral-900 border border-neutral-800 hover:border-indigo-500/50 p-4 rounded-xl transition-all hover:shadow-[0_0_15px_rgba(99,102,241,0.1)] cursor-pointer flex flex-col h-full"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${style.bg} ${style.text}`}>
            {agent.emoji || agent.name[0]}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-neutral-200 text-sm">{agent.name}</span>
              {isLeader && (
                <span title="Swarm Leader">
                  <Crown className="w-3.5 h-3.5 text-amber-500" />
                </span>
              )}
            </div>
            <div className="text-[10px] font-mono text-neutral-600">
              {agent.role || 'Agent'}
            </div>
          </div>
        </div>
        <StatusDot status={agent.status} pulse={agent.status === 'active'} />
      </div>

      <div className="space-y-3 flex-1">
        {/* Current task or last active */}
        {agent.currentTask ? (
          <div className="text-xs text-neutral-400 bg-neutral-950/50 p-2 rounded border border-neutral-800/50 truncate font-mono">
            <span className="text-emerald-500 mr-2">&#9656;</span>
            {agent.currentTask}
          </div>
        ) : agent.lastActive ? (
          <div className="text-xs text-neutral-500 bg-neutral-950/50 p-2 rounded border border-neutral-800/50 truncate font-mono">
            Last active {formatTimeAgo(new Date(agent.lastActive).getTime())}
          </div>
        ) : null}

        {/* Stats row */}
        <div className="flex items-center gap-3 text-[10px] text-neutral-500">
          {agent.model && <span className="font-mono text-indigo-400">{agent.model}</span>}
          {agent.sessionCount != null && <span>{agent.sessionCount} sessions</span>}
          {(agent.errorCount || 0) > 0 && (
            <span className="text-red-400 flex items-center gap-0.5">
              <AlertCircle className="w-3 h-3" />
              {agent.errorCount}
            </span>
          )}
          {(agent.totalTokens || 0) > 0 && (
            <span className="text-neutral-600">{formatTokens(agent.totalTokens!)}t</span>
          )}
        </div>
      </div>

    </div>
  )
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`
  return n.toString()
}
