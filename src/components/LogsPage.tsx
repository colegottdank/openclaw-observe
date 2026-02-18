import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { Terminal, RefreshCw, Search, Radio } from 'lucide-react'
import { useGatewayStatus, useLogs } from '../hooks'
import { StatCard } from './ui'

export function LogsPage() {
  const [live, setLive] = useState(true)
  const { data: logs, loading, refetch } = useLogs(live ? 2000 : 5000)
  const [levelFilter, setLevelFilter] = useState<'all' | 'error' | 'info' | 'warn'>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const { data: status } = useGatewayStatus()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [follow, setFollow] = useState(true)
  const initialScrollDone = useRef(false)

  // Extract unique sources from logs
  const sources = useMemo(() => {
    if (!logs) return []
    const set = new Set(logs.map(l => l.source))
    return Array.from(set).sort()
  }, [logs])

  const filteredLogs = useMemo(() => {
    const list = logs || []
    const searchLower = search.toLowerCase()
    return list.filter(log => {
      if (levelFilter !== 'all' && log.level !== levelFilter) return false
      if (sourceFilter !== 'all' && log.source !== sourceFilter) return false
      if (search && !log.raw.toLowerCase().includes(searchLower)) return false
      return true
    })
  }, [logs, levelFilter, sourceFilter, search])

  // Scroll to bottom — instant on first load, smooth after
  const scrollToBottom = useCallback((instant?: boolean) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  // Initial scroll: instant, no animation
  useEffect(() => {
    if (!initialScrollDone.current && filteredLogs.length > 0) {
      initialScrollDone.current = true
      // Use rAF to ensure DOM has rendered
      requestAnimationFrame(() => scrollToBottom(true))
    }
  }, [filteredLogs, scrollToBottom])

  // Follow mode: scroll on new data
  useEffect(() => {
    if (follow && initialScrollDone.current) {
      scrollToBottom()
    }
  }, [filteredLogs, follow, scrollToBottom])

  return (
    <div className="flex flex-col h-full bg-neutral-950 text-neutral-300">
      {/* HEADER */}
      <div className="border-b border-neutral-900 p-4 lg:p-6 bg-neutral-900/20 space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">System Logs</h1>
            <p className="text-neutral-500 text-sm">
              {filteredLogs.length} entries{logs && filteredLogs.length !== logs.length ? ` (of ${logs.length})` : ''}
            </p>
          </div>

          <div className="flex gap-2 items-center flex-wrap">
            {/* Live mode toggle */}
            <button
              onClick={() => setLive(l => !l)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono uppercase tracking-wider transition-colors border ${
                live
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'text-neutral-500 border-transparent hover:bg-neutral-900 hover:text-neutral-300'
              }`}
            >
              <Radio className={`w-3 h-3 ${live ? 'animate-pulse' : ''}`} />
              Live
            </button>

            <div className="h-8 w-px bg-neutral-800" />

            <button
              onClick={refetch}
              className="p-2 rounded-md bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <div className="h-8 w-px bg-neutral-800" />

            {/* Level filter */}
            {(['all', 'error', 'warn', 'info'] as const).map(f => (
              <button
                key={f}
                onClick={() => setLevelFilter(f)}
                className={`px-3 py-1.5 rounded-md text-xs font-mono uppercase tracking-wider transition-colors border ${
                  levelFilter === f
                    ? 'bg-neutral-800 text-white border-neutral-700'
                    : 'text-neutral-500 border-transparent hover:bg-neutral-900 hover:text-neutral-300'
                }`}
              >
                {f}
              </button>
            ))}

            {/* Source filter */}
            {sources.length > 1 && (
              <>
                <div className="h-8 w-px bg-neutral-800" />
                <select
                  value={sourceFilter}
                  onChange={e => setSourceFilter(e.target.value)}
                  className="bg-neutral-800 border border-neutral-700 rounded-md text-xs text-neutral-300 px-2 py-1.5 font-mono"
                >
                  <option value="all">all sources</option>
                  {sources.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </>
            )}
          </div>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
          <input
            type="text"
            placeholder="Search logs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-10 pr-4 py-2 text-sm text-neutral-300 placeholder-neutral-600 focus:outline-none focus:border-neutral-700"
          />
        </div>

        {status && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Gateway Status"
              value={status.status?.toUpperCase() || 'UNKNOWN'}
              color={status.status === 'online' ? 'text-emerald-500' : 'text-amber-500'}
            />
            <StatCard label="Version" value={status.version || 'Unknown'} />
            <StatCard label="Memory" value={status.memoryUsage || '-'} />
            <StatCard label="Uptime" value={status.uptime || '-'} />
          </div>
        )}
      </div>

      {/* LOGS TERMINAL VIEW */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto bg-black p-4 font-mono text-xs"
        onScroll={() => {
          const el = scrollRef.current
          if (!el) return
          const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50
          setFollow(atBottom)
        }}
      >
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-neutral-600 gap-2">
            <Terminal className="w-8 h-8 opacity-20" />
            <span>{search ? 'No logs matching search.' : 'No logs found.'}</span>
          </div>
        ) : (
          <div className="space-y-0.5">
            {filteredLogs.map(log => (
              <div key={log.id} className="flex gap-3 hover:bg-neutral-900/50 px-2 py-0.5 rounded group">
                <span className="text-neutral-600 shrink-0 w-20 select-none opacity-50">
                  {log.timestamp ? log.timestamp.split('T')[1]?.split(/[.+-]/)[0] : ''}
                </span>
                <span className={`shrink-0 w-12 font-bold ${
                  log.level === 'error' ? 'text-red-500' :
                  log.level === 'warn' ? 'text-amber-500' :
                  'text-emerald-500'
                }`}>
                  {log.level.toUpperCase()}
                </span>
                {log.source !== 'gateway' && (
                  <span className="shrink-0 text-indigo-500/70">[{log.source}]</span>
                )}
                <span className="text-neutral-300 break-all">{log.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Jump to bottom when scrolled up */}
      {!follow && (
        <button
          onClick={() => { setFollow(true); scrollToBottom() }}
          className="absolute bottom-6 right-6 px-3 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-xs text-neutral-300 hover:text-white hover:bg-neutral-700 transition-colors shadow-lg"
        >
          ↓ Jump to latest
        </button>
      )}
    </div>
  )
}
