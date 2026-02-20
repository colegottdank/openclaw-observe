import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { Terminal, RefreshCw, Search, Radio } from 'lucide-react'
import { useGatewayStatus, useLogs } from '../hooks'
import { SimpleSelect } from './ui'

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
      {/* Header */}
      <div className="border-b border-neutral-900 p-4 bg-neutral-900/20 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white">System Logs</h1>
              {live && (
                <span className="text-xs px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-emerald-400">
                  Live
                </span>
              )}
            </div>
            <p className="text-neutral-500 text-sm mt-0.5">
              {filteredLogs.length} entries{logs && filteredLogs.length !== logs.length ? ` (of ${logs.length})` : ''}
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-2xl font-bold text-white">{filteredLogs.length}</div>
              <div className="text-xs text-neutral-500">Entries</div>
            </div>
            {status && (
              <>
                <div className="w-px h-10 bg-neutral-800" />
                <div className="text-right">
                  <div className={`text-2xl font-bold ${status.status === 'online' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {status.status === 'online' ? 'Online' : 'Degraded'}
                  </div>
                  <div className="text-xs text-neutral-500">v{status.version || '?'}</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Search logs..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg py-2 pl-9 pr-3 text-sm text-neutral-300 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-700 transition-colors"
            />
          </div>

          {/* Level filter */}
          {(['all', 'error', 'warn', 'info'] as const).map(f => (
            <button
              key={f}
              onClick={() => setLevelFilter(f)}
              className={`px-3 py-2 rounded-md text-xs font-mono uppercase tracking-wider transition-colors border ${
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
              <SimpleSelect
                value={sourceFilter}
                options={[
                  { value: 'all', label: 'All Sources' },
                  ...sources.map(s => ({ value: s, label: s }))
                ]}
                onChange={setSourceFilter}
                className="w-40"
              />
            </>
          )}

          <div className="flex-1" />

          <button
            onClick={refetch}
            className="flex items-center gap-2 px-3 py-2 rounded-md bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="text-xs">Refresh</span>
          </button>
        </div>
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
