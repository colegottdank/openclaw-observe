import { useState, useMemo, useRef, useEffect } from 'react'
import {
  Activity,
  X,
  Heart,
  Calendar,
  Zap,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { useAgents, useSwarmActivity, useSessionLogs } from '../hooks'
import { normalizeAgentId, getAgentName, getActivityType, getActivityTypeColor } from '../utils/agents'
import { formatTime } from '../utils/time'
import { SessionTraceViewer } from './SessionTraceViewer'
import { TimelineChart } from './TimelineChart'
import { TimelineTooltip, TYPE_ICONS, TYPE_LABELS } from './TimelineTooltip'
import { ResizablePanel, StatusBadge } from './ui'
import type { SwarmActivity } from '../types'

export function TimelinePage() {
  const [windowHours, setWindowHours] = useState(1)
  const [hoveredActivity, setHoveredActivity] = useState<SwarmActivity | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [selectedActivity, setSelectedActivity] = useState<SwarmActivity | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [now, setNow] = useState(Date.now())
  const chartRef = useRef<HTMLDivElement>(null)

  const { data: agents } = useAgents()
  const { data, loading, error, refetch } = useSwarmActivity(windowHours)

  const selectedAgentId = selectedActivity ? normalizeAgentId(selectedActivity.agentId) : null
  const { data: sessionLogs, loading: logsLoading } = useSessionLogs(
    selectedAgentId,
    selectedActivity?.sessionId || null,
    selectedActivity?.status || null
  )

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const agentRows = useMemo(() => {
    const knownIds = (agents || []).map(a => a._id)
    const seen = new Set(knownIds)

    if (data?.activities) {
      for (const activity of data.activities) {
        const id = normalizeAgentId(activity.agentId)
        if (!seen.has(id)) {
          knownIds.push(id)
          seen.add(id)
        }
      }
    }

    return knownIds
  }, [agents, data])

  const activitiesByAgent = useMemo(() => {
    const map = new Map<string, SwarmActivity[]>()
    agentRows.forEach(id => map.set(id, []))

    if (!data?.activities) return map

    data.activities.forEach(activity => {
      const normalizedId = normalizeAgentId(activity.agentId)
      if (!map.has(normalizedId)) map.set(normalizedId, [])
      map.get(normalizedId)!.push(activity)
    })

    return map
  }, [data, agentRows])

  const timeRange = useMemo(() => {
    const end = now
    const start = end - windowHours * 60 * 60 * 1000
    return { start, end, duration: end - start }
  }, [now, windowHours])

  const timeGridLines = useMemo(() => {
    const lines = []
    const step = timeRange.duration / 10
    for (let i = 0; i <= 10; i++) {
      lines.push(timeRange.start + i * step)
    }
    return lines.reverse()
  }, [timeRange])

  const closeSidebar = () => {
    setSidebarOpen(false)
    setSelectedActivity(null)
  }

  const handleSelectActivity = (activity: SwarmActivity) => {
    setSelectedActivity(activity)
    setSidebarOpen(true)
  }

  const stats = useMemo(() => {
    const activities = data?.activities || []
    const byType = {
      heartbeat: activities.filter(a => getActivityType(a) === 'heartbeat'),
      cron: activities.filter(a => getActivityType(a) === 'cron'),
      subagent: activities.filter(a => getActivityType(a) === 'subagent'),
      regular: activities.filter(a => getActivityType(a) === 'regular'),
    }
    return {
      total: activities.length,
      active: activities.filter(a => a.status === 'active').length,
      byType
    }
  }, [data])

  const isEmpty = !data?.activities || data.activities.length === 0

  if (loading && !data) {
    return (
      <div className="h-full bg-neutral-950 text-neutral-300 flex flex-col">
        <div className="border-b border-neutral-900 p-6">
          <div className="h-8 w-48 bg-neutral-800 rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-neutral-800 rounded animate-pulse" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3 text-neutral-500">
            <div className="w-5 h-5 border-2 border-neutral-700 border-t-emerald-500 rounded-full animate-spin" />
            Loading timeline...
          </div>
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="h-full bg-neutral-950 text-neutral-300 flex flex-col">
        <div className="border-b border-neutral-900 p-6">
          <h1 className="text-2xl font-bold text-white">Swarm Timeline</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Activity className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Failed to load timeline</h3>
            <p className="text-neutral-500 text-sm">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-neutral-950 text-neutral-300 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-neutral-900 p-4 bg-neutral-900/20 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white">Swarm Timeline</h1>
            <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded">Live</span>
          </div>
          <p className="text-neutral-500 text-sm mt-0.5">
            Agent activity over the last {windowHours} hour{windowHours > 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {stats.byType.heartbeat.length > 0 && (
            <div className="text-right">
              <div className="flex items-center gap-1.5 text-indigo-400">
                <Heart className="w-3.5 h-3.5" />
                <span className="text-lg font-bold">{stats.byType.heartbeat.length}</span>
              </div>
              <div className="text-[10px] text-neutral-500 uppercase tracking-wider">Heartbeats</div>
            </div>
          )}
          {stats.byType.cron.length > 0 && (
            <div className="text-right">
              <div className="flex items-center gap-1.5 text-amber-400">
                <Calendar className="w-3.5 h-3.5" />
                <span className="text-lg font-bold">{stats.byType.cron.length}</span>
              </div>
              <div className="text-[10px] text-neutral-500 uppercase tracking-wider">Cron</div>
            </div>
          )}
          {stats.byType.subagent.length > 0 && (
            <div className="text-right">
              <div className="flex items-center gap-1.5 text-violet-400">
                <Zap className="w-3.5 h-3.5" />
                <span className="text-lg font-bold">{stats.byType.subagent.length}</span>
              </div>
              <div className="text-[10px] text-neutral-500 uppercase tracking-wider">Sub-agents</div>
            </div>
          )}
          <div className="w-px h-10 bg-neutral-800" />
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{stats.active}</div>
            <div className="text-xs text-neutral-500">Active</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-xs text-neutral-500">Total</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={refetch}
            disabled={loading}
            className="p-2 rounded-md bg-neutral-800 text-neutral-400 hover:text-white disabled:opacity-30 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="flex items-center gap-1 bg-neutral-800 rounded-lg p-1">
            <button
              onClick={() => setWindowHours(Math.max(0.5, windowHours / 2))}
              disabled={windowHours <= 0.5}
              className="p-1.5 rounded text-neutral-400 hover:text-white hover:bg-neutral-700 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-mono text-neutral-300 min-w-[60px] text-center px-2">{windowHours}h</span>
            <button
              onClick={() => setWindowHours(Math.min(24, windowHours * 2))}
              disabled={windowHours >= 24}
              className="p-1.5 rounded text-neutral-400 hover:text-white hover:bg-neutral-700 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Timeline Chart */}
      <div
        className="flex-1 overflow-auto p-4 touch-pan-x"
        ref={chartRef}
        onMouseMove={e => setMousePos({ x: e.clientX, y: e.clientY })}
      >
        <TimelineChart
          agentRows={agentRows}
          activitiesByAgent={activitiesByAgent}
          timeRange={timeRange}
          timeGridLines={timeGridLines}
          now={now}
          hoveredActivity={hoveredActivity}
          onHover={setHoveredActivity}
          onSelect={handleSelectActivity}
          isEmpty={isEmpty}
          windowHours={windowHours}
          onZoomOut={() => setWindowHours(Math.min(24, windowHours * 2))}
          onRefresh={refetch}
          loading={loading}
        />
      </div>

      {/* Floating Tooltip */}
      {hoveredActivity && (
        <TimelineTooltip activity={hoveredActivity} mousePos={mousePos} now={now} />
      )}

      {/* Session Log Sidebar */}
      <ResizablePanel open={sidebarOpen} onClose={closeSidebar} storageKey="timeline" defaultWidth={480}>
        <div className="flex items-center justify-between p-4 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-3">
            {selectedActivity && (() => {
              const type = getActivityType(selectedActivity)
              const TypeIcon = TYPE_ICONS[type]
              return (
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: getActivityTypeColor(type).bg }}
                >
                  <TypeIcon className="w-5 h-5" color={getActivityTypeColor(type).text} />
                </div>
              )
            })()}
            <div>
              <h3 className="font-medium text-white">{selectedActivity && TYPE_LABELS[getActivityType(selectedActivity)]} Log</h3>
              <p className="text-xs text-neutral-500">{selectedActivity && getAgentName(selectedActivity.agentId)}</p>
            </div>
          </div>

          <button
            onClick={closeSidebar}
            className="p-2 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {selectedActivity && (
          <div className="p-4 border-b border-neutral-800 bg-neutral-900/50 shrink-0">
            <div className="text-sm text-neutral-300 mb-3">
              <span className="text-neutral-500">Goal:</span> {selectedActivity.label}
            </div>

            <div className="flex items-center gap-3 text-xs">
              {(() => {
                const type = getActivityType(selectedActivity)
                const colors = getActivityTypeColor(type)
                const TypeIcon = TYPE_ICONS[type]
                return (
                  <span
                    className="px-2 py-0.5 rounded flex items-center gap-1"
                    style={{ backgroundColor: colors.bg, color: colors.text }}
                  >
                    <TypeIcon className="w-3 h-3" color={colors.text} />
                    {TYPE_LABELS[type]}
                  </span>
                )
              })()}
              <StatusBadge status={selectedActivity.status} />
              <span className="text-neutral-500">
                {formatTime(selectedActivity.start)} &rarr; {selectedActivity.status === 'active' ? 'Now' : formatTime(selectedActivity.end)}
              </span>
            </div>

            <div className="mt-3 text-[10px] text-neutral-600 font-mono">
              Session ID: {selectedActivity.sessionId}
            </div>
          </div>
        )}

        <SessionTraceViewer logs={sessionLogs || []} loading={logsLoading} />
      </ResizablePanel>
    </div>
  )
}
