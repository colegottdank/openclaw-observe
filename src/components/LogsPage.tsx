import { useState, useEffect, useCallback } from 'react'
import { Terminal, RefreshCw } from 'lucide-react'
import { useGatewayStatus } from '../hooks'
import { StatCard } from './ui'

interface LogEntry {
  id: string
  timestamp: string
  level: string
  source: string
  message: string
  raw: string
}

export function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'error' | 'info' | 'warn'>('all')

  const { data: status } = useGatewayStatus()

  const fetchLogs = useCallback(async () => {
    try {
      const logsRes = await fetch('/api/gateway/logs?lines=200')
      if (logsRes.ok) {
        const data = await logsRes.json()
        const rawLines = data.logs.split('\n').filter((l: string) => l.trim())

        const parsedLogs = rawLines.map((line: string, i: number) => {
          let level = 'info'
          if (line.match(/error|fail|exception/i)) level = 'error'
          else if (line.match(/warn/i)) level = 'warn'

          // Parse timestamp from log line (ISO format at start)
          const tsMatch = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[\d.]*[^ ]*)/)
          const timestamp = tsMatch ? tsMatch[1] : ''
          const message = tsMatch ? line.slice(tsMatch[0].length).trim() : line

          return {
            id: `log-${i}`,
            timestamp,
            level,
            source: 'gateway',
            message,
            raw: line,
          }
        }).reverse()

        setLogs(parsedLogs)
      }
    } catch (e) {
      console.error('Error fetching logs:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs()
    const interval = setInterval(fetchLogs, 5000)
    return () => clearInterval(interval)
  }, [fetchLogs])

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true
    return log.level === filter
  })

  return (
    <div className="flex flex-col h-full bg-neutral-950 text-neutral-300">
      {/* HEADER WITH STATS */}
      <div className="border-b border-neutral-900 p-4 lg:p-6 bg-neutral-900/20">
        <div className="flex flex-col lg:flex-row justify-between items-start mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">System Logs</h1>
            <p className="text-neutral-500 text-sm">Real-time telemetry from OpenClaw gateway.</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={fetchLogs}
              className="p-2 rounded-md bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <div className="h-8 w-px bg-neutral-800 mx-2" />
            {(['all', 'error', 'warn', 'info'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-xs font-mono uppercase tracking-wider transition-colors border ${
                  filter === f
                    ? 'bg-neutral-800 text-white border-neutral-700'
                    : 'text-neutral-500 border-transparent hover:bg-neutral-900 hover:text-neutral-300'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
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
      <div className="flex-1 overflow-auto bg-black p-4 font-mono text-xs">
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-neutral-600 gap-2">
            <Terminal className="w-8 h-8 opacity-20" />
            <span>No logs found matching filter.</span>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredLogs.map(log => (
              <div key={log.id} className="flex gap-3 hover:bg-neutral-900/50 px-2 py-0.5 rounded group">
                <span className="text-neutral-600 shrink-0 w-24 select-none opacity-50">{log.timestamp ? log.timestamp.split('T')[1]?.split(/[.+-]/)[0] : ''}</span>
                <span className={`shrink-0 w-12 font-bold ${
                  log.level === 'error' ? 'text-red-500' :
                  log.level === 'warn' ? 'text-amber-500' :
                  'text-emerald-500'
                }`}>
                  {log.level.toUpperCase()}
                </span>
                <span className="text-neutral-300 break-all">{log.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
