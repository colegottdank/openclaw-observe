import { useAgents } from '../hooks'
import { AgentCard } from './AgentCard'
import { groupAgentsBySwarm } from '../utils/agents'
import { Users, Bot, Crown, Activity } from 'lucide-react'

export function AgentsList() {
  const { data: agents } = useAgents()
  const agentList = agents || []
  const { swarms, standalone } = groupAgentsBySwarm(agentList)

  const activeAgentCount = agentList.filter(a => a.status === 'active' || a.status === 'busy').length

  return (
    <div className="h-full bg-neutral-950 text-neutral-300 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-neutral-900 p-4 bg-neutral-900/20 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white">Agents</h1>
            {activeAgentCount > 0 && (
              <span className="text-xs px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-emerald-400">
                {activeAgentCount} active
              </span>
            )}
          </div>
          <p className="text-neutral-500 text-sm mt-0.5">
            {agentList.length} total agents across {swarms.length} swarms
          </p>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{agentList.length}</div>
            <div className="text-xs text-neutral-500">Total</div>
          </div>
          <div className="w-px h-10 bg-neutral-800" />
          <div className="text-right">
            <div className="flex items-center gap-1.5 text-emerald-400 justify-end">
              <Activity className="w-4 h-4" />
              <span className="text-2xl font-bold">{activeAgentCount}</span>
            </div>
            <div className="text-xs text-neutral-500">Active</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 lg:p-6 space-y-8">

      {/* Swarm groups */}
      {swarms.map((swarm) => (
        <div 
          key={swarm.id} 
          className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-neutral-900/50 to-neutral-900/30 overflow-hidden"
        >
          {/* Swarm Header */}
          <div className="px-5 py-4 border-b border-white/[0.06] bg-neutral-950/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Crown className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{swarm.name}</h3>
                  <p className="text-xs text-neutral-500">Swarm with {swarm.members.length + 1} agents</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-neutral-600 font-bold">Swarm</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            </div>          
          </div>

          {/* Swarm Members */}
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
        <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-neutral-900/50 to-neutral-900/30 overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-white/[0.06] bg-neutral-950/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                <Users className="w-4 h-4 text-neutral-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Standalone Agents</h3>
                <p className="text-xs text-neutral-500">{standalone.length} independent agent{standalone.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>

          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {standalone.map(agent => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          </div>
        </div>
      )}

      {agentList.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-neutral-500">
          <Bot className="w-12 h-12 mb-4 opacity-30" />
          <p>No agents configured</p>
        </div>
      )}
      </div>
    </div>
  )
}
