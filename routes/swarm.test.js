import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

let app, tmpDir

// Timestamps: "now" is fixed so window calculations are predictable
const NOW = Date.now()
const HOUR = 60 * 60 * 1000
const MIN = 60 * 1000

// Session IDs
const PARENT_ID = 'aaaa0000-1111-2222-3333-444455556666'
const CHILD_COPY_ID = 'bbbb0000-1111-2222-3333-444455556666'
const CHILD_DEV_ID = 'cccc0000-1111-2222-3333-444455556666'
const ACTIVE_ID = 'dddd0000-1111-2222-3333-444455556666'
const OLD_ID = 'eeee0000-1111-2222-3333-444455556666'
const DEDUP_ID = 'ffff0000-1111-2222-3333-444455556666'

function ts(offset) {
  return new Date(NOW + offset).toISOString()
}

function sessionEntry(id, timestamp) {
  return JSON.stringify({ type: 'session', version: 3, id, timestamp, cwd: '/tmp' })
}

function userMessage(text, timestamp) {
  return JSON.stringify({
    type: 'message', id: Math.random().toString(36).slice(2, 10),
    timestamp,
    message: { role: 'user', content: [{ type: 'text', text }], timestamp: new Date(timestamp).getTime() }
  })
}

function assistantMessage(timestamp) {
  return JSON.stringify({
    type: 'message', id: Math.random().toString(36).slice(2, 10),
    timestamp,
    message: { role: 'assistant', content: [{ type: 'text', text: 'Done.' }] }
  })
}

function spawnToolCall(toolId, agentId, timestamp) {
  return JSON.stringify({
    type: 'message', id: Math.random().toString(36).slice(2, 10),
    timestamp,
    message: {
      role: 'assistant',
      content: [{
        type: 'toolCall', name: 'sessions_spawn', id: toolId,
        arguments: { agentId, task: `Task for ${agentId}` }
      }]
    }
  })
}

function spawnToolResult(toolId, childSessionKey, timestamp) {
  return JSON.stringify({
    type: 'message', id: Math.random().toString(36).slice(2, 10),
    timestamp,
    toolCallId: toolId,
    message: {
      role: 'toolResult',
      content: [{ type: 'text', text: JSON.stringify({ status: 'accepted', childSessionKey, runId: 'run-123' }) }]
    }
  })
}

beforeAll(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'reef-test-swarm-'))
  process.env.REEF_DATA_DIR = tmpDir
  process.env.REEF_CONFIG_PATH = path.join(tmpDir, 'clawdbot.json')

  await fs.writeFile(path.join(tmpDir, 'clawdbot.json'), JSON.stringify({ agents: { list: [] } }))

  // --- lead agent (parent) ---
  const leadDir = path.join(tmpDir, 'agents', 'lead', 'sessions')
  await fs.mkdir(leadDir, { recursive: true })
  await fs.writeFile(path.join(leadDir, 'sessions.json'), JSON.stringify({
    'agent:lead:main': {
      sessionId: PARENT_ID, active: false,
      updatedAt: NOW - 10 * MIN, label: 'Build landing page',
    }
  }))

  // Parent JSONL with sessions_spawn calls
  const parentSpawnTime = ts(-30 * MIN)
  const childCopyCreation = ts(-30 * MIN + 1000) // 1s after spawn
  const childDevCreation = ts(-25 * MIN + 800)   // 0.8s after spawn
  const parentJsonl = [
    sessionEntry(PARENT_ID, ts(-45 * MIN)),
    userMessage('Build the landing page', ts(-44 * MIN)),
    spawnToolCall('tool-1', 'copy-agent', parentSpawnTime),
    spawnToolResult('tool-1', 'agent:copy-agent:subagent:xxx', ts(-30 * MIN + 500)),
    spawnToolCall('tool-2', 'dev-agent', ts(-25 * MIN)),
    spawnToolResult('tool-2', 'agent:dev-agent:subagent:yyy', ts(-25 * MIN + 500)),
    assistantMessage(ts(-10 * MIN)),
  ].join('\n')
  await fs.writeFile(path.join(leadDir, `${PARENT_ID}.jsonl`), parentJsonl)

  // --- copy-agent (archived child) ---
  const copyDir = path.join(tmpDir, 'agents', 'copy-agent', 'sessions')
  await fs.mkdir(copyDir, { recursive: true })
  await fs.writeFile(path.join(copyDir, 'sessions.json'), '{}')
  const copyJsonl = [
    sessionEntry(CHILD_COPY_ID, childCopyCreation),
    userMessage('[Fri 2026-02-20 14:04 PST] Write copy for the landing page', childCopyCreation),
    assistantMessage(ts(-20 * MIN)),
  ].join('\n')
  await fs.writeFile(path.join(copyDir, `${CHILD_COPY_ID}.jsonl.deleted.2026-02-20T23-00-00.000Z`), copyJsonl)

  // --- dev-agent (archived child) ---
  const devDir = path.join(tmpDir, 'agents', 'dev-agent', 'sessions')
  await fs.mkdir(devDir, { recursive: true })
  await fs.writeFile(path.join(devDir, 'sessions.json'), '{}')
  const devJsonl = [
    sessionEntry(CHILD_DEV_ID, childDevCreation),
    userMessage('Build the HTML page with Tailwind', childDevCreation),
    assistantMessage(ts(-15 * MIN)),
  ].join('\n')
  await fs.writeFile(path.join(devDir, `${CHILD_DEV_ID}.jsonl.deleted.2026-02-20T23-05-00.000Z`), devJsonl)

  // --- active-agent (active session from sessions.json) ---
  const activeDir = path.join(tmpDir, 'agents', 'active-agent', 'sessions')
  await fs.mkdir(activeDir, { recursive: true })
  await fs.writeFile(path.join(activeDir, 'sessions.json'), JSON.stringify({
    'agent:active-agent:main': {
      sessionId: ACTIVE_ID, active: true,
      updatedAt: NOW - 5 * MIN, label: 'Running task',
    }
  }))
  const activeJsonl = [
    sessionEntry(ACTIVE_ID, ts(-20 * MIN)),
    userMessage('Do the thing', ts(-20 * MIN)),
  ].join('\n')
  await fs.writeFile(path.join(activeDir, `${ACTIVE_ID}.jsonl`), activeJsonl)

  // --- old-agent (session outside window) ---
  const oldDir = path.join(tmpDir, 'agents', 'old-agent', 'sessions')
  await fs.mkdir(oldDir, { recursive: true })
  await fs.writeFile(path.join(oldDir, 'sessions.json'), '{}')
  const oldJsonl = [
    sessionEntry(OLD_ID, ts(-3 * HOUR)),
    userMessage('Ancient task', ts(-3 * HOUR)),
    assistantMessage(ts(-2.5 * HOUR)),
  ].join('\n')
  await fs.writeFile(path.join(oldDir, `${OLD_ID}.jsonl.deleted.2026-02-20T10-00-00.000Z`), oldJsonl)

  // --- dedup-agent (same session in sessions.json AND .deleted file) ---
  const dedupDir = path.join(tmpDir, 'agents', 'dedup-agent', 'sessions')
  await fs.mkdir(dedupDir, { recursive: true })
  await fs.writeFile(path.join(dedupDir, 'sessions.json'), JSON.stringify({
    'agent:dedup-agent:main': {
      sessionId: DEDUP_ID, active: false,
      updatedAt: NOW - 10 * MIN, label: 'Dedup test',
    }
  }))
  const dedupJsonl = [
    sessionEntry(DEDUP_ID, ts(-30 * MIN)),
    userMessage('Dedup task', ts(-30 * MIN)),
    assistantMessage(ts(-10 * MIN)),
  ].join('\n')
  await fs.writeFile(path.join(dedupDir, `${DEDUP_ID}.jsonl`), dedupJsonl)
  await fs.writeFile(path.join(dedupDir, `${DEDUP_ID}.jsonl.deleted.2026-02-20T23-10-00.000Z`), dedupJsonl)

  // --- runs.json (empty — tests spawn scanning path) ---
  await fs.mkdir(path.join(tmpDir, 'subagents'), { recursive: true })
  await fs.writeFile(path.join(tmpDir, 'subagents', 'runs.json'), JSON.stringify({ version: 2, runs: {} }))

  // Dynamic import after env is set
  const { createApp } = await import('../server.js')
  app = createApp()
})

afterAll(async () => {
  if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true })
})

async function request(url) {
  const { default: http } = await import('http')
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port
      http.get(`http://127.0.0.1:${port}${url}`, (res) => {
        let body = ''
        res.on('data', d => body += d)
        res.on('end', () => {
          server.close()
          resolve({ status: res.statusCode, body: JSON.parse(body) })
        })
      }).on('error', (err) => {
        server.close()
        reject(err)
      })
    })
  })
}

describe('GET /api/swarm/activity', () => {
  it('returns archived sessions from .deleted files', async () => {
    const res = await request('/api/swarm/activity?window=1')
    expect(res.status).toBe(200)
    const ids = res.body.activities.map(a => a.sessionId)
    expect(ids).toContain(CHILD_COPY_ID)
    expect(ids).toContain(CHILD_DEV_ID)
  })

  it('derives task labels from first user message', async () => {
    const res = await request('/api/swarm/activity?window=1')
    const copyActivity = res.body.activities.find(a => a.sessionId === CHILD_COPY_ID)
    // Should strip the "[Fri 2026-02-20 14:04 PST] " prefix
    expect(copyActivity.label).toBe('Write copy for the landing page')

    const devActivity = res.body.activities.find(a => a.sessionId === CHILD_DEV_ID)
    expect(devActivity.label).toBe('Build the HTML page with Tailwind')
  })

  it('shows active sessions from sessions.json', async () => {
    const res = await request('/api/swarm/activity?window=1')
    const active = res.body.activities.find(a => a.sessionId === ACTIVE_ID)
    expect(active).toBeDefined()
    expect(active.status).toBe('active')
  })

  it('deduplicates when session exists in both sessions.json and .deleted', async () => {
    const res = await request('/api/swarm/activity?window=1')
    const dedupEntries = res.body.activities.filter(a => a.sessionId === DEDUP_ID)
    expect(dedupEntries).toHaveLength(1)
  })

  it('resolves parent-child via spawn call timestamp matching', async () => {
    const res = await request('/api/swarm/activity?window=1')
    const copyActivity = res.body.activities.find(a => a.sessionId === CHILD_COPY_ID)
    const devActivity = res.body.activities.find(a => a.sessionId === CHILD_DEV_ID)
    expect(copyActivity.parentSessionId).toBe(PARENT_ID)
    expect(devActivity.parentSessionId).toBe(PARENT_ID)
  })

  it('excludes activities outside the time window', async () => {
    const res = await request('/api/swarm/activity?window=1')
    const ids = res.body.activities.map(a => a.sessionId)
    expect(ids).not.toContain(OLD_ID)
  })

  it('includes old activities when window is large enough', async () => {
    const res = await request('/api/swarm/activity?window=6')
    const ids = res.body.activities.map(a => a.sessionId)
    expect(ids).toContain(OLD_ID)
  })
})
