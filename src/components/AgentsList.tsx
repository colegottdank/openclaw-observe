import { useAgents } from '../hooks'
import { AgentCard } from './AgentCard'
import { groupAgentsBySwarm } from '../utils/agents'
import { Users, Bot, Crown } from 'lucide-react'

export function AgentsList() {
  const { data: agents } = useAgents()
  const agentList = agents || []
  const { swarms, standalone } = groupAgentsBySwarm(agentList)

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
          <Bot className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Agents</h2>
          <p className="text-xs text-neutral-500">{agentList.length} total agents across {swarms.length} swarms</p>
        </div>
      </div>

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
        <div className="text-center py-12 text-neutral-500">
          <Bot className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No agents configured</p>
        </div>
      )}
    </div>
  )
}
