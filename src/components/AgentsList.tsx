import { useAgents } from '../hooks'
import { AgentCard } from './AgentCard'

export function AgentsList() {
  const { data: agents } = useAgents()
  const agentList = agents || []

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold mb-4">Agents</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agentList.map(agent => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  )
}
