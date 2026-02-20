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

async function cmdTimeline(args) {
  const window = parseInt(args.find(a => a.startsWith('--window='))?.split('=')[1]) || 1
  const data = await api(`/api/swarm/activity?window=${window}`)

  if (!data.activities?.length) return console.log(`No activity in the last ${window}h.`)

  console.log(`${BOLD}Swarm activity — last ${window}h${RESET}\n`)
  console.log(`${BOLD}${pad('AGENT', 14)} ${pad('STATUS', 10)} ${pad('DURATION', 10)} ${pad('STARTED', 12)} LABEL${RESET}`)
  for (const a of data.activities) {
    const icon = STATUS_ICON[a.status] || '?'
    const dur = duration(a.end - a.start)
    const started = ago(new Date(a.start).toISOString())
    const parent = a.parentSessionId ? ` ${DIM}↳ sub${RESET}` : ''
    console.log(`${pad(a.agentId, 14)} ${icon} ${pad(a.status, 7)}  ${pad(dur, 10)} ${pad(started, 12)} ${a.label}${parent}`)
  }
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
  timeline [options]    Show swarm activity timeline
  status                Show gateway health
  logs [options]        Tail gateway logs
  config                View gateway config (redacted)

${BOLD}Options:${RESET}
  sessions:
    --agent=<id>        Filter by agent ID
    --limit=<n>         Max sessions to show (default: 20)

  timeline:
    --window=<hours>    Time window in hours (default: 1)

  logs:
    --lines=<n>         Number of log lines (default: 50)

${BOLD}Environment:${RESET}
  REEF_URL              API base URL (default: http://localhost:3179)`)
}

// --- Main ---

const [cmd, ...args] = process.argv.slice(2)

const commands = { agents: cmdAgents, sessions: cmdSessions, timeline: cmdTimeline, status: cmdStatus, logs: cmdLogs, config: cmdConfig }

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
