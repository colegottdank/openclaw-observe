import { useState, useRef, useEffect, useMemo } from 'react'
import Markdown from 'react-markdown'
import {
  ArrowDownCircle,
  Search,
  AlertCircle,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Brain,
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
      current = { role: 'user', entries: [entry], index: i }
      turns.push(current)
    } else if (role === 'assistant') {
      current = { role: 'assistant', entries: [entry], index: i }
      turns.push(current)
    } else {
      if (current && current.role === 'assistant') {
        current.entries.push(entry)
      } else {
        current = { role: 'assistant', entries: [entry], index: i }
        turns.push(current)
      }
    }
  }

  return turns
}

/** Get a one-line summary for known tool inputs instead of raw JSON */
function getToolSummary(toolName: string | undefined, input: unknown): string | null {
  if (!toolName || !input || typeof input !== 'object') return null
  const inp = input as Record<string, unknown>

  switch (toolName) {
    case 'Read':
    case 'read':
      return inp.file_path ? `${inp.file_path}` : null
    case 'Edit':
    case 'edit':
      return inp.file_path ? `${inp.file_path}` : null
    case 'Write':
    case 'write':
      return inp.file_path ? `${inp.file_path}` : null
    case 'Bash':
    case 'bash':
    case 'exec':
      return inp.command ? `$ ${String(inp.command).slice(0, 120)}` : null
    case 'Grep':
    case 'grep':
      return inp.pattern ? `/${inp.pattern}/${inp.path ? ` in ${inp.path}` : ''}` : null
    case 'Glob':
    case 'glob':
      return inp.pattern ? `${inp.pattern}${inp.path ? ` in ${inp.path}` : ''}` : null
    case 'delegate':
      return inp.agent ? `\u2192 ${inp.agent}${inp.task ? `: ${String(inp.task).slice(0, 80)}` : ''}` : null
    default:
      return null
  }
}

export function SessionTraceViewer({ logs, loading = false }: SessionTraceViewerProps) {
  const [filter, setFilter] = useState<FilterMode>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [collapsedTools, setCollapsedTools] = useState<Set<number>>(new Set())
  const [collapsedTurns, setCollapsedTurns] = useState<Set<number>>(new Set())
  const [expandedThinking, setExpandedThinking] = useState<Set<number>>(new Set())
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

  const toggleThinking = (key: number) => {
    const next = new Set(expandedThinking)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setExpandedThinking(next)
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
      setTimeout(() => scrollToBottom(true), 50)
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
      return turn.entries.some(e => {
        if (e.type === 'error') return true
        if (e.type === 'tool_result' && e.isError) return true
        const output = typeof e.output === 'string' ? e.output : JSON.stringify(e.output)
        if (output && (
          output.includes('"error":') ||
          output.includes('"code": 4') ||
          output.includes('"code": 5') ||
          output.includes('"status": "error"')
        )) return true
        return false
      })
    }
    return true
  }

  const renderContentBlocks = (blocks: SessionContentBlock[], turnIndex: number) => {
    return blocks.map((block, i) => {
      if (block.type === 'thinking') {
        const thinkingKey = turnIndex * 1000 + 900 + i
        const isExpanded = expandedThinking.has(thinkingKey)
        const preview = block.thinking?.slice(0, 80)?.replace(/\n/g, ' ') || ''
        return (
          <button
            key={i}
            onClick={() => toggleThinking(thinkingKey)}
            className="w-full text-left border border-neutral-800 rounded bg-neutral-900/50 hover:bg-neutral-800/50 transition-colors"
          >
            <div className="flex items-center gap-2 px-3 py-1.5 text-xs">
              {isExpanded ? <ChevronDown size={10} className="text-neutral-500 shrink-0" /> : <ChevronRight size={10} className="text-neutral-500 shrink-0" />}
              <Brain size={12} className="text-neutral-500 shrink-0" />
              <span className="text-neutral-500 font-medium">Thinking</span>
              {!isExpanded && <span className="text-neutral-600 truncate">{preview}</span>}
            </div>
            {isExpanded && (
              <div className="px-3 pb-2 text-xs text-neutral-500 italic whitespace-pre-wrap border-t border-neutral-800/50 mt-1 pt-2 max-h-48 overflow-y-auto">
                {block.thinking}
              </div>
            )}
          </button>
        )
      }
      if (block.type === 'text') {
        return (
          <div key={i} className="trace-markdown text-sm text-neutral-300">
            <Markdown components={{
              a: ({href, children, ...props}: React.AnchorHTMLAttributes<HTMLAnchorElement> & {children?: React.ReactNode}) => {
                if (href && /^(javascript|data|vbscript):/i.test(href)) return <span>{children}</span>
                return <a href={href} rel="noopener noreferrer" target="_blank" {...props}>{children}</a>
              }
            }}>{block.text || ''}</Markdown>
          </div>
        )
      }
      if (block.type === 'toolCall') {
        return null
      }
      return <div key={i} className="text-neutral-600 text-xs">{JSON.stringify(block)}</div>
    })
  }

  const renderToolEntry = (entry: SessionLogEntry, idx: number) => {
    const timeStr = getTimestamp(entry)
    const isCollapsed = collapsedTools.has(idx)
    const role = entry.message?.role

    // Tool call
    if (entry.type === 'tool_use' || (entry.tool && entry.input)) {
      const toolName = entry.tool || entry.name
      const toolInput = entry.input || entry.args
      const summary = getToolSummary(toolName, toolInput)
      const isDelegation = toolName === 'delegate'

      return (
        <div key={idx} className={`border-l-2 ${isDelegation ? 'border-violet-500/40' : 'border-amber-500/40'} bg-neutral-900/30 rounded-r-sm`}>
          <button
            onClick={() => toggleToolCollapse(idx)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-neutral-800/30 transition-colors"
          >
            {isCollapsed ? <ChevronRight size={10} className={`${isDelegation ? 'text-violet-500' : 'text-amber-500'} shrink-0`} /> : <ChevronDown size={10} className={`${isDelegation ? 'text-violet-500' : 'text-amber-500'} shrink-0`} />}
            <span className={`font-bold ${isDelegation ? 'text-violet-500' : 'text-amber-500'}`}>{isDelegation ? 'Delegate:' : 'Tool:'}</span>
            <span className={`font-mono ${isDelegation ? 'text-violet-200/80' : 'text-amber-200/80'}`}>{toolName}</span>
            {summary && <span className="text-neutral-400 truncate flex-1 text-left font-mono">{summary}</span>}
            {timeStr && <span className="text-[9px] font-mono text-neutral-600 ml-auto shrink-0">{timeStr}</span>}
          </button>
          {!isCollapsed && (
            <pre className="px-3 pb-2 text-xs font-mono text-amber-200/60 whitespace-pre-wrap break-all overflow-x-hidden">
              {typeof toolInput === 'string' ? toolInput : JSON.stringify(toolInput, null, 2)}
            </pre>
          )}
        </div>
      )
    }

    // Tool result
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

      // Compact success messages
      const isShortSuccess = outputContent.length < 80 && (
        outputContent.includes('success') ||
        outputContent.includes('updated') ||
        outputContent.includes('created') ||
        outputContent.includes('File ') ||
        outputContent.includes('added ')
      )

      if (isShortSuccess) {
        return (
          <div key={idx} className="flex items-center gap-2 px-3 py-1 text-xs">
            <span className="text-emerald-500/70">\u2713</span>
            <span className="text-emerald-200/60 font-mono">{outputContent}</span>
            {timeStr && <span className="text-[9px] font-mono text-neutral-600 ml-auto">{timeStr}</span>}
          </div>
        )
      }

      return (
        <div key={idx} className="border-l-2 border-emerald-500/40 bg-neutral-900/30 rounded-r-sm">
          <button
            onClick={() => toggleToolCollapse(idx)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-neutral-800/30 transition-colors"
          >
            {isCollapsed ? <ChevronRight size={10} className="text-emerald-500 shrink-0" /> : <ChevronDown size={10} className="text-emerald-500 shrink-0" />}
            <span className="font-bold text-emerald-500">Output</span>
            {isCollapsed && <span className="text-neutral-600 font-mono truncate flex-1 text-left">{outputContent.slice(0, 80)}</span>}
            {timeStr && <span className="text-[9px] font-mono text-neutral-600 ml-auto shrink-0">{timeStr}</span>}
          </button>
          {!isCollapsed && (
            <pre className="px-3 pb-2 text-xs font-mono text-emerald-200/60 whitespace-pre-wrap break-all overflow-x-hidden max-h-64 overflow-y-auto">
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
            <div className="flex-1 text-sm text-neutral-300 whitespace-pre-wrap min-w-0">{text}</div>
            {timeStr && <span className="text-[9px] font-mono text-neutral-600 shrink-0">{timeStr}</span>}
          </div>
        </div>
      )
    }

    // Assistant turn
    const primaryEntry = firstEntry
    const toolEntries = turn.entries.slice(1)
    const isTurnCollapsed = collapsedTurns.has(turn.index)

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
          <div className="space-y-2 ml-0">
            {renderContentBlocks(textBlocks, turn.index)}
          </div>
        </div>

        {/* Nested tool calls + results */}
        {hasToolActivity && !isTurnCollapsed && (
          <div className="border-t border-neutral-800/50 mx-3 mb-3 pt-2 space-y-1">
            {toolCallBlocks.map((block, i) => {
              const summary = getToolSummary(block.name, block.arguments)
              const isDelegation = block.name === 'delegate'
              return (
                <div key={`tc-${i}`} className={`border-l-2 ${isDelegation ? 'border-violet-500/40' : 'border-amber-500/40'} bg-neutral-900/30 rounded-r-sm`}>
                  <button
                    onClick={() => toggleToolCollapse(turn.index * 1000 + i)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-neutral-800/30 transition-colors"
                  >
                    {collapsedTools.has(turn.index * 1000 + i) ? <ChevronRight size={10} className={`${isDelegation ? 'text-violet-500' : 'text-amber-500'} shrink-0`} /> : <ChevronDown size={10} className={`${isDelegation ? 'text-violet-500' : 'text-amber-500'} shrink-0`} />}
                    <span className={`font-bold ${isDelegation ? 'text-violet-500' : 'text-amber-500'}`}>{isDelegation ? 'Delegate:' : 'Tool:'}</span>
                    <span className={`font-mono ${isDelegation ? 'text-violet-200/80' : 'text-amber-200/80'}`}>{block.name}</span>
                    {summary && <span className="text-neutral-400 truncate flex-1 text-left font-mono">{summary}</span>}
                  </button>
                  {!collapsedTools.has(turn.index * 1000 + i) && (
                    <pre className="px-3 pb-2 text-xs font-mono text-amber-200/60 whitespace-pre-wrap break-all overflow-x-hidden">
                      {typeof block.arguments === 'string' ? block.arguments : JSON.stringify(block.arguments, null, 2)}
                    </pre>
                  )}
                </div>
              )
            })}

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
