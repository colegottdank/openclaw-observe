import { useLocation } from 'wouter'

interface MetricSparkProps {
  label: string
  value: number
  max?: number
  unit?: string
  color?: string
}

function MetricSpark({ label, value, max = 100, unit = '%', color = 'bg-indigo-500' }: MetricSparkProps) {
  const percent = Math.min(100, (value / max) * 100)
  return (
    <div className="flex items-center gap-2 text-[10px] font-mono">
      <span className="text-neutral-500 w-6">{label}</span>
      <div className="flex-1 h-1 bg-neutral-800 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full ${color}`} 
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-neutral-400 w-8 text-right">{value}{unit}</span>
    </div>
  )
}

interface AgentCardProps {
  agent: any
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

  return (
    <div 
      onClick={() => setLocation(`/agents/${agent._id}`)}
      className="group relative bg-neutral-900 border border-neutral-800 hover:border-indigo-500/50 p-4 rounded-lg transition-all hover:shadow-[0_0_15px_rgba(99,102,241,0.1)] cursor-pointer flex flex-col h-full"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded flex items-center justify-center text-lg font-bold ${
            agent.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' :
            agent.status === 'idle' ? 'bg-amber-500/10 text-amber-500' :
            'bg-neutral-800 text-neutral-500'
          }`}>
            {agent.emoji || agent.name[0]}
          </div>
          <div>
            <div className="font-bold text-neutral-200 text-sm">{agent.name}</div>
            <div className="text-[10px] font-mono text-neutral-600">{agent.role} · {agent.version}</div>
          </div>
        </div>
        <div className={`w-2 h-2 rounded-full ${
          agent.status === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
          agent.status === 'idle' ? 'bg-amber-500' :
          'bg-neutral-600'
        }`}></div>
      </div>
      
      <div className="space-y-3 flex-1">
        <div className="text-xs text-neutral-400 bg-neutral-950/50 p-2 rounded border border-neutral-800/50 truncate font-mono">
          <span className="text-indigo-500 mr-2">$</span>
          {agent.task}
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <MetricSpark label="CPU" value={agent.cpu} color={agent.cpu > 70 ? 'bg-rose-500' : 'bg-emerald-500'} />
          <MetricSpark label="MEM" value={agent.memory} max={512} unit="MB" color="bg-indigo-500" />
        </div>
      </div>

      {/* FOOTER ACTIONS - Only visible on hover */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
            onClick={handleFilesClick}
            className="p-1.5 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-400 hover:text-white transition-colors border border-neutral-700"
            title="Files"
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>
        </button>
        <button 
            onClick={handleSessionsClick}
            className="p-1.5 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-400 hover:text-white transition-colors border border-neutral-700"
            title="Sessions"
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
        </button>
      </div>
    </div>
  )
}
