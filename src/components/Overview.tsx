import { useAgents, useSwarmActivity } from '../hooks'
import { StatCard, STATUS_STYLES } from './ui'
import { AgentCard } from './AgentCard'
import { getAgentName } from '../utils/agents'
import { formatTimeFull } from '../utils/time'

export function Overview() {
  const { data: agents } = useAgents()
  const { data: swarmData } = useSwarmActivity(1)

  const agentList = agents || []
  const activities = swarmData?.activities || []

  const activeAgentCount = agentList.filter(a => a.status === 'active' || a.status === 'busy').length
  const activeSessions = activities.filter(a => a.status === 'active').length
  const errorSessions = activities.filter(a => a.status === 'aborted').length

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* KPI ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Agents Online" value={`${activeAgentCount}/${agentList.length}`} />
        <StatCard label="Active Sessions" value={activeSessions.toString()} color="text-emerald-400" />
        <StatCard label="Sessions (1h)" value={activities.length.toString()} color="text-indigo-400" />
        <StatCard label="Errors (1h)" value={errorSessions.toString()} color={errorSessions > 0 ? 'text-red-400' : 'text-neutral-500'} />
      </div>

      {/* SPLIT VIEW */}
      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 h-auto lg:h-[600px]">

        {/* AGENT GRID */}
        <div className="lg:col-span-2 flex flex-col bg-neutral-900/20 border border-neutral-800 rounded-xl overflow-hidden min-h-[400px] lg:h-auto">
          <div className="px-4 py-3 border-b border-neutral-800 bg-neutral-900/50 flex items-center justify-between shrink-0">
            <h3 className="text-sm font-bold text-neutral-200">Agent Fleet</h3>
            <div className="flex items-center gap-3 text-xs text-neutral-500">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />{activeAgentCount} active</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-neutral-600" />{agentList.length - activeAgentCount} idle</span>
            </div>
          </div>

          <div className="p-4 overflow-y-auto scrollbar-thin">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {agentList.map(agent => (
                <AgentCard key={agent._id} agent={agent} />
              ))}
            </div>
          </div>
        </div>

        {/* ACTIVITY LOG */}
        <div className="flex flex-col bg-black border border-neutral-800 rounded-xl overflow-hidden font-mono text-xs h-[400px] lg:h-auto">
          <div className="px-3 py-2 bg-neutral-900/50 border-b border-neutral-800 flex items-center justify-between shrink-0">
            <span className="text-neutral-400 font-bold">Live Activity</span>
            <span className="text-[10px] text-neutral-600">{activities.length} sessions</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
            {activities.length === 0 ? (
              <div className="text-neutral-600 text-center py-8">No recent activity</div>
            ) : (
              activities.slice(0, 50).map(activity => (
                <div key={activity.sessionId} className="flex gap-2">
                  <span className="text-neutral-600 shrink-0">
                    [{formatTimeFull(activity.start)}]
                  </span>
                  <span className={`shrink-0 w-16 ${(STATUS_STYLES[activity.status] || STATUS_STYLES.completed).text}`}>
                    {getAgentName(activity.agentId)}
                  </span>
                  <span className="text-neutral-300 break-all truncate">{activity.label}</span>
                </div>
              ))
            )}
            <div className="animate-pulse text-indigo-500">_</div>
          </div>
        </div>
      </div>
    </div>
  )
}
