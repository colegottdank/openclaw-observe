import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../convex'
import { X } from 'lucide-react'

export function DeploymentsPage() {
  const events = useQuery(api.events.list as any, { source: "vercel", limit: 50 }) || []
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  
  // Also get GitHub check_suite events for CI
  const ghEvents = useQuery(api.events.list as any, { source: "github", limit: 50 }) || []
  
  // Filter GitHub events for CI/CD related ones
  const ciEvents = ghEvents.filter((e: any) => 
    e.type === "pr.ci_failed" || 
    (e.type === "check_suite" && e.payload?.check_suite?.conclusion)
  )

  // Merge and sort
  const allDeployments = [...events, ...ciEvents].sort((a: any, b: any) => b.timestamp - a.timestamp)

  return (
    <div className="flex flex-col h-full bg-neutral-950 text-neutral-300 relative">
      <div className="border-b border-neutral-900 p-4 lg:p-6 bg-neutral-900/20">
        <h1 className="text-2xl font-bold text-white mb-1">Deployments</h1>
        <p className="text-neutral-500 text-sm">Vercel deployments and GitHub CI status.</p>
      </div>

      <div className="flex-1 overflow-auto p-4 lg:p-6">
        {allDeployments.length === 0 ? (
          <div className="text-center p-12 text-neutral-500">
             <div className="text-4xl mb-4 opacity-20">🚀</div>
             No deployment history found.
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto">
            {allDeployments.map((event: any) => {
               const isError = event.type === "pr.ci_failed" || event.payload?.state === "failure" || event.payload?.state === "error";
               const isSuccess = event.payload?.state === "success" || event.payload?.state === "ready";
               
               return (
                <div 
                    key={event._id} 
                    onClick={() => setSelectedEvent(event)}
                    className={`p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center gap-4 cursor-pointer hover:bg-neutral-900/80 transition-colors ${
                    isError ? 'bg-red-500/5 border-red-500/20' : 
                    isSuccess ? 'bg-emerald-500/5 border-emerald-500/20' : 
                    'bg-neutral-900 border-neutral-800'
                }`}>
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-lg ${
                            isError ? 'bg-red-500/10 text-red-500' : 
                            isSuccess ? 'bg-emerald-500/10 text-emerald-500' : 
                            'bg-blue-500/10 text-blue-500'
                        }`}>
                            {isError ? '❌' : isSuccess ? '✅' : '🚀'}
                        </div>
                        
                        {/* Mobile Status (shown next to icon on small screens) */}
                        <div className="sm:hidden ml-auto text-right">
                            <div className={`text-xs font-bold uppercase ${
                                isError ? 'text-red-500' : isSuccess ? 'text-emerald-500' : 'text-blue-500'
                            }`}>
                                {event.payload?.state || 'Unknown'}
                            </div>
                            <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
                                {new Date(event.timestamp).toLocaleTimeString()}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-bold text-white text-sm truncate">
                                {event.payload?.context || event.type}
                            </span>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-500 font-mono shrink-0">
                                {event.payload?.sha?.substring(0, 7) || 'HEAD'}
                            </span>
                            {event.payload?.branch && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-mono shrink-0 truncate max-w-[150px]">
                                    {event.payload.branch}
                                </span>
                            )}
                        </div>
                        <div className="text-sm text-neutral-400 break-words line-clamp-2">
                            {event.payload?.description || event.payload?.title || "Deployment updated"}
                        </div>
                    </div>
                    
                    <div className="hidden sm:block text-right shrink-0">
                        <div className="text-xs text-neutral-500 font-mono">
                            {new Date(event.timestamp).toLocaleString()}
                        </div>
                        <div className={`text-xs font-bold mt-1 uppercase ${
                            isError ? 'text-red-500' : isSuccess ? 'text-emerald-500' : 'text-blue-500'
                        }`}>
                            {event.payload?.state || 'Unknown'}
                        </div>
                    </div>
                </div>
               )
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedEvent(null)}>
            <div 
                className="bg-[#111] border border-neutral-800 rounded-xl w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-[#111]">
                    <div className="flex items-center gap-3">
                        <span className="font-bold text-white">Deployment Details</span>
                        <span className="text-xs text-neutral-500 font-mono">{selectedEvent._id}</span>
                    </div>
                    <button onClick={() => setSelectedEvent(null)} className="text-neutral-500 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-0 overflow-y-auto bg-[#0d0d0d]">
                    <div className="p-6 border-b border-neutral-800/50">
                        <h3 className="text-lg font-bold text-white mb-2">{selectedEvent.payload?.description || "Deployment Event"}</h3>
                        <div className="flex gap-4 text-sm text-neutral-400 mb-4">
                            <div>
                                <span className="text-neutral-600 block text-xs uppercase tracking-wider mb-1">Status</span>
                                <span className={
                                    selectedEvent.payload?.state === 'error' || selectedEvent.payload?.state === 'failure' ? 'text-red-400' : 'text-emerald-400'
                                }>
                                    {selectedEvent.payload?.state || 'Unknown'}
                                </span>
                            </div>
                            <div>
                                <span className="text-neutral-600 block text-xs uppercase tracking-wider mb-1">Branch</span>
                                <span className="font-mono text-indigo-400">{selectedEvent.payload?.branch || 'main'}</span>
                            </div>
                            <div>
                                <span className="text-neutral-600 block text-xs uppercase tracking-wider mb-1">Commit</span>
                                <span className="font-mono">{selectedEvent.payload?.sha?.substring(0,7) || 'HEAD'}</span>
                            </div>
                        </div>
                        
                        {selectedEvent.payload?.target_url && (
                            <a 
                                href={selectedEvent.payload.target_url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="inline-flex items-center px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded text-sm font-medium transition-colors"
                            >
                                View Build Logs ↗
                            </a>
                        )}
                    </div>

                    <div className="p-6">
                        <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Event Payload</h4>
                        <pre className="bg-black p-4 rounded-lg border border-neutral-800 text-xs font-mono text-neutral-400 overflow-x-auto">
                            {JSON.stringify(selectedEvent.payload, null, 2)}
                        </pre>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  )
}
