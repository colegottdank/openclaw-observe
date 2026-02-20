import { useState, useMemo, useRef, useEffect } from 'react'
import { useLocation } from 'wouter'
import {
  Activity,
  X,
  Heart,
  Calendar,
  Zap
} from 'lucide-react'
import { useAgents, useSwarmActivity, useSessionLogs } from '../hooks'
import { normalizeAgentId, getAgentName, getActivityType, getActivityTypeColor, groupAgentsBySwarm } from '../utils/agents'
import { formatTime } from '../utils/time'
import { SessionTraceViewer } from './SessionTraceViewer'
import { TimelineChart } from './TimelineChart'
import { TimelineTooltip, TYPE_ICONS } from './TimelineTooltip'
import { RunOverview } from './RunOverview'
import { ResizablePanel, StatusBadge } from './ui'
import type { SwarmActivity } from '../types'

export function TimelinePage() {
  const [, setLocation] = useLocation()
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

  const { agentRows, agentGroups } = useMemo(() => {
    const agentList = agents || []
    const { swarms, standalone } = groupAgentsBySwarm(agentList)

    // Build ordered rows: swarm groups first, then standalone, then unknown from activities
    const ordered: string[] = []
    const groups: { name: string; startIndex: number; count: number }[] = []
    const seen = new Set<string>()

    for (const swarm of swarms) {
      const startIndex = ordered.length
      const ids = [swarm.leader.id, ...swarm.members.map(m => m.id)]
      ids.forEach(id => { ordered.push(id); seen.add(id) })
      groups.push({ name: swarm.name, startIndex, count: ids.length })
    }

    // Standalone agents
    const standaloneIds = standalone.map(a => a.id)
    if (standaloneIds.length > 0) {
      const startIndex = ordered.length
      standaloneIds.forEach(id => { ordered.push(id); seen.add(id) })
      if (swarms.length > 0) {
        groups.push({ name: 'Standalone', startIndex, count: standaloneIds.length })
      }
    }

    // Add any agents from activities not in config
    if (data?.activities) {
      const unknownStart = ordered.length
      let unknownCount = 0
      for (const activity of data.activities) {
        const id = normalizeAgentId(activity.agentId)
        if (!seen.has(id)) {
          ordered.push(id)
          seen.add(id)
          unknownCount++
        }
      }
      if (unknownCount > 0 && swarms.length > 0) {
        groups.push({ name: 'Other', startIndex: unknownStart, count: unknownCount })
      }
    }

    return { agentRows: ordered, agentGroups: groups }
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
    return lines // Don't reverse - keep oldest to newest (left to right)
  }, [timeRange])

  const closeSidebar = () => {
    setSidebarOpen(false)
    setSelectedActivity(null)
    setLocation('/')
  }

  const handleSelectActivity = (activity: SwarmActivity) => {
    setSelectedActivity(activity)
    setSidebarOpen(true)
    const agentId = normalizeAgentId(activity.agentId)
    setLocation(`/?agent=${encodeURIComponent(agentId)}&session=${encodeURIComponent(activity.sessionId)}`)
  }

  // Restore sidebar from URL params on load
  useEffect(() => {
    if (!data?.activities) return
    const params = new URLSearchParams(window.location.search)
    const sessionId = params.get('session')
    if (!sessionId || selectedActivity) return

    const match = data.activities.find(a => a.sessionId === sessionId)
    if (match) {
      setSelectedActivity(match)
      setSidebarOpen(true)
    }
  }, [data])

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

        <div className="flex items-center gap-4">
          {/* Legend */}
          <div className="hidden lg:flex items-center gap-3 text-[11px] text-neutral-500">
            <span className="flex items-center gap-1.5"><Heart className="w-3 h-3 text-indigo-400" />Heartbeat</span>
            <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3 text-amber-400" />Cron</span>
            <span className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-violet-400" />Sub-agent</span>
            <span className="flex items-center gap-1.5"><Activity className="w-3 h-3 text-emerald-400" />Session</span>
          </div>

          <div className="hidden lg:block w-px h-6 bg-neutral-800" />

          {/* Time range selector */}
          <div className="flex items-center bg-neutral-800/50 rounded-lg p-0.5 border border-neutral-800">
            {[0.5, 1, 3, 6, 12, 24].map(hours => (
              <button
                key={hours}
                onClick={() => setWindowHours(hours)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  windowHours === hours
                    ? 'bg-neutral-700 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                }`}
              >
                {hours}h
              </button>
            ))}
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
          agentGroups={agentGroups}
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
        {selectedActivity && (() => {
          const type = getActivityType(selectedActivity)
          const colors = getActivityTypeColor(type)
          const TypeIcon = TYPE_ICONS[type]
          return (
            <div className="px-4 py-3 border-b border-neutral-800 bg-neutral-900/50 shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: colors.bg }}
                >
                  <TypeIcon className="w-4 h-4" color={colors.text} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{selectedActivity.label}</div>
                  <div className="flex items-center gap-2 text-xs text-neutral-500 mt-0.5">
                    <span>{getAgentName(selectedActivity.agentId)}</span>
                    <span>·</span>
                    <StatusBadge status={selectedActivity.status} />
                    <span>·</span>
                    <span>{formatTime(selectedActivity.start)} → {selectedActivity.status === 'active' ? 'Now' : formatTime(selectedActivity.end)}</span>
                  </div>
                </div>
                <button
                  onClick={closeSidebar}
                  className="p-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )
        })()}

        {/* Run Overview - Shows delegation chain for root sessions */}
        {selectedActivity && data?.activities && (
          <RunOverview
            activities={data.activities}
            selectedActivity={selectedActivity}
            onSelectActivity={handleSelectActivity}
          />
        )}

        <SessionTraceViewer logs={sessionLogs || []} loading={logsLoading} />
      </ResizablePanel>
    </div>
  )
}
