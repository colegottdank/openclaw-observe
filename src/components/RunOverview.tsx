import { useMemo, useState, useEffect } from 'react'
import {
  GitBranch,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { getAgentName, getActivityType, getActivityTypeColor } from '../utils/agents'
import { TYPE_ICONS } from './TimelineTooltip'
import { formatDuration, formatTime } from '../utils/time'
import type { SwarmActivity } from '../types'

interface RunOverviewProps {
  activities: SwarmActivity[]
  selectedActivity: SwarmActivity
  onSelectActivity: (activity: SwarmActivity) => void
}

interface TreeNode {
  activity: SwarmActivity
  children: TreeNode[]
  depth: number
}

// Build a tree structure from flat activities based on parentSessionId
function buildDelegationTree(
  activities: SwarmActivity[],
  rootSessionId: string
): TreeNode | null {
  const activityMap = new Map<string, SwarmActivity>()
  const childrenMap = new Map<string, SwarmActivity[]>()
  
  activities.forEach(activity => {
    activityMap.set(activity.sessionId, activity)
    if (activity.parentSessionId) {
      const siblings = childrenMap.get(activity.parentSessionId) || []
      siblings.push(activity)
      childrenMap.set(activity.parentSessionId, siblings)
    }
  })
  
  const rootActivity = activityMap.get(rootSessionId)
  if (!rootActivity) return null
  
  function buildNode(activity: SwarmActivity, depth: number): TreeNode {
    const children = childrenMap.get(activity.sessionId) || []
    return {
      activity,
      children: children.map(child => buildNode(child, depth + 1)),
      depth
    }
  }
  
  return buildNode(rootActivity, 0)
}

function findRootSessionId(
  activities: SwarmActivity[],
  sessionId: string
): string {
  const activityMap = new Map<string, SwarmActivity>()
  activities.forEach(a => activityMap.set(a.sessionId, a))
  
  let current = activityMap.get(sessionId)
  while (current?.parentSessionId) {
    const parent = activityMap.get(current.parentSessionId)
    if (!parent) break
    current = parent
  }
  
  return current?.sessionId || sessionId
}

function StatusIcon({ status, className }: { status: string; className?: string }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className={`text-emerald-500 ${className}`} />
    case 'aborted':
      return <XCircle className={`text-red-500 ${className}`} />
    case 'active':
      return <Loader2 className={`text-amber-500 animate-spin ${className}`} />
    default:
      return <Clock className={`text-neutral-500 ${className}`} />
  }
}

function ActivityTypeIcon({ activity, className = 'w-5 h-5' }: { activity: SwarmActivity; className?: string }) {
  const type = getActivityType(activity)
  const colors = getActivityTypeColor(type)
  const Icon = TYPE_ICONS[type]
  
  return (
    <div 
      className={`${className} rounded flex items-center justify-center`}
      style={{ backgroundColor: colors.bg }}
    >
      <Icon className="w-3 h-3" style={{ color: colors.text }} />
    </div>
  )
}

interface TreeNodeProps {
  node: TreeNode
  isSelected: boolean
  onSelect: (activity: SwarmActivity) => void
}

function TreeNodeView({ node, isSelected, onSelect }: TreeNodeProps) {
  const { activity, children, depth } = node
  const hasChildren = children.length > 0
  const isLeader = depth === 0
  
  const endTime = activity.status === 'active' ? Date.now() : activity.end
  const duration = endTime - activity.start
  
  return (
    <div className="select-none">
      <button
        onClick={() => onSelect(activity)}
        className={`
          w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs
          transition-all duration-150
          ${isSelected 
            ? 'bg-neutral-700 text-white' 
            : 'hover:bg-neutral-800/50 text-neutral-300'
          }
        `}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        {depth > 0 && (
          <div className="absolute left-0 w-2 h-px bg-neutral-700" 
               style={{ marginLeft: `${6 + (depth - 1) * 14}px` }} />
        )}
        
        <ActivityTypeIcon activity={activity} className="w-5 h-5" />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-medium truncate">
              {getAgentName(activity.agentId)}
            </span>
            {isLeader && (
              <span className="text-[9px] px-1 py-0 bg-emerald-500/20 text-emerald-400 rounded">
                lead
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 mt-0.5">
            <StatusIcon status={activity.status} className="w-3 h-3" />
            <span>{formatDuration(duration)}</span>
            <span>·</span>
            <span>{formatTime(activity.start)}</span>
          </div>
        </div>
        
        {hasChildren && (
          <GitBranch className="w-3 h-3 text-neutral-600" />
        )}
      </button>
      
      {hasChildren && (
        <div className="relative">
          <div 
            className="absolute left-0 w-px bg-neutral-800"
            style={{ 
              left: `${8 + depth * 14 + 10}px`,
              top: '0',
              bottom: '0'
            }} 
          />
          {children.map((child) => (
            <TreeNodeView
              key={child.activity.sessionId}
              node={child}
              isSelected={false}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function RunOverview({ activities, selectedActivity, onSelectActivity }: RunOverviewProps) {
  const rootSessionId = useMemo(() => {
    return findRootSessionId(activities, selectedActivity.sessionId)
  }, [activities, selectedActivity.sessionId])
  
  const tree = useMemo(() => {
    return buildDelegationTree(activities, rootSessionId)
  }, [activities, rootSessionId])
  
  const stats = useMemo(() => {
    if (!tree) return null
    
    const allActivities: SwarmActivity[] = []
    function collect(node: TreeNode) {
      allActivities.push(node.activity)
      node.children.forEach(collect)
    }
    collect(tree)
    
    const startTimes = allActivities.map(a => a.start)
    const endTimes = allActivities.map(a => 
      a.status === 'active' ? Date.now() : a.end
    )
    const totalDuration = Math.max(...endTimes) - Math.min(...startTimes)
    
    const isMultiSession = allActivities.length > 1
    
    const statusCounts = {
      active: allActivities.filter(a => a.status === 'active').length,
      completed: allActivities.filter(a => a.status === 'completed').length,
      aborted: allActivities.filter(a => a.status === 'aborted').length,
    }
    
    let overallStatus: string
    if (statusCounts.active > 0) overallStatus = 'active'
    else if (statusCounts.aborted > 0) overallStatus = 'aborted'
    else overallStatus = 'completed'
    
    return {
      totalSessions: allActivities.length,
      totalDuration,
      statusCounts,
      overallStatus,
      isMultiSession,
    }
  }, [tree])
  
  // Default: expanded for multi-session, collapsed for single
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (!stats) return false
    return !stats.isMultiSession
  })
  
  // Update collapse state when stats change (new selection)
  useEffect(() => {
    if (stats) {
      setIsCollapsed(!stats.isMultiSession)
    }
  }, [stats?.isMultiSession])
  
  if (!tree || !stats) return null
  
  const isSingleSession = stats.totalSessions === 1
  
  // Collapsed view: compact summary bar
  if (isCollapsed) {
    return (
      <div className="px-3 py-2 border-b border-neutral-800 bg-neutral-900/20">
        <button
          onClick={() => setIsCollapsed(false)}
          className="w-full flex items-center justify-between text-xs hover:bg-neutral-800/30 rounded px-1 py-1 -mx-1 transition-colors"
        >
          <div className="flex items-center gap-2">
            {isSingleSession ? (
              <>
                <StatusIcon status={stats.overallStatus} className="w-3.5 h-3.5" />
                <span className="capitalize text-neutral-400">{stats.overallStatus}</span>
                <span className="text-neutral-600">·</span>
                <span className="text-neutral-400">{formatDuration(stats.totalDuration)}</span>
              </>
            ) : (
              <>
                <GitBranch className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-neutral-300">
                  Run: <span className="text-neutral-400">{stats.totalSessions} sessions · {formatDuration(stats.totalDuration)} · </span>
                  <span className="capitalize text-neutral-400">{stats.overallStatus}</span>
                </span>
              </>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-500" />
        </button>
      </div>
    )
  }
  
  // Expanded view: full tree for multi-session
  return (
    <div className="border-b border-neutral-800">
      {/* Header row with collapse toggle */}
      <div className="px-3 py-2 bg-neutral-900/30 border-b border-neutral-800">
        <button
          onClick={() => setIsCollapsed(true)}
          className="w-full flex items-center justify-between hover:bg-neutral-800/30 rounded px-1 py-0.5 -mx-1 transition-colors"
        >
          <div className="flex items-center gap-2">
            <GitBranch className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-sm font-medium text-white">Run</span>
            <span className="text-[10px] px-1.5 py-0 bg-neutral-800 text-neutral-400 rounded">
              {stats.totalSessions}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs text-neutral-400">
              <Clock className="w-3 h-3" />
              <span>{formatDuration(stats.totalDuration)}</span>
            </div>
            <StatusIcon status={stats.overallStatus} className="w-3.5 h-3.5" />
            <ChevronDown className="w-4 h-4 text-neutral-500 ml-1" />
          </div>
        </button>
      </div>
      
      {/* Tree */}
      <div className="px-1 py-1">
        <div className="bg-neutral-950 rounded border border-neutral-800 overflow-hidden">
          <TreeNodeView
            node={tree}
            isSelected={selectedActivity.sessionId === tree.activity.sessionId}
            onSelect={onSelectActivity}
          />
        </div>
      </div>
    </div>
  )
}
