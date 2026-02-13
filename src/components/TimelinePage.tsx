import { useState, useEffect } from 'react'
import { getOpenClawId } from '../utils/agentMapping'

interface TimelineEvent {
  agentId: string
  sessionId: string
  start: number
  end: number
  active: boolean
  displayName: string
}

export function TimelinePage() {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  
  // 1 hour window
  const NOW = Date.now()
  const START_TIME = NOW - (60 * 60 * 1000)
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/sessions')
        const sessions = await res.json()
        
        // Transform sessions into timeline events
        // Assuming session.createdAt is start, and updatedAt is end
        const timelineEvents = sessions
          .filter((s: any) => s.updatedAt > START_TIME) // Only recent
          .map((s: any) => ({
            agentId: s.agentId,
            sessionId: s.sessionId,
            start: s.createdAt || s.updatedAt - (5 * 60 * 1000), // Fallback start
            end: s.active ? NOW : s.updatedAt,
            active: s.active,
            displayName: s.displayName || s.channelName || 'Unknown'
          }))
          
        setEvents(timelineEvents)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  // Group by Agent
  const agents = Array.from(new Set(events.map(e => e.agentId))).sort()

  return (
    <div className="h-full bg-neutral-950 text-neutral-300 flex flex-col overflow-hidden">
      <div className="border-b border-neutral-900 p-6 bg-neutral-900/20 flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-white mb-1">Swarm Timeline</h1>
            <p className="text-neutral-500 text-sm">Real-time agent execution history (Last 1 hour)</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-neutral-500">
            <span className="w-3 h-3 bg-emerald-500/20 border border-emerald-500/50 rounded-sm"></span> Active
            <span className="w-3 h-3 bg-neutral-800 border border-neutral-700 rounded-sm ml-2"></span> Completed
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 relative">
        {loading ? (
            <div className="text-center p-12 text-neutral-500 animate-pulse">Loading timeline...</div>
        ) : (
            <div className="relative min-h-[400px]">
                {/* Time Grid Background */}
                <div className="absolute inset-0 flex pointer-events-none">
                    {[0, 1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="flex-1 border-r border-neutral-800/30 first:border-l"></div>
                    ))}
                </div>

                {/* Agent Tracks */}
                <div className="space-y-8 relative z-10 py-4">
                    {agents.map(agent => (
                        <div key={agent} className="relative h-12 flex items-center group">
                            {/* Label */}
                            <div className="w-32 shrink-0 pr-4 text-right font-bold text-sm text-neutral-400 group-hover:text-white transition-colors">
                                {agent.replace('debateai-', '')}
                            </div>
                            
                            {/* Track */}
                            <div className="flex-1 h-8 bg-neutral-900/50 rounded relative overflow-hidden border border-neutral-800/50">
                                {events.filter(e => e.agentId === agent).map(event => {
                                    // Calculate position %
                                    const totalDuration = NOW - START_TIME
                                    const left = Math.max(0, ((event.start - START_TIME) / totalDuration) * 100)
                                    const width = Math.min(100, ((event.end - event.start) / totalDuration) * 100)
                                    
                                    return (
                                        <div 
                                            key={event.sessionId}
                                            className={`absolute top-1 bottom-1 rounded-sm border cursor-pointer hover:brightness-110 transition-all ${
                                                event.active 
                                                    ? 'bg-emerald-500/20 border-emerald-500/50 z-20 shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                                                    : 'bg-neutral-700/50 border-neutral-600/50'
                                            }`}
                                            style={{ left: `${left}%`, width: `${width}%`, minWidth: '4px' }}
                                            title={`${event.displayName} (${new Date(event.start).toLocaleTimeString()} - ${event.active ? 'Now' : new Date(event.end).toLocaleTimeString()})`}
                                        >
                                            {width > 10 && (
                                                <div className="text-[10px] px-1 truncate leading-6 text-white/80 font-mono">
                                                    {event.displayName}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
                
                {/* Current Time Indicator */}
                <div className="absolute top-0 bottom-0 right-0 w-px bg-red-500/50 z-30 pointer-events-none">
                    <div className="absolute top-0 right-0 -mr-1.5 -mt-1.5 w-3 h-3 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse"></div>
                </div>
            </div>
        )}
      </div>
    </div>
  )
}
