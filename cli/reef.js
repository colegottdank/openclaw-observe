#!/usr/bin/env node

const BASE = process.env.REEF_URL || 'http://localhost:3179'

async function api(path) {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  const ct = res.headers.get('content-type') || ''
  return ct.includes('json') ? res.json() : res.text()
}

// --- Formatting helpers ---

function pad(str, len) {
  str = String(str ?? '')
  return str.length >= len ? str.slice(0, len) : str + ' '.repeat(len - str.length)
}

function rpad(str, len) {
  str = String(str ?? '')
  return str.length >= len ? str.slice(0, len) : ' '.repeat(len - str.length) + str
}

function tokens(n) {
  if (!n) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

function ago(iso) {
  if (!iso) return 'never'
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 0) return 'just now'
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function duration(ms) {
  if (!ms || ms <= 0) return '0s'
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${s % 60}s`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}

const STATUS_ICON = { busy: '\x1b[32m●\x1b[0m', idle: '\x1b[90m○\x1b[0m', active: '\x1b[32m●\x1b[0m', completed: '\x1b[90m●\x1b[0m', aborted: '\x1b[31m●\x1b[0m', online: '\x1b[32m●\x1b[0m', offline: '\x1b[31m●\x1b[0m' }
const DIM = '\x1b[90m'
const BOLD = '\x1b[1m'
const RESET = '\x1b[0m'
const CYAN = '\x1b[36m'
const YELLOW = '\x1b[33m'
const GREEN = '\x1b[32m'
const RED = '\x1b[31m'

// --- Commands ---

async function cmdAgents() {
  const agents = await api('/api/agents')
  if (!agents.length) return console.log('No agents configured.')

  console.log(`${BOLD}${pad('AGENT', 18)} ${pad('STATUS', 11)} ${rpad('SESS', 5)} ${rpad('ERR', 4)} ${rpad('TOKENS', 8)} ${pad('LAST ACTIVE', 12)} TASK${RESET}`)
  for (const a of agents) {
    const icon = STATUS_ICON[a.status] || '?'
    const name = a.emoji ? `${a.emoji} ${a.name}` : `  ${a.name}`
    console.log(`${pad(name, 18)} ${icon} ${pad(a.status, 9)}  ${rpad(String(a.sessionCount), 5)} ${rpad(String(a.errorCount), 4)} ${rpad(tokens(a.totalTokens), 8)} ${pad(ago(a.lastActive), 12)} ${DIM}${a.currentTask || ''}${RESET}`)
  }
}

async function cmdSessions(args) {
  const agentId = args.find(a => a.startsWith('--agent='))?.split('=')[1]
  const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1]) || 20
  const qs = agentId ? `?agentId=${agentId}` : ''
  const sessions = await api(`/api/sessions${qs}`)

  if (!sessions.length) return console.log('No sessions found.')

  const shown = sessions.slice(0, limit)
  console.log(`${BOLD}${pad('AGENT', 14)} ${pad('STATUS', 12)} ${pad('CONTEXT', 20)} ${pad('UPDATED', 12)} SESSION ID${RESET}`)
  for (const s of shown) {
    const icon = STATUS_ICON[s.status] || '?'
    const updated = s.updatedAt ? ago(new Date(s.updatedAt).toISOString()) : 'unknown'
    const ctx = s.channelName || s.displayName || ''
    const sid = s.sessionId || s.key?.split(':').pop() || ''
    console.log(`${pad(s.agentId, 14)} ${icon} ${pad(s.status, 9)}  ${pad(ctx, 20)} ${pad(updated, 12)} ${DIM}${sid.slice(0, 12)}${RESET}`)
  }
  if (sessions.length > limit) console.log(`${DIM}... and ${sessions.length - limit} more (use --limit=N)${RESET}`)
}

async function cmdSession(args) {
  // Accept: reef session <agentId> <sessionId>
  //     or: reef session <sessionId>  (searches all agents)
  let agentId = null, sessionId = null
  const positional = args.filter(a => !a.startsWith('--'))
  if (positional.length === 2) {
    agentId = positional[0]
    sessionId = positional[1]
  } else if (positional.length === 1) {
    sessionId = positional[0]
  } else {
    console.error(`Usage: reef session <sessionId> or reef session <agentId> <sessionId>`)
    process.exit(1)
  }

  // Resolve partial session IDs by searching all sessions
  const sessions = await api('/api/sessions')
  const match = sessions.find(s => s.sessionId?.startsWith(sessionId) && (!agentId || s.agentId === agentId))
  if (!match) {
    console.error(`${RED}No session found matching: ${sessionId}${agentId ? ` (agent: ${agentId})` : ''}${RESET}`)
    process.exit(1)
  }
  agentId = match.agentId
  sessionId = match.sessionId

  // Fetch session JSONL and swarm activity (for parent/child info) in parallel
  const [sessionRes, swarmData] = await Promise.all([
    fetch(`${BASE}/api/sessions/${agentId}/${sessionId}`),
    api('/api/swarm/activity?window=168').catch(() => ({ activities: [] })),
  ])
  if (!sessionRes.ok) {
    console.error(`${RED}Error:${RESET} ${sessionRes.status} ${sessionRes.statusText}`)
    process.exit(1)
  }
  const text = await sessionRes.text()
  const entries = text.trim().split('\n').map(line => {
    try { return JSON.parse(line) } catch { return null }
  }).filter(Boolean)

  if (!entries.length) return console.log('Empty session.')

  // Find this session in swarm data for parent/child info
  const thisActivity = (swarmData.activities || []).find(a => a.sessionId === sessionId)
  const children = (swarmData.activities || []).filter(a => a.parentSessionId === sessionId)

  // Session header info
  const first = entries[0]
  const last = entries[entries.length - 1]
  const startTime = first.timestamp ? new Date(first.timestamp) : null
  const endTime = last.timestamp ? new Date(last.timestamp) : null

  // Extract model from model-snapshot or model_change entry
  const modelEntry = entries.find(e => e.type === 'model_change' || (e.type === 'custom' && e.customType === 'model-snapshot'))
  const model = modelEntry?.modelId || modelEntry?.data?.modelId || null

  // Session status from match
  const statusIcon = STATUS_ICON[match.status] || '?'

  console.log(`${BOLD}Session: ${sessionId}${RESET}`)
  console.log(`  Agent:    ${agentId}`)
  console.log(`  Status:   ${statusIcon} ${match.status}`)
  if (model) console.log(`  Model:    ${model}`)
  if (startTime) console.log(`  Started:  ${startTime.toLocaleString()} (${ago(startTime.toISOString())})`)
  if (endTime) console.log(`  Ended:    ${endTime.toLocaleString()} (${ago(endTime.toISOString())})`)
  if (startTime && endTime) console.log(`  Duration: ${duration(endTime - startTime)}`)
  console.log(`  Entries:  ${entries.length}`)

  // Parent info
  if (thisActivity?.parentSessionId) {
    const parent = (swarmData.activities || []).find(a => a.sessionId === thisActivity.parentSessionId)
    if (parent) {
      console.log(`  Parent:   ${parent.agentId}/${parent.label} ${DIM}(${thisActivity.parentSessionId.slice(0, 8)})${RESET}`)
    } else {
      console.log(`  Parent:   ${thisActivity.parentSessionId.slice(0, 12)}`)
    }
  }

  // Children info
  if (children.length > 0) {
    console.log(`  Children: ${children.length}`)
    for (const child of children) {
      const cIcon = STATUS_ICON[child.status] || '?'
      console.log(`    ${cIcon} ${child.agentId}/${child.label} ${DIM}(${child.sessionId.slice(0, 8)}) ${duration(child.end - child.start)}${RESET}`)
    }
  }

  console.log()

  // Show conversation flow
  console.log(`${BOLD}Trace:${RESET}`)
  console.log()

  for (const entry of entries) {
    const ts = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : ''

    if (entry.type === 'message' && entry.message?.role === 'user') {
      const content = entry.message.content
      const text = Array.isArray(content) ? content.map(b => b.text || '').join(' ') : (content || '')
      const preview = text.slice(0, 200).replace(/\n/g, ' ')
      console.log(`  ${DIM}${ts}${RESET} ${CYAN}user${RESET}: ${preview}${text.length > 200 ? '...' : ''}`)
    }

    if (entry.type === 'message' && entry.message?.role === 'assistant') {
      const content = entry.message.content
      if (Array.isArray(content)) {
        const textParts = content.filter(b => b.type === 'text').map(b => b.text || '')
        const tools = content.filter(b => b.type === 'toolCall' || b.type === 'tool_use')
        if (textParts.length > 0) {
          const joined = textParts.join(' ')
          const preview = joined.slice(0, 200).replace(/\n/g, ' ')
          console.log(`  ${DIM}${ts}${RESET} ${GREEN}assistant${RESET}: ${preview}${joined.length > 200 ? '...' : ''}`)
        }
        for (const tool of tools) {
          const toolArgs = tool.arguments || tool.input || {}
          const argStr = JSON.stringify(toolArgs).slice(0, 120)
          console.log(`  ${DIM}${ts}${RESET} ${YELLOW}call${RESET} ${tool.name} ${DIM}${argStr}${argStr.length >= 120 ? '...' : ''}${RESET}`)
        }
      } else if (typeof content === 'string') {
        const preview = content.slice(0, 200).replace(/\n/g, ' ')
        console.log(`  ${DIM}${ts}${RESET} ${GREEN}assistant${RESET}: ${preview}${content.length > 200 ? '...' : ''}`)
      }
    }

    // Tool results (role=toolResult in OpenClaw JSONL format)
    if (entry.type === 'message' && entry.message?.role === 'toolResult') {
      const content = entry.message.content
      let resultText = ''
      if (Array.isArray(content)) {
        resultText = content.filter(b => b.type === 'text').map(b => b.text || '').join(' ')
      } else {
        resultText = String(content || '')
      }
      const preview = resultText.slice(0, 120).replace(/\n/g, ' ')
      const isError = entry.message.is_error || resultText.toLowerCase().startsWith('error')
      const tag = isError ? `${RED}err${RESET}` : `${DIM}ok${RESET}`
      console.log(`  ${DIM}${ts}  └─ ${tag} ${preview}${resultText.length > 120 ? '...' : ''}${RESET}`)
    }
  }

  // Stats summary
  const toolCalls = entries.filter(e => e.message?.role === 'assistant' && Array.isArray(e.message.content) && e.message.content.some(b => b.type === 'toolCall' || b.type === 'tool_use'))
  const toolCallCount = toolCalls.reduce((sum, e) => sum + e.message.content.filter(b => b.type === 'toolCall' || b.type === 'tool_use').length, 0)
  const userMsgCount = entries.filter(e => e.message?.role === 'user').length
  const assistantMsgCount = entries.filter(e => e.message?.role === 'assistant').length

  console.log()
  console.log(`${BOLD}Stats:${RESET} ${userMsgCount} user / ${assistantMsgCount} assistant / ${toolCallCount} tool calls`)
}

async function cmdTimeline(args) {
  const window = parseInt(args.find(a => a.startsWith('--window='))?.split('=')[1]) || 1
  const data = await api(`/api/swarm/activity?window=${window}`)

  if (!data.activities?.length) return console.log(`No activity in the last ${window}h.`)

  // Build parent lookup for tree display
  const byId = new Map()
  for (const a of data.activities) byId.set(a.sessionId, a)

  console.log(`${BOLD}Swarm activity — last ${window}h${RESET}\n`)
  console.log(`${BOLD}${pad('AGENT', 14)} ${pad('STATUS', 10)} ${pad('DURATION', 10)} ${pad('STARTED', 12)} LABEL${RESET}`)
  for (const a of data.activities) {
    const icon = STATUS_ICON[a.status] || '?'
    const dur = duration(a.end - a.start)
    const started = ago(new Date(a.start).toISOString())
    let suffix = ''
    if (a.parentSessionId) {
      const parent = byId.get(a.parentSessionId)
      suffix = parent ? ` ${DIM}↳ ${parent.agentId}${RESET}` : ` ${DIM}↳ sub${RESET}`
    }
    console.log(`${pad(a.agentId, 14)} ${icon} ${pad(a.status, 7)}  ${pad(dur, 10)} ${pad(started, 12)} ${a.label}${suffix}`)
  }
}

async function cmdWatch(args) {
  const window = parseInt(args.find(a => a.startsWith('--window='))?.split('=')[1]) || 1
  const interval = parseInt(args.find(a => a.startsWith('--interval='))?.split('=')[1]) || 5

  const clear = () => process.stdout.write('\x1b[2J\x1b[H')

  const tick = async () => {
    clear()
    const data = await api(`/api/swarm/activity?window=${window}`)
    const now = new Date().toLocaleTimeString()
    const activities = data.activities || []

    // Build parent lookup
    const byId = new Map()
    for (const a of activities) byId.set(a.sessionId, a)

    const active = activities.filter(a => a.status === 'active')
    console.log(`${BOLD}Reef Watch${RESET} — ${now} — ${active.length} active / ${activities.length} total (${window}h window)\n`)
    console.log(`${BOLD}${pad('AGENT', 14)} ${pad('STATUS', 10)} ${pad('DURATION', 10)} ${pad('STARTED', 12)} LABEL${RESET}`)
    for (const a of activities) {
      const icon = STATUS_ICON[a.status] || '?'
      const dur = duration(a.status === 'active' ? Date.now() - a.start : a.end - a.start)
      const started = ago(new Date(a.start).toISOString())
      let suffix = ''
      if (a.parentSessionId) {
        const parent = byId.get(a.parentSessionId)
        suffix = parent ? ` ${DIM}↳ ${parent.agentId}${RESET}` : ` ${DIM}↳ sub${RESET}`
      }
      console.log(`${pad(a.agentId, 14)} ${icon} ${pad(a.status, 7)}  ${pad(dur, 10)} ${pad(started, 12)} ${a.label}${suffix}`)
    }
    console.log(`\n${DIM}Refreshing every ${interval}s — Ctrl+C to exit${RESET}`)
  }

  await tick()
  setInterval(tick, interval * 1000)
}

async function cmdStatus() {
  const s = await api('/api/gateway/status')
  const icon = STATUS_ICON[s.status] || '?'
  console.log(`${BOLD}Gateway Status${RESET}`)
  console.log(`  Status:  ${icon} ${s.status}`)
  console.log(`  PID:     ${s.pid || 'N/A'}`)
  console.log(`  Port:    ${s.port || 'N/A'}`)
  if (s.version) console.log(`  Version: ${s.version}`)
  console.log(`  Uptime:  ${s.uptime || 'N/A'}`)
  console.log(`  Memory:  ${s.memoryUsage || 'N/A'}`)
}

async function cmdLogs(args) {
  const lines = parseInt(args.find(a => a.startsWith('--lines='))?.split('=')[1]) || 50
  const data = await api(`/api/gateway/logs?lines=${lines}`)
  process.stdout.write(data.logs || data)
}

async function cmdConfig() {
  const data = await api('/api/gateway/config')
  console.log(JSON.stringify(data, null, 2))
}

function usage() {
  console.log(`${BOLD}reef${RESET} — OpenClaw swarm observability CLI

${BOLD}Usage:${RESET}
  reef <command> [options]

${BOLD}Commands:${RESET}
  agents                List agents with status, sessions, and token usage
  sessions [options]    List sessions
  session <id> [agent]  Inspect a session trace (partial ID match supported)
  timeline [options]    Show swarm activity timeline
  watch [options]       Live-updating timeline (polls every 5s)
  status                Show gateway health
  logs [options]        Tail gateway logs
  config                View gateway config (redacted)

${BOLD}Options:${RESET}
  sessions:
    --agent=<id>        Filter by agent ID
    --limit=<n>         Max sessions to show (default: 20)

  session:
    reef session <sessionId>              Auto-detect agent
    reef session <agentId> <sessionId>    Specify agent explicitly

  timeline:
    --window=<hours>    Time window in hours (default: 1)

  watch:
    --window=<hours>    Time window in hours (default: 1)
    --interval=<secs>   Refresh interval in seconds (default: 5)

  logs:
    --lines=<n>         Number of log lines (default: 50)

${BOLD}Environment:${RESET}
  REEF_URL              API base URL (default: http://localhost:3179)`)
}

// --- Main ---

const [cmd, ...args] = process.argv.slice(2)

const commands = { agents: cmdAgents, sessions: cmdSessions, session: cmdSession, timeline: cmdTimeline, watch: cmdWatch, status: cmdStatus, logs: cmdLogs, config: cmdConfig }

if (!cmd || cmd === '--help' || cmd === '-h') {
  usage()
} else if (commands[cmd]) {
  commands[cmd](args).catch(err => {
    console.error(`\x1b[31mError:\x1b[0m ${err.message}`)
    process.exit(1)
  })
} else {
  console.error(`Unknown command: ${cmd}\nRun 'reef --help' for usage.`)
  process.exit(1)
}
