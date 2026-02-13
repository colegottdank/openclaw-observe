import { useLocation } from 'wouter'
import { AgentCard } from './AgentCard'

interface OverviewProps {
  agents: any[]
  augmentedAgents: any[]
  tasks: any[]
  activities: any[]
}

export function Overview({ agents, augmentedAgents, tasks, activities }: OverviewProps) {
  const [, setLocation] = useLocation()

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* KPI ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Agents', value: `${agents.filter((a: any) => a.status !== 'blocked').length}/${agents.length}`, color: 'text-white' },
          { label: 'Tasks Pending', value: tasks.filter((t: any) => t.status === 'inbox' || t.status === 'assigned').length.toString(), color: 'text-emerald-400' },
          { label: 'Activity', value: activities.length.toString(), color: 'text-indigo-400' },
          { label: 'Uptime', value: '4d 2h', color: 'text-neutral-300' }
        ].map((stat, i) => (
          <div key={i} className="bg-neutral-900/50 border border-neutral-800 p-4 rounded-lg">
            <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-1">{stat.label}</div>
            <div className={`text-2xl font-mono font-bold ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* SPLIT VIEW */}
      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 h-auto lg:h-[600px]">
        
        {/* AGENT GRID */}
        <div className="lg:col-span-2 flex flex-col bg-neutral-900/20 border border-neutral-800 rounded-xl overflow-hidden min-h-[400px] lg:h-auto">
          <div className="px-4 py-3 border-b border-neutral-800 bg-neutral-900/50 flex items-center justify-between shrink-0">
            <h3 className="text-sm font-bold text-neutral-200">Agent Fleet</h3>
            <div className="flex gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span className="w-2 h-2 rounded-full bg-neutral-600"></span>
            </div>
          </div>
          
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto scrollbar-thin">
            {augmentedAgents.map((agent: any) => (
              <AgentCard key={agent._id} agent={agent} />
            ))}
            
            <button className="border border-dashed border-neutral-800 rounded-lg p-4 flex flex-col items-center justify-center text-neutral-600 hover:border-neutral-600 hover:text-neutral-400 transition-colors min-h-[140px]">
              <span className="text-2xl mb-1">+</span>
              <span className="text-xs font-medium uppercase tracking-wide">Deploy New Agent</span>
            </button>
          </div>
        </div>

        {/* TERMINAL */}
        <div className="flex flex-col bg-black border border-neutral-800 rounded-xl overflow-hidden font-mono text-xs h-[400px] lg:h-auto">
          <div className="px-3 py-2 bg-neutral-900/50 border-b border-neutral-800 flex items-center justify-between shrink-0">
            <span className="text-neutral-400 font-bold">System Logs</span>
            <span className="text-[10px] text-neutral-600">tail -f system.log</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
            {activities.map((log: any) => (
              <div key={log._id} className="flex gap-2">
                <span className="text-neutral-600 shrink-0">[{new Date(log.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}]</span>
                <span className={`shrink-0 w-16 text-indigo-400`}>
                  {log.type.split('_')[0]}
                </span>
                <span className="text-neutral-300 break-all">{log.message}</span>
              </div>
            ))}
            <div className="animate-pulse text-indigo-500">_</div>
          </div>
        </div>

      </div>
    </div>
  )
}
