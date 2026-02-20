import { useAgents } from '../hooks'
import { AgentCard } from './AgentCard'
import { groupAgentsBySwarm } from '../utils/agents'
import { Users, Bot, Crown, Activity, Cpu, Network } from 'lucide-react'

export function AgentsList() {
  const { data: agents } = useAgents()
  const agentList = agents || []
  const { swarms, standalone } = groupAgentsBySwarm(agentList)

  const activeAgentCount = agentList.filter(a => a.status === 'active' || a.status === 'busy').length
  // const totalTokens = agentList.reduce((sum, a) => sum + (a.totalTokens || 0), 0)
  const totalSessions = agentList.reduce((sum, a) => sum + (a.sessionCount || 0), 0)

  return (
    <div className="h-full bg-neutral-950 text-neutral-300 flex flex-col overflow-hidden">
      {/* Premium Header */}
      <div className="border-b border-neutral-800/50 bg-gradient-to-r from-neutral-900/50 via-neutral-900/30 to-neutral-900/50 backdrop-blur-sm">
        <div className="p-6">
          {/* Top row with title and stats */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Title section */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 border border-indigo-500/20 flex items-center justify-center">
                <Network className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Agents</h1>
                <p className="text-neutral-500 text-sm mt-0.5">
                  {agentList.length} agents across {swarms.length} swarm{swarms.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Stats cards */}
            <div className="flex items-center gap-3">
              <StatCard 
                icon={<Bot className="w-4 h-4" />} 
                value={agentList.length} 
                label="Total" 
                color="neutral"
              />
              <StatCard 
                icon={<Activity className="w-4 h-4" />} 
                value={activeAgentCount} 
                label="Active" 
                color="emerald"
                pulse
              />
              <StatCard 
                icon={<Cpu className="w-4 h-4" />} 
                value={formatCompactNumber(totalSessions)} 
                label="Sessions" 
                color="indigo"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-8">

        {/* Swarm groups */}
        {swarms.map((swarm) => (
          <div 
            key={swarm.id} 
            className="rounded-2xl border border-white/[0.04] bg-gradient-to-b from-neutral-900/80 to-neutral-950/50 overflow-hidden shadow-xl shadow-black/20"
          >
            {/* Swarm Header */}
            <div className="px-6 py-5 border-b border-white/[0.04] bg-gradient-to-r from-neutral-900/50 to-transparent">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
                    <Crown className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{swarm.name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-neutral-500">
                        {swarm.members.length + 1} agents
                      </span>
                      <span className="w-1 h-1 rounded-full bg-neutral-700" />
                      <span className="text-xs text-emerald-400/80">
                        {swarm.members.filter(m => m.status === 'active' || m.status === 'busy').length + 
                         (swarm.leader.status === 'active' || swarm.leader.status === 'busy' ? 1 : 0)} active
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
                    Swarm
                  </span>
                </div>
              </div>          
            </div>

            {/* Swarm Members */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                <AgentCard key={swarm.leader.id} agent={swarm.leader} isLeader />
                {swarm.members.map(agent => (
                  <AgentCard key={agent.id} agent={agent} />
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Standalone agents */}
        {standalone.length > 0 && (
          <div className="rounded-2xl border border-white/[0.04] bg-gradient-to-b from-neutral-900/80 to-neutral-950/50 overflow-hidden shadow-xl shadow-black/20"
          >
            <div className="px-6 py-5 border-b border-white/[0.04] bg-gradient-to-r from-neutral-900/50 to-transparent">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                  <Users className="w-5 h-5 text-neutral-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Standalone Agents</h3>
                  <p className="text-xs text-neutral-500 mt-1">
                    {standalone.length} independent agent{standalone.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {standalone.map(agent => (
                  <AgentCard key={agent.id} agent={agent} />
                ))}
              </div>
            </div>
          </div>
        )}

        {agentList.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-500 min-h-[400px]">
            <div className="w-20 h-20 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-6">
              <Bot className="w-10 h-10 opacity-30" />
            </div>
            <p className="text-lg font-medium text-neutral-400 mb-2">No agents configured</p>
            <p className="text-sm text-neutral-600 max-w-sm text-center">
              Agents will appear here once they're registered with the gateway.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// Stat card component
interface StatCardProps {
  icon: React.ReactNode
  value: string | number
  label: string
  color: 'neutral' | 'emerald' | 'indigo' | 'amber'
  pulse?: boolean
}

function StatCard({ icon, value, label, color, pulse }: StatCardProps) {
  const colorClasses = {
    neutral: 'bg-neutral-800/50 border-neutral-700/50 text-neutral-400',
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    indigo: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  }

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${colorClasses[color]}`}>
      <div className={`${pulse ? 'animate-pulse' : ''}`}>{icon}</div>
      <div>
        <div className="text-xl font-bold text-white leading-none">{value}</div>
        <div className="text-[10px] uppercase tracking-wider text-neutral-500 mt-1">{label}</div>
      </div>
    </div>
  )
}

function formatCompactNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`
  return n.toString()
}
