import { Bot, Clock, Heart, Calendar, Zap, Circle } from 'lucide-react'
import { getAgentColor, getAgentName, getActivityType, getActivityTypeColor } from '../utils/agents'
import { formatTime, formatDuration } from '../utils/time'
import { StatusBadge } from './ui'
import type { SwarmActivity, ActivityType } from '../types'

const TYPE_ICONS: Record<ActivityType, typeof Heart> = {
  heartbeat: Heart,
  cron: Calendar,
  subagent: Zap,
  regular: Circle
}

const TYPE_LABELS: Record<ActivityType, string> = {
  heartbeat: 'Heartbeat',
  cron: 'Cron Job',
  subagent: 'Sub-agent',
  regular: 'Session'
}

export { TYPE_ICONS, TYPE_LABELS }

interface TimelineTooltipProps {
  activity: SwarmActivity
  mousePos: { x: number; y: number }
  now: number
}

export function TimelineTooltip({ activity, mousePos, now }: TimelineTooltipProps) {
  const type = getActivityType(activity)
  const colors = getActivityTypeColor(type)
  const TypeIcon = TYPE_ICONS[type]

  return (
    <div
      className="fixed z-50 pointer-events-none bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl p-3 min-w-[260px]"
      style={{
        left: Math.min(mousePos.x + 12, window.innerWidth - 280),
        top: Math.min(mousePos.y + 12, window.innerHeight - 180)
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Bot className="w-4 h-4" color={getAgentColor(activity.agentId)} />
        <span className="font-medium text-white">{getAgentName(activity.agentId)}</span>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1"
          style={{ backgroundColor: colors.bg, color: colors.text }}
        >
          <TypeIcon className="w-3 h-3" />
          {TYPE_LABELS[type]}
        </span>
      </div>

      <p className="text-sm text-neutral-300 mb-2 line-clamp-2">{activity.label}</p>

      <div className="flex items-center gap-3 text-xs text-neutral-500 mb-2">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatTime(activity.start)}
        </span>
        <span>&rarr;</span>
        <span>{activity.status === 'active' ? 'Now' : formatTime(activity.end)}</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-600">
          {formatDuration((activity.status === 'active' ? now : activity.end) - activity.start)}
        </span>
        <StatusBadge status={activity.status} />
      </div>

      <div className="mt-2 pt-2 border-t border-neutral-800 text-[10px] text-neutral-600 font-mono">
        {activity.sessionId.slice(0, 20)}...
      </div>
    </div>
  )
}
