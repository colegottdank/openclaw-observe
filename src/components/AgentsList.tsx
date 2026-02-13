import { AgentCard } from './AgentCard'

interface AgentsListProps {
  augmentedAgents: any[]
}

export function AgentsList({ augmentedAgents }: AgentsListProps) {
  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold mb-4">Agents</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {augmentedAgents.map((agent: any) => (
          <AgentCard key={agent._id} agent={agent} />
        ))}
      </div>
    </div>
  )
}
