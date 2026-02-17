import { useState, useRef, useEffect, useMemo } from 'react'
import {
  ArrowDownCircle,
  Search,
  AlertCircle,
  MessageSquare,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { formatTimeFull } from '../utils/time'
import type { SessionLogEntry, SessionContentBlock } from '../types'

interface SessionTraceViewerProps {
  logs: SessionLogEntry[]
  loading?: boolean
}

type FilterMode = 'all' | 'user' | 'error'

/** A grouped turn: a primary message + any tool interactions that follow it */
interface Turn {
  role: 'user' | 'assistant'
  entries: SessionLogEntry[]
  index: number // original index of the first entry
}

function groupIntoTurns(logs: SessionLogEntry[]): Turn[] {
  const turns: Turn[] = []
  let current: Turn | null = null

  for (let i = 0; i < logs.length; i++) {
    const entry = logs[i]
    const role = entry.message?.role

    if (role === 'user') {
      // User messages always start a new turn
      current = { role: 'user', entries: [entry], index: i }
      turns.push(current)
    } else if (role === 'assistant') {
      // Assistant messages start a new assistant turn
      current = { role: 'assistant', entries: [entry], index: i }
      turns.push(current)
    } else {
      // Tool results, tool_use, tool_result, etc. — nest under current assistant turn
      if (current && current.role === 'assistant') {
        current.entries.push(entry)
      } else {
        // Orphaned tool entry (no preceding assistant) — wrap it in its own turn
        current = { role: 'assistant', entries: [entry], index: i }
        turns.push(current)
      }
    }
  }

  return turns
}

export function SessionTraceViewer({ logs, loading = false }: SessionTraceViewerProps) {
  const [filter, setFilter] = useState<FilterMode>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [collapsedTools, setCollapsedTools] = useState<Set<number>>(new Set())
  const [collapsedTurns, setCollapsedTurns] = useState<Set<number>>(new Set())
  const logContainerRef = useRef<HTMLDivElement>(null)
  const userHasScrolled = useRef(false)
  const prevLogCount = useRef(0)

  const scrollToBottom = (instant = false) => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTo({
        top: logContainerRef.current.scrollHeight,
        behavior: instant ? 'instant' : 'smooth',
      })
    }
  }

  const toggleToolCollapse = (index: number) => {
    const next = new Set(collapsedTools)
    if (next.has(index)) next.delete(index)
    else next.add(index)
    setCollapsedTools(next)
  }

  const toggleTurnCollapse = (index: number) => {
    const next = new Set(collapsedTurns)
    if (next.has(index)) next.delete(index)
    else next.add(index)
    setCollapsedTurns(next)
  }

  const handleScroll = () => {
    if (!logContainerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 80
    userHasScrolled.current = !isAtBottom
  }

  useEffect(() => {
    if (logs.length === 0) {
      prevLogCount.current = 0
      userHasScrolled.current = false
      return
    }
    if (prevLogCount.current === 0) {
      prevLogCount.current = logs.length
      return
    }
    if (logs.length > prevLogCount.current && !userHasScrolled.current) {
      scrollToBottom(true)
    }
    prevLogCount.current = logs.length
  }, [logs])

  const turns = useMemo(() => groupIntoTurns(logs), [logs])

  const getTimestamp = (entry: SessionLogEntry) => {
    const ts = entry.ts || entry.timestamp || entry.createdAt
    if (!ts) return ''
    const ms = typeof ts === 'string' ? new Date(ts).getTime() : ts
    return formatTimeFull(ms)
  }

  const matchesSearch = (entry: SessionLogEntry) => {
    if (!searchTerm) return true
    return JSON.stringify(entry).toLowerCase().includes(searchTerm.toLowerCase())
  }

  const matchesFilter = (turn: Turn) => {
    if (filter === 'user') return turn.role === 'user'
    if (filter === 'error') {
      return turn.entries.some(e =>
        e.type === 'error' ||
        (e.type === 'tool_result' && e.isError) ||
        JSON.stringify(e).toLowerCase().includes('error')
      )
    }
    return true
  }

  const renderContentBlocks = (blocks: SessionContentBlock[]) => {
    return blocks.map((block, i) => {
      if (block.type === 'thinking') {
        return (
          <div key={i} className="text-neutral-500 italic border-l-2 border-neutral-700 pl-3 py-1 text-xs">
            {block.thinking}
          </div>
        )
      }
      if (block.type === 'text') {
        return <div key={i} className="whitespace-pre-wrap">{block.text}</div>
      }
      if (block.type === 'toolCall') {
        return null // Tool calls are rendered as nested items below
      }
      return <div key={i} className="text-neutral-600 text-xs">{JSON.stringify(block)}</div>
    })
  }

  const renderToolEntry = (entry: SessionLogEntry, idx: number) => {
    const timeStr = getTimestamp(entry)
    const isCollapsed = collapsedTools.has(idx)
    const role = entry.message?.role

    // Tool call (from assistant content blocks or standalone tool_use)
    if (entry.type === 'tool_use' || (entry.tool && entry.input)) {
      const toolName = entry.tool || entry.name
      const toolInput = entry.input || entry.args
      return (
        <div key={idx} className="border-l-2 border-amber-500/40 bg-neutral-900/30 rounded-r-sm">
          <button
            onClick={() => toggleToolCollapse(idx)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-neutral-800/30 transition-colors"
          >
            {isCollapsed ? <ChevronRight size={10} className="text-amber-500 shrink-0" /> : <ChevronDown size={10} className="text-amber-500 shrink-0" />}
            <span className="font-bold text-amber-500">Tool:</span>
            <span className="font-mono text-amber-200/80">{toolName}</span>
            {timeStr && <span className="text-[9px] font-mono text-neutral-600 ml-auto">{timeStr}</span>}
          </button>
          {!isCollapsed && (
            <pre className="px-3 pb-2 text-xs font-mono text-amber-200/60 whitespace-pre-wrap break-all overflow-x-auto">
              {typeof toolInput === 'string' ? toolInput : JSON.stringify(toolInput, null, 2)}
            </pre>
          )}
        </div>
      )
    }

    // Tool result (standalone or toolResult role)
    if (entry.type === 'tool_result' || entry.output || role === 'toolResult' || role === 'tool') {
      let outputContent: string
      if (role === 'toolResult' || role === 'tool') {
        const blocks = entry.message?.content
        if (typeof blocks === 'string') {
          outputContent = blocks
        } else if (Array.isArray(blocks)) {
          outputContent = blocks.map(b => b.text || JSON.stringify(b)).join('\n')
        } else {
          outputContent = JSON.stringify(blocks)
        }
      } else {
        const out = entry.output
        outputContent = typeof out === 'string' ? out : JSON.stringify(out, null, 2)
      }

      return (
        <div key={idx} className="border-l-2 border-emerald-500/40 bg-neutral-900/30 rounded-r-sm">
          <button
            onClick={() => toggleToolCollapse(idx)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-neutral-800/30 transition-colors"
          >
            {isCollapsed ? <ChevronRight size={10} className="text-emerald-500 shrink-0" /> : <ChevronDown size={10} className="text-emerald-500 shrink-0" />}
            <span className="font-bold text-emerald-500">Output</span>
            {!isCollapsed && <span className="text-neutral-600 font-mono truncate flex-1 text-left">{outputContent.slice(0, 60)}</span>}
            {timeStr && <span className="text-[9px] font-mono text-neutral-600 ml-auto shrink-0">{timeStr}</span>}
          </button>
          {!isCollapsed && (
            <pre className="px-3 pb-2 text-xs font-mono text-emerald-200/60 whitespace-pre-wrap break-all overflow-x-auto max-h-64 overflow-y-auto">
              {outputContent}
            </pre>
          )}
        </div>
      )
    }

    return null
  }

  const renderTurn = (turn: Turn) => {
    if (!matchesFilter(turn)) return null

    const hasSearch = turn.entries.some(matchesSearch)
    if (searchTerm && !hasSearch) return null

    const firstEntry = turn.entries[0]
    const timeStr = getTimestamp(firstEntry)

    if (turn.role === 'user') {
      const content = firstEntry.message?.content
      let text = ''
      if (typeof content === 'string') text = content
      else if (Array.isArray(content)) text = content.map(b => b.text || '').join('\n')

      return (
        <div key={turn.index} className="rounded-lg bg-blue-500/5 border border-blue-500/10">
          <div className="flex gap-3 p-4">
            <div className="shrink-0">
              <span className="text-[10px] font-bold uppercase text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">User</span>
            </div>
            <div className="flex-1 text-sm font-mono text-neutral-300 whitespace-pre-wrap min-w-0">{text}</div>
            {timeStr && <span className="text-[9px] font-mono text-neutral-600 shrink-0">{timeStr}</span>}
          </div>
        </div>
      )
    }

    // Assistant turn
    const primaryEntry = firstEntry
    const toolEntries = turn.entries.slice(1)
    const isTurnCollapsed = collapsedTurns.has(turn.index)

    // Extract text and tool call blocks from the primary assistant message
    const content = primaryEntry.message?.content
    let blocks: SessionContentBlock[] = []
    if (typeof content === 'string') {
      blocks = [{ type: 'text', text: content }]
    } else if (Array.isArray(content)) {
      blocks = content
    }

    const textBlocks = blocks.filter(b => b.type === 'text' || b.type === 'thinking')
    const toolCallBlocks = blocks.filter(b => b.type === 'toolCall')
    const hasToolActivity = toolCallBlocks.length > 0 || toolEntries.length > 0
    const toolCount = toolCallBlocks.length + toolEntries.filter(e =>
      e.type === 'tool_use' || (e.tool && e.input)
    ).length

    // If primary entry is itself a tool entry (orphaned), render differently
    const isPrimaryTool = !primaryEntry.message?.role || primaryEntry.message?.role === 'toolResult' || primaryEntry.message?.role === 'tool' || primaryEntry.type === 'tool_use' || primaryEntry.type === 'tool_result'
    if (isPrimaryTool) {
      return (
        <div key={turn.index} className="rounded-lg border border-neutral-800 overflow-hidden">
          <div className="space-y-px">
            {turn.entries.map((entry, i) => renderToolEntry(entry, turn.index + i))}
          </div>
        </div>
      )
    }

    return (
      <div key={turn.index} className="rounded-lg border border-neutral-800 overflow-hidden">
        {/* Assistant header + text content */}
        <div className="p-4">
          <div className="flex items-start gap-3 mb-2">
            <span className="text-[10px] font-bold uppercase text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded shrink-0">Assistant</span>
            {hasToolActivity && (
              <button
                onClick={() => toggleTurnCollapse(turn.index)}
                className="text-[10px] text-neutral-500 hover:text-neutral-300 flex items-center gap-1 transition-colors"
              >
                {isTurnCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
                {toolCount} tool call{toolCount !== 1 ? 's' : ''}
              </button>
            )}
            {timeStr && <span className="text-[9px] font-mono text-neutral-600 ml-auto shrink-0">{timeStr}</span>}
          </div>
          <div className="text-sm font-mono text-neutral-300 space-y-2 ml-0">
            {renderContentBlocks(textBlocks)}
          </div>
        </div>

        {/* Nested tool calls + results */}
        {hasToolActivity && !isTurnCollapsed && (
          <div className="border-t border-neutral-800/50 mx-3 mb-3 pt-2 space-y-1">
            {/* Inline tool calls from assistant content blocks */}
            {toolCallBlocks.map((block, i) => (
              <div key={`tc-${i}`} className="border-l-2 border-amber-500/40 bg-neutral-900/30 rounded-r-sm">
                <button
                  onClick={() => toggleToolCollapse(turn.index * 1000 + i)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-neutral-800/30 transition-colors"
                >
                  {collapsedTools.has(turn.index * 1000 + i) ? <ChevronRight size={10} className="text-amber-500 shrink-0" /> : <ChevronDown size={10} className="text-amber-500 shrink-0" />}
                  <span className="font-bold text-amber-500">Tool:</span>
                  <span className="font-mono text-amber-200/80">{block.name}</span>
                </button>
                {!collapsedTools.has(turn.index * 1000 + i) && (
                  <pre className="px-3 pb-2 text-xs font-mono text-amber-200/60 whitespace-pre-wrap break-all overflow-x-auto">
                    {typeof block.arguments === 'string' ? block.arguments : JSON.stringify(block.arguments, null, 2)}
                  </pre>
                )}
              </div>
            ))}

            {/* Subsequent tool entries (tool_use, tool_result, toolResult messages) */}
            {toolEntries.map((entry, i) => renderToolEntry(entry, turn.index + 1 + i))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-neutral-950 relative">
      {/* TOOLBAR */}
      <div className="h-12 border-b border-neutral-800 bg-neutral-900/30 flex items-center px-4 gap-4 shrink-0 z-10">
        <div className="flex bg-neutral-800/50 rounded-md p-0.5 border border-neutral-800">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded text-xs font-medium transition-all ${filter === 'all' ? 'bg-neutral-700 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('user')}
            className={`px-3 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${filter === 'user' ? 'bg-blue-500/20 text-blue-400 shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            <MessageSquare size={12} />
            Messages
          </button>
          <button
            onClick={() => setFilter('error')}
            className={`px-3 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${filter === 'error' ? 'bg-red-500/20 text-red-400 shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            <AlertCircle size={12} />
            Errors
          </button>
        </div>

        <div className="h-4 w-px bg-neutral-800" />

        <div className="flex-1 relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-md py-1.5 pl-8 pr-3 text-xs text-neutral-300 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-700 transition-colors"
          />
        </div>

        <button
          onClick={() => scrollToBottom()}
          className="p-1.5 text-neutral-500 hover:text-white bg-neutral-800/50 hover:bg-neutral-800 rounded transition-colors"
          title="Jump to Bottom"
        >
          <ArrowDownCircle size={16} />
        </button>
      </div>

      <div ref={logContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-center p-12 text-neutral-500 animate-pulse">Loading trace...</div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-3 pb-2">
            {turns.length === 0 ? (
              <div className="text-center p-12 text-neutral-500">Empty session log.</div>
            ) : (
              turns.map(turn => renderTurn(turn))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
