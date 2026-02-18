import { Clock, Heart, Calendar, Zap, Circle } from 'lucide-react'
import { getAgentName, getAgentColor, getActivityType, getActivityTypeColor } from '../utils/agents'
import { formatTime } from '../utils/time'
import { TYPE_ICONS } from './TimelineTooltip'
import type { SwarmActivity } from '../types'

interface TimelineChartProps {
  agentRows: string[]
  activitiesByAgent: Map<string, SwarmActivity[]>
  timeRange: { start: number; end: number; duration: number }
  timeGridLines: number[]
  now: number
  hoveredActivity: SwarmActivity | null
  onHover: (activity: SwarmActivity | null) => void
  onSelect: (activity: SwarmActivity) => void
  isEmpty: boolean
  windowHours: number
  onZoomOut: () => void
  onRefresh: () => void
  loading: boolean
}

export function TimelineChart({
  agentRows,
  activitiesByAgent,
  timeRange,
  timeGridLines,
  now,
  hoveredActivity,
  onHover,
  onSelect,
  isEmpty,
  windowHours,
  onZoomOut,
  onRefresh,
  loading,
}: TimelineChartProps) {
  const getActivityStyle = (activity: SwarmActivity) => {
    const startTime = activity.start
    const endTime = activity.status === 'active' ? now : activity.end
    const duration = endTime - startTime
    const leftPercent = ((startTime - timeRange.start) / timeRange.duration) * 100
    const widthPercent = (duration / timeRange.duration) * 100
    const clampedLeft = Math.max(0, Math.min(100, leftPercent))
    const clampedWidth = Math.min(100 - clampedLeft, widthPercent)
    
    // Use a smaller minimum for tiny durations (heartbeats/cron) 
    // but let longer sessions show their true width
    const minWidthPercent = duration < 5000 ? 0.3 : 0.5  // 0.3% for <5s, 0.5% for longer
    
    return {
      left: `${clampedLeft}%`,
      width: `${Math.max(minWidthPercent, clampedWidth)}%`,
      duration, // pass through for styling decisions
    }
  }

  if (isEmpty) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-neutral-800/50 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-neutral-600" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No activity in this window</h3>
          <p className="text-neutral-500 text-sm mb-4 max-w-md">
            No sessions, heartbeats, or cron jobs found in the last {windowHours} hour{windowHours > 1 ? 's' : ''}.
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={onZoomOut}
              disabled={windowHours >= 24}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-sm transition-colors disabled:opacity-30"
            >
              Zoom out
            </button>
            <button
              onClick={onRefresh}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-w-[800px] bg-neutral-900/30 rounded-lg border border-neutral-800 overflow-hidden select-none">
        {/* Time header */}
        <div className="flex border-b border-neutral-800 bg-neutral-900/50">
          <div className="w-24 sm:w-32 shrink-0 p-3 text-xs font-medium text-neutral-500 border-r border-neutral-800 bg-neutral-900/50 sticky left-0 z-10">
            Agent
          </div>
          <div className="flex-1 relative h-10">
            {timeGridLines.map((time, i) => {
              const isNow = i === timeGridLines.length - 1
              const leftPercent = ((time - timeRange.start) / timeRange.duration) * 100
              return (
                <div
                  key={time}
                  className="absolute top-0 bottom-0 border-l border-neutral-800/50 flex items-center"
                  style={{ left: `${leftPercent}%` }}
                >
                  <span className={`text-[10px] ml-1 ${isNow ? 'text-emerald-400 font-medium' : 'text-neutral-600'}`}>
                    {isNow ? 'Now' : formatTime(time)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Agent rows */}
        <div className="divide-y divide-neutral-800/50">
          {agentRows.map(agentId => {
            const activities = activitiesByAgent.get(agentId) || []
            const agentColor = getAgentColor(agentId)
            return (
              <div key={agentId} className="flex hover:bg-neutral-800/20 transition-colors">
                <div className="w-24 sm:w-32 shrink-0 p-3 flex items-center gap-2 border-r border-neutral-800 bg-neutral-900/30 sticky left-0 z-10">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: agentColor }} />
                  <span className="text-sm font-medium text-neutral-300 truncate">{getAgentName(agentId)}</span>
                  {activities.some(a => a.status === 'active') && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  )}
                </div>

                <div className="flex-1 relative h-14 bg-neutral-950/30">
                  {timeGridLines.map(time => (
                    <div
                      key={time}
                      className="absolute top-0 bottom-0 border-l border-neutral-800/20 pointer-events-none"
                      style={{ left: `${((time - timeRange.start) / timeRange.duration) * 100}%` }}
                    />
                  ))}

                  {activities.map(activity => {
                    const { duration, ...style } = getActivityStyle(activity)
                    const isHovered = hoveredActivity?.sessionId === activity.sessionId
                    const activityType = getActivityType(activity)
                    const typeColors = getActivityTypeColor(activityType)
                    const TypeIcon = TYPE_ICONS[activityType]

                    // Visual distinction: very short activities get a different shape
                    const isVeryShort = duration < 10000 // < 10 seconds

                    return (
                      <div
                        key={activity.sessionId}
                        className={`
                          absolute top-1/2 -translate-y-1/2 rounded cursor-pointer
                          transition-all duration-200 border
                          ${isHovered ? 'z-10 ring-2 ring-white/20 scale-y-110' : 'z-0'}
                          ${isVeryShort ? 'h-4' : 'h-6'}
                        `}
                        style={{
                          ...style,
                          backgroundColor: activity.status === 'active'
                            ? typeColors.bg.replace('0.2', '0.4')
                            : activity.status === 'aborted'
                              ? 'rgba(239, 68, 68, 0.2)'
                              : typeColors.bg,
                          borderColor: activity.status === 'active'
                            ? typeColors.text
                            : activity.status === 'aborted'
                              ? '#ef4444'
                              : typeColors.border,
                          // No minWidth - let the percentage do its job
                        }}
                        onMouseEnter={() => onHover(activity)}
                        onMouseLeave={() => onHover(null)}
                        onClick={() => onSelect(activity)}
                      >
                        {activity.status === 'active' && (
                          <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        )}
                        {parseFloat(style.width) > 8 && (
                          <div className="absolute inset-0 flex items-center px-2 gap-1.5">
                            <TypeIcon className="w-3 h-3 shrink-0" color={typeColors.text} />
                            <span className="text-[10px] truncate text-neutral-200">
                              {activity.label.slice(0, 25)}
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-indigo-500/20 border border-indigo-500/50">
          <Heart className="w-3 h-3 text-indigo-400" />
          <span className="text-indigo-300">Heartbeat</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/20 border border-amber-500/50">
          <Calendar className="w-3 h-3 text-amber-400" />
          <span className="text-amber-300">Cron Job</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-violet-500/20 border border-violet-500/50">
          <Zap className="w-3 h-3 text-violet-400" />
          <span className="text-violet-300">Sub-agent</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-500/20 border border-emerald-500/50">
          <Circle className="w-3 h-3 text-emerald-400" />
          <span className="text-emerald-300">Session</span>
        </div>
        <div className="w-px h-6 bg-neutral-800" />
        <div className="flex items-center gap-2 text-neutral-500">
          <div className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500" />
          <span>Active</span>
        </div>
        <div className="flex items-center gap-2 text-neutral-500">
          <div className="w-3 h-3 rounded bg-red-500/30 border border-red-500" />
          <span>Aborted</span>
        </div>
      </div>
    </>
  )
}
