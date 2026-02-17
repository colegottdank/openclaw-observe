import { useLocation } from 'wouter'
import { FolderOpen, Terminal } from 'lucide-react'
import { StatusDot, STATUS_STYLES } from './ui'
import type { Agent } from '../types'

interface AgentCardProps {
  agent: Agent
}

export function AgentCard({ agent }: AgentCardProps) {
  const [, setLocation] = useLocation()

  const handleFilesClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setLocation(`/agents/${agent._id}?tab=files`)
  }

  const handleSessionsClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setLocation(`/agents/${agent._id}?tab=sessions`)
  }

  const style = STATUS_STYLES[agent.status] || STATUS_STYLES.offline

  return (
    <div
      onClick={() => setLocation(`/agents/${agent._id}`)}
      className="group relative bg-neutral-900 border border-neutral-800 hover:border-indigo-500/50 p-4 rounded-lg transition-all hover:shadow-[0_0_15px_rgba(99,102,241,0.1)] cursor-pointer flex flex-col h-full"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded flex items-center justify-center text-lg font-bold ${style.bg} ${style.text}`}>
            {agent.emoji || agent.name[0]}
          </div>
          <div>
            <div className="font-bold text-neutral-200 text-sm">{agent.name}</div>
            <div className="text-[10px] font-mono text-neutral-600">{agent.role || 'Agent'}</div>
          </div>
        </div>
        <StatusDot status={agent.status} pulse={agent.status === 'active'} />
      </div>

      <div className="space-y-3 flex-1">
        <div className="text-xs text-neutral-400 bg-neutral-950/50 p-2 rounded border border-neutral-800/50 truncate font-mono">
          <span className="text-indigo-500 mr-2">$</span>
          {agent.status === 'busy' ? 'Processing task...' : agent.status === 'idle' ? 'Awaiting instructions' : agent.status}
        </div>

        <div className="flex items-center gap-3 text-[10px] text-neutral-500">
          {agent.model && <span className="font-mono text-indigo-400">{agent.model}</span>}
          <span className="capitalize">{agent.status}</span>
        </div>
      </div>

      {/* FOOTER ACTIONS - Only visible on hover */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleFilesClick}
          className="p-1.5 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-400 hover:text-white transition-colors border border-neutral-700"
          title="Files"
        >
          <FolderOpen className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleSessionsClick}
          className="p-1.5 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-400 hover:text-white transition-colors border border-neutral-700"
          title="Sessions"
        >
          <Terminal className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
