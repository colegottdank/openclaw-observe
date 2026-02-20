import { Clock, Users, Bot } from 'lucide-react'
import { useMemo, useRef } from 'react'
import { getAgentName, getAgentColor, getActivityType, getActivityTypeColor } from '../utils/agents'
import { formatTime } from '../utils/time'
import { TYPE_ICONS } from './TimelineTooltip'
import type { SwarmActivity } from '../types'

interface AgentGroup {
  name: string
  startIndex: number
  count: number
}

interface TimelineChartProps {
  agentRows: string[]
  agentGroups: AgentGroup[]
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

// Activity with lane assignment for sub-lane stacking
interface ActivityWithLane {
  activity: SwarmActivity
  rowIndex: number
  laneIndex: number
}

// Assign activities to lanes to avoid overlap
function assignLanes(activities: SwarmActivity[], now: number): Map<string, number> {
  const laneMap = new Map<string, number>()
  const lanes: Array<{ start: number; end: number }[]> = []

  // Sort by start time
  const sorted = [...activities].sort((a, b) => a.start - b.start)

  for (const activity of sorted) {
    const start = activity.start
    const end = activity.status === 'active' ? now : activity.end
    
    // Find first lane where this activity doesn't overlap
    let assignedLane = -1
    for (let i = 0; i < lanes.length; i++) {
      const lane = lanes[i]
      const hasOverlap = lane.some(slot => start < slot.end && end > slot.start)
      if (!hasOverlap) {
        assignedLane = i
        lane.push({ start, end })
        break
      }
    }
    
    // If no lane found, create new lane
    if (assignedLane === -1) {
      assignedLane = lanes.length
      lanes.push([{ start, end }])
    }
    
    laneMap.set(activity.sessionId, assignedLane)
  }

  return laneMap
}

// Flatten all activities with their row index and lane index for positioning
function flattenActivitiesWithLanes(
  agentRows: string[],
  activitiesByAgent: Map<string, SwarmActivity[]>,
  now: number
): { activities: ActivityWithLane[]; rowLaneCounts: number[] } {
  const activities: ActivityWithLane[] = []
  const rowLaneCounts: number[] = []

  agentRows.forEach((agentId, rowIndex) => {
    const agentActivities = activitiesByAgent.get(agentId) || []
    const laneMap = assignLanes(agentActivities, now)
    const laneCount = Math.max(1, ...Array.from(laneMap.values())) + 1
    rowLaneCounts.push(laneCount)

    agentActivities.forEach(activity => {
      activities.push({
        activity,
        rowIndex,
        laneIndex: laneMap.get(activity.sessionId) || 0
      })
    })
  })

  return { activities, rowLaneCounts }
}

// Build parent-child relationships
function buildParentChildMap(
  activities: ActivityWithLane[]
): Map<string, ActivityWithLane[]> {
  const map = new Map<string, ActivityWithLane[]>()
  
  activities.forEach(item => {
    if (item.activity.parentSessionId) {
      const children = map.get(item.activity.parentSessionId) || []
      children.push(item)
      map.set(item.activity.parentSessionId, children)
    }
  })
  
  return map
}

// Find parent activity
function findParent(
  activities: ActivityWithLane[],
  parentSessionId: string
): ActivityWithLane | null {
  return activities.find(item => item.activity.sessionId === parentSessionId) || null
}

export function TimelineChart({
  agentRows,
  agentGroups,
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
  const chartRef = useRef<HTMLDivElement>(null)
  
  const getActivityStyle = (activity: SwarmActivity) => {
    const startTime = activity.start
    const endTime = activity.status === 'active' ? now : activity.end
    const duration = endTime - startTime

    // Clamp to visible window
    const visibleStart = Math.max(startTime, timeRange.start)
    const visibleEnd = Math.min(endTime, timeRange.end)
    const leftPercent = ((visibleStart - timeRange.start) / timeRange.duration) * 100
    const widthPercent = ((visibleEnd - visibleStart) / timeRange.duration) * 100

    const minWidthPercent = duration < 5000 ? 0.3 : 0.5

    return {
      left: `${leftPercent}%`,
      width: `${Math.max(minWidthPercent, widthPercent)}%`,
      duration,
      leftPercent,
      widthPercent: Math.max(minWidthPercent, widthPercent),
    }
  }

  // Build flattened activity list with lanes and parent-child relationships
  const { flatActivities, rowLaneCounts, agentLaneCounts } = useMemo(() => {
    const { activities, rowLaneCounts } = flattenActivitiesWithLanes(agentRows, activitiesByAgent, now)
    const map = buildParentChildMap(activities)
    
    // Build agentId -> lane count map
    const agentLaneCounts = new Map<string, number>()
    agentRows.forEach((agentId, index) => {
      agentLaneCounts.set(agentId, rowLaneCounts[index])
    })
    
    return { flatActivities: activities, rowLaneCounts, agentLaneCounts }
  }, [agentRows, activitiesByAgent, now])

  // Calculate which activities are in the hovered chain
  const hoveredChain = useMemo(() => {
    if (!hoveredActivity) return new Set<string>()
    
    const chain = new Set<string>()
    chain.add(hoveredActivity.sessionId)
    
    // Find children using flatActivities
    const children = flatActivities.filter(a => a.activity.parentSessionId === hoveredActivity.sessionId)
    children.forEach(child => chain.add(child.activity.sessionId))
    
    // Find parent
    const parent = flatActivities.find(a => a.activity.sessionId === hoveredActivity.parentSessionId)
    if (parent) {
      chain.add(parent.activity.sessionId)
      // Also mark the parent's other children
      const siblings = flatActivities.filter(a => a.activity.parentSessionId === parent.activity.sessionId)
      siblings.forEach(sibling => chain.add(sibling.activity.sessionId))
    }
    
    return chain
  }, [hoveredActivity, flatActivities])

  // Generate connection paths with lane-based positioning
  const connectionPaths = useMemo(() => {
    const paths: Array<{
      id: string
      d: string
      isInHoveredChain: boolean
      parentStatus: string
    }> = []

    // Constants for dynamic row heights
    const compactRowHeight = 40
    const expandedRowHeight = 56
    const laneHeight = 22
    const laneGap = 4

    // Build cumulative row offsets based on actual row heights
    const rowOffsets: number[] = []
    let cumulativeOffset = 0
    for (let i = 0; i < agentRows.length; i++) {
      rowOffsets.push(cumulativeOffset)
      const laneCount = rowLaneCounts[i] || 1
      const rowHeight = laneCount === 1 ? compactRowHeight : expandedRowHeight + (laneCount - 1) * (laneHeight + laneGap)
      cumulativeOffset += rowHeight
    }

    flatActivities.forEach(({ activity, rowIndex, laneIndex }) => {
      if (!activity.parentSessionId) return

      const parent = findParent(flatActivities, activity.parentSessionId)
      if (!parent) return

      const parentStyle = getActivityStyle(parent.activity)
      const childStyle = getActivityStyle(activity)

      // Calculate lane-based positions
      const laneCenterOffset = 11 // Center within lane (half of laneHeight is 11)

      // Parent row calculation
      const parentLaneCount = rowLaneCounts[parent.rowIndex] || 1
      const parentBaseOffset = parentLaneCount === 1 ? (compactRowHeight - laneHeight) / 2 : (expandedRowHeight - laneHeight) / 2
      const parentRowOffset = rowOffsets[parent.rowIndex]
      const parentY = parentRowOffset + (parent.laneIndex * (laneHeight + laneGap)) + parentBaseOffset + laneCenterOffset + 10 // +10 for header

      // Child position
      const childLaneCount = rowLaneCounts[rowIndex] || 1
      const childBaseOffset = childLaneCount === 1 ? (compactRowHeight - laneHeight) / 2 : (expandedRowHeight - laneHeight) / 2
      const childRowOffset = rowOffsets[rowIndex]
      const childY = childRowOffset + (laneIndex * (laneHeight + laneGap)) + childBaseOffset + laneCenterOffset + 10 // +10 for header

      // Calculate x positions
      const parentX = parentStyle.leftPercent + parentStyle.widthPercent
      const childX = childStyle.leftPercent

      // Create bezier curve
      const controlPointOffset = Math.min(20, Math.abs(childX - parentX) / 2)

      const d = `M ${parentX},${parentY} C ${parentX + controlPointOffset},${parentY} ${childX - controlPointOffset},${childY} ${childX},${childY}`

      const isInHoveredChain = hoveredChain.has(activity.sessionId) ||
                               hoveredChain.has(parent.activity.sessionId)

      paths.push({
        id: `${parent.activity.sessionId}-${activity.sessionId}`,
        d,
        isInHoveredChain,
        parentStatus: parent.activity.status,
      })
    })

    return paths
  }, [flatActivities, hoveredChain, timeRange, now, agentRows, rowLaneCounts])

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
      <div ref={chartRef} className="min-w-[800px] bg-neutral-900/30 rounded-lg border border-neutral-800 overflow-hidden select-none relative">
        {/* Time header */}
        <div className="flex border-b border-neutral-800 bg-neutral-900/50">
          <div className="w-24 sm:w-32 shrink-0 p-3 text-xs font-medium text-neutral-500 border-r border-neutral-800 bg-neutral-900/50 sticky left-0 z-20">
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

        {/* Agent rows grouped by swarm */}
        <div className="relative">
          {agentGroups.length > 0 ? (
            // Render with group containers
            agentGroups.map((group, groupIndex) => {
              const isStandalone = group.name === 'Standalone'
              const accentColor = isStandalone ? 'text-neutral-400' : 'text-indigo-400'
              const borderColor = isStandalone ? 'border-neutral-700/50' : 'border-indigo-500/30'
              const leftBorder = isStandalone ? 'border-l-neutral-600' : 'border-l-indigo-500/50'
              
              return (
                <div key={group.name} className={`relative ${groupIndex > 0 ? 'mt-2' : ''}`}>
                  {/* Group container with enhanced styling */}
                  <div className={`relative rounded-xl overflow-hidden border ${borderColor}`}>
                    {/* Left accent border */}
                    <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${leftBorder}`} />
                    
                    {/* Group label */}
                    <div className="flex border-b border-neutral-800/50 bg-neutral-900/30">
                      <div className="w-24 sm:w-32 shrink-0 px-3 py-2 flex items-center gap-2 border-r border-neutral-800/50 sticky left-0 z-20">
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center ${isStandalone ? 'bg-neutral-800' : 'bg-indigo-500/20'}`}>
                          {isStandalone ? (
                            <Bot className="w-3 h-3 text-neutral-500" />
                          ) : (
                            <Users className="w-3 h-3 text-indigo-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={`text-[11px] font-medium ${accentColor} truncate block`}>
                            {group.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-neutral-600 font-medium">{group.count}</span>
                      </div>
                      <div className="flex-1 flex items-center px-3">
                        {/* Agent count dots */}
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(group.count, 6) }).map((_, i) => (
                            <div
                              key={i}
                              className={`w-1.5 h-1.5 rounded-full ${isStandalone ? 'bg-neutral-700' : 'bg-indigo-500/40'}`}
                            />
                          ))}
                          {group.count > 6 && (
                            <span className="text-[9px] text-neutral-600 ml-0.5">+{group.count - 6}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Agent rows in this group */}
                    <div className="divide-y divide-neutral-800/20">
                      {agentRows.slice(group.startIndex, group.startIndex + group.count).map((agentId, idxInGroup) => {
                        const agentIndex = group.startIndex + idxInGroup
                        const activities = activitiesByAgent.get(agentId) || []
                        const agentColor = getAgentColor(agentId)
                        const laneCount = rowLaneCounts[agentIndex] || 1
                        const compactRowHeight = 40
                        const expandedRowHeight = 56
                        const laneHeight = 22
                        const laneGap = 4
                        const rowHeight = laneCount === 1 
                          ? compactRowHeight 
                          : expandedRowHeight + (laneCount - 1) * (laneHeight + laneGap)
                        const laneMap = assignLanes(activities, now)

                        return (
                          <div key={agentId} className="flex hover:bg-neutral-800/20 transition-colors relative" style={{ height: `${rowHeight}px` }}>
                            <div className="w-24 sm:w-32 shrink-0 p-3 flex items-center gap-1.5 border-r border-neutral-800 bg-neutral-900/30 sticky left-0 z-20" title={getAgentName(agentId)}>
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: agentColor }} />
                              <span className="text-xs font-medium text-neutral-300 truncate">{getAgentName(agentId)}</span>
                              {activities.some(a => a.status === 'active') && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                              )}
                            </div>

                            <div className="flex-1 relative bg-neutral-950/30 overflow-hidden" style={{ height: `${rowHeight}px` }}>
                              {timeGridLines.map(time => (
                                <div
                                  key={time}
                                  className="absolute top-0 bottom-0 border-l border-neutral-800/20 pointer-events-none"
                                  style={{ left: `${((time - timeRange.start) / timeRange.duration) * 100}%` }}
                                />
                              ))}

                              {activities.map(activity => {
                                const { duration, ...style } = getActivityStyle(activity)
                                const laneIndex = laneMap.get(activity.sessionId) || 0
                                const isHovered = hoveredActivity?.sessionId === activity.sessionId
                                const isInChain = hoveredChain.has(activity.sessionId)
                                const activityType = getActivityType(activity)
                                const typeColors = getActivityTypeColor(activityType)
                                const TypeIcon = TYPE_ICONS[activityType]

                                const baseOffset = laneCount === 1 ? (compactRowHeight - laneHeight) / 2 : (expandedRowHeight - laneHeight) / 2
                                const laneTopOffset = laneIndex * (laneHeight + laneGap) + baseOffset

                                return (
                                  <div
                                    key={activity.sessionId}
                                    className={`
                                      absolute rounded cursor-pointer overflow-hidden
                                      transition-all duration-200 border
                                      ${isHovered ? 'z-10 ring-2 ring-white/20 scale-105' : 'z-0'}
                                      ${isInChain && !isHovered ? 'z-5 ring-1 ring-white/10' : ''}
                                    `}
                                    style={{
                                      ...style,
                                      top: `${laneTopOffset}px`,
                                      height: `${laneHeight}px`,
                                      backgroundColor: activity.status === 'active'
                                        ? typeColors.bg.replace('0.2', '0.4')
                                        : activity.status === 'aborted'
                                          ? 'rgba(239, 68, 68, 0.2)'
                                          : typeColors.bg,
                                      borderColor: isInChain || isHovered
                                        ? '#ffffff'
                                        : activity.status === 'active'
                                          ? typeColors.text
                                          : activity.status === 'aborted'
                                            ? '#ef4444'
                                            : typeColors.border,
                                      borderWidth: isInChain || isHovered ? '2px' : '1px',
                                    }}
                                    onMouseEnter={() => onHover(activity)}
                                    onMouseLeave={() => onHover(null)}
                                    onClick={() => onSelect(activity)}
                                  >
                                    <div className="absolute inset-0 flex items-center px-1.5 gap-1 overflow-hidden min-w-0">
                                      {activity.status === 'active' && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                                      )}
                                      <TypeIcon className="w-3 h-3 shrink-0" color={typeColors.text} />
                                      {parseFloat(style.width) > 3 && (
                                        <span className="text-[10px] text-neutral-200 overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
                                          {activity.label}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            // Render without groups (fallback)
            <div className="divide-y divide-neutral-800/50">
              {agentRows.map((agentId, agentIndex) => {
                const activities = activitiesByAgent.get(agentId) || []
                const agentColor = getAgentColor(agentId)
                const laneCount = rowLaneCounts[agentIndex] || 1
                const compactRowHeight = 40
                const expandedRowHeight = 56
                const laneHeight = 22
                const laneGap = 4
                const rowHeight = laneCount === 1 
                  ? compactRowHeight 
                  : expandedRowHeight + (laneCount - 1) * (laneHeight + laneGap)
                const laneMap = assignLanes(activities, now)

                return (
                  <div key={agentId} className="flex hover:bg-neutral-800/20 transition-colors" style={{ height: `${rowHeight}px` }}>
                    <div className="w-24 sm:w-32 shrink-0 p-3 flex items-center gap-1.5 border-r border-neutral-800 bg-neutral-900/30 sticky left-0 z-20" title={getAgentName(agentId)}>
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: agentColor }} />
                      <span className="text-xs font-medium text-neutral-300 truncate">{getAgentName(agentId)}</span>
                      {activities.some(a => a.status === 'active') && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      )}
                    </div>

                    <div className="flex-1 relative bg-neutral-950/30 overflow-hidden" style={{ height: `${rowHeight}px` }}>
                      {timeGridLines.map(time => (
                        <div
                          key={time}
                          className="absolute top-0 bottom-0 border-l border-neutral-800/20 pointer-events-none"
                          style={{ left: `${((time - timeRange.start) / timeRange.duration) * 100}%` }}
                        />
                      ))}

                      {activities.map(activity => {
                        const { duration, ...style } = getActivityStyle(activity)
                        const laneIndex = laneMap.get(activity.sessionId) || 0
                        const isHovered = hoveredActivity?.sessionId === activity.sessionId
                        const isInChain = hoveredChain.has(activity.sessionId)
                        const activityType = getActivityType(activity)
                        const typeColors = getActivityTypeColor(activityType)
                        const TypeIcon = TYPE_ICONS[activityType]

                        const baseOffset = laneCount === 1 ? (compactRowHeight - laneHeight) / 2 : (expandedRowHeight - laneHeight) / 2
                        const laneTopOffset = laneIndex * (laneHeight + laneGap) + baseOffset

                        return (
                          <div
                            key={activity.sessionId}
                            className={`
                              absolute rounded cursor-pointer overflow-hidden
                              transition-all duration-200 border
                              ${isHovered ? 'z-10 ring-2 ring-white/20 scale-105' : 'z-0'}
                              ${isInChain && !isHovered ? 'z-5 ring-1 ring-white/10' : ''}
                            `}
                            style={{
                              ...style,
                              top: `${laneTopOffset}px`,
                              height: `${laneHeight}px`,
                              backgroundColor: activity.status === 'active'
                                ? typeColors.bg.replace('0.2', '0.4')
                                : activity.status === 'aborted'
                                  ? 'rgba(239, 68, 68, 0.2)'
                                  : typeColors.bg,
                              borderColor: isInChain || isHovered
                                ? '#ffffff'
                                : activity.status === 'active'
                                  ? typeColors.text
                                  : activity.status === 'aborted'
                                    ? '#ef4444'
                                    : typeColors.border,
                              borderWidth: isInChain || isHovered ? '2px' : '1px',
                            }}
                            onMouseEnter={() => onHover(activity)}
                            onMouseLeave={() => onHover(null)}
                            onClick={() => onSelect(activity)}
                          >
                            <div className="absolute inset-0 flex items-center px-1.5 gap-1 overflow-hidden min-w-0">
                              {activity.status === 'active' && (
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                              )}
                              <TypeIcon className="w-3 h-3 shrink-0" color={typeColors.text} />
                              {parseFloat(style.width) > 3 && (
                                <span className="text-[10px] text-neutral-200 overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
                                  {activity.label}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Parent-child connection lines */}
        <svg
          className="absolute pointer-events-none z-20"
          style={{ top: '40px', left: '128px', width: 'calc(100% - 128px)' }}
          viewBox={`0 0 100 ${rowLaneCounts.reduce((sum, count) => {
            const rowHeight = count === 1 ? 40 : 56 + (count - 1) * 26
            return sum + rowHeight
          }, 0)}`}
          preserveAspectRatio="none"
        >
          {connectionPaths.map(path => (
            <path
              key={path.id}
              d={path.d}
              fill="none"
              stroke={path.isInHoveredChain ? '#60a5fa' : '#475569'}
              strokeWidth={path.isInHoveredChain ? 2 : 1}
              strokeOpacity={path.isInHoveredChain ? 1 : 0.3}
              strokeDasharray={path.parentStatus === 'active' ? '0' : '4 2'}
              className="transition-all duration-200"
            />
          ))}
        </svg>
      </div>

    </>
  )
}
