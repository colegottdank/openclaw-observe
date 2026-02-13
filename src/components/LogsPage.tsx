import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../convex'

export function LogsPage() {
  const [filter, setFilter] = useState<'all' | 'error' | 'poller' | 'agent' | 'webhook'>('all')
  
  // Construct query args based on filter
  const queryArgs: any = { limit: 100 }
  if (filter === 'error') queryArgs.status = 'error'
  else if (filter !== 'all') queryArgs.source = filter

  const logs = useQuery(api.telemetry.getRecent as any, queryArgs) || []
  const health = useQuery(api.telemetry.getSystemHealth as any)

  return (
    <div className="flex flex-col h-full bg-neutral-950 text-neutral-300">
      {/* HEADER WITH STATS */}
      <div className="border-b border-neutral-900 p-4 lg:p-6 bg-neutral-900/20">
        <div className="flex flex-col lg:flex-row justify-between items-start mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">System Logs</h1>
            <p className="text-neutral-500 text-sm">Real-time telemetry from OpenClaw infrastructure.</p>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            {['all', 'error', 'poller', 'agent', 'webhook'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-3 py-1.5 rounded-md text-xs font-mono uppercase tracking-wider transition-colors border ${
                  filter === f 
                    ? 'bg-neutral-800 text-white border-neutral-700' 
                    : 'text-neutral-500 border-transparent hover:bg-neutral-900 hover:text-neutral-300'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {health && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-neutral-900/50 border border-neutral-800 p-4 rounded-lg">
                    <div className="text-xs text-neutral-500 uppercase font-bold mb-1">System Status</div>
                    <div className={`text-lg font-mono font-bold flex items-center gap-2 ${
                        health.status === 'healthy' ? 'text-emerald-500' :
                        health.status === 'degraded' ? 'text-amber-500' : 'text-red-500'
                    }`}>
                        <span className={`w-2 h-2 rounded-full ${
                             health.status === 'healthy' ? 'bg-emerald-500' :
                             health.status === 'degraded' ? 'bg-amber-500' : 'bg-red-500'
                        } animate-pulse`}></span>
                        {health.status.toUpperCase()}
                    </div>
                </div>
                <div className="bg-neutral-900/50 border border-neutral-800 p-4 rounded-lg">
                    <div className="text-xs text-neutral-500 uppercase font-bold mb-1">Error Rate (1h)</div>
                    <div className={`text-lg font-mono font-bold ${
                        (health.errorRateLastHour || 0) > 10 ? 'text-red-500' : 'text-white'
                    }`}>
                        {health.errorRateLastHour}%
                    </div>
                </div>
                <div className="bg-neutral-900/50 border border-neutral-800 p-4 rounded-lg">
                    <div className="text-xs text-neutral-500 uppercase font-bold mb-1">Stuck Actions</div>
                    <div className={`text-lg font-mono font-bold ${
                        (health.stuckActions || 0) > 0 ? 'text-amber-500' : 'text-white'
                    }`}>
                        {health.stuckActions || 0}
                    </div>
                </div>
                <div className="bg-neutral-900/50 border border-neutral-800 p-4 rounded-lg">
                    <div className="text-xs text-neutral-500 uppercase font-bold mb-1">Last Poll</div>
                    <div className="text-lg font-mono font-bold text-white">
                        {health.lastPollAt ? (() => {
                            const diff = Math.floor((Date.now() - health.lastPollAt) / 1000);
                            return `${diff}s ago`;
                        })() : 'Never'}
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* LOGS TABLE */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-xs font-mono border-collapse min-w-[800px]">
            <thead className="bg-neutral-900/50 sticky top-0 z-10 border-b border-neutral-800">
                <tr>
                    <th className="px-4 py-3 font-medium text-neutral-500 w-32">Time</th>
                    <th className="px-4 py-3 font-medium text-neutral-500 w-24">Source</th>
                    <th className="px-4 py-3 font-medium text-neutral-500 w-32">Event</th>
                    <th className="px-4 py-3 font-medium text-neutral-500 w-20">Status</th>
                    <th className="px-4 py-3 font-medium text-neutral-500">Details</th>
                    <th className="px-4 py-3 font-medium text-neutral-500 w-24 text-right">Duration</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/30">
                {logs.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-neutral-600 italic">No logs found matching filter.</td></tr>
                ) : (
                    logs.map((log: any) => (
                        <tr key={log._id} className="hover:bg-neutral-900/30 transition-colors">
                            <td className="px-4 py-2 text-neutral-500 whitespace-nowrap">
                                {new Date(log.timestamp).toLocaleTimeString()}
                            </td>
                            <td className="px-4 py-2">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                                    log.source === 'poller' ? 'bg-blue-500/10 text-blue-400' :
                                    log.source === 'agent' ? 'bg-purple-500/10 text-purple-400' :
                                    log.source === 'webhook' ? 'bg-orange-500/10 text-orange-400' :
                                    log.source === 'cron' ? 'bg-pink-500/10 text-pink-400' :
                                    'bg-neutral-800 text-neutral-400'
                                }`}>
                                    {log.source}
                                </span>
                            </td>
                            <td className="px-4 py-2 text-neutral-300">
                                {log.event_type}
                            </td>
                            <td className="px-4 py-2">
                                <span className={log.status === 'error' ? 'text-red-500 font-bold' : 'text-emerald-500/50'}>
                                    {log.status === 'error' ? 'ERR' : 'OK'}
                                </span>
                            </td>
                            <td className="px-4 py-2 text-neutral-400 break-all">
                                {log.error ? (
                                    <span className="text-red-400">{log.error}</span>
                                ) : (
                                    <div className="flex gap-2">
                                        {log.agent_id && <span className="text-purple-400/70">[{log.agent_id}]</span>}
                                        {log.task_id && <span className="text-indigo-400/70">Task: {log.task_id}</span>}
                                        {log.metadata && (
                                            <span className="opacity-50 truncate max-w-md">
                                                {JSON.stringify(log.metadata)}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </td>
                            <td className="px-4 py-2 text-right text-neutral-600">
                                {log.duration_ms ? `${log.duration_ms}ms` : '-'}
                            </td>
                        </tr>
                    ))
                )}
            </tbody>
        </table>
      </div>
    </div>
  )
}
