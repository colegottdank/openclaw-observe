import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import {
  createTestContext, cleanupTestContext, addAgent, request,
  sessionEntry, userMessage, assistantMessage,
  spawnToolCall, spawnToolResult,
} from './test-helpers.js'

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

beforeAll(async () => {
  ;({ app, tmpDir } = await createTestContext('reef-test-swarm-'))

  // Timestamps derived from spawn calls
  const parentSpawnTime = ts(-30 * MIN)
  const childCopyCreation = ts(-30 * MIN + 1000)
  const childDevCreation = ts(-25 * MIN + 800)

  // --- lead agent (parent) ---
  await addAgent(tmpDir, 'lead', {
    sessions: {
      'agent:lead:main': {
        sessionId: PARENT_ID, active: false,
        updatedAt: NOW - 10 * MIN, label: 'Build landing page',
      },
    },
    jsonlFiles: [{
      id: PARENT_ID,
      lines: [
        sessionEntry(PARENT_ID, ts(-45 * MIN)),
        userMessage('Build the landing page', ts(-44 * MIN)),
        spawnToolCall('tool-1', 'copy-agent', parentSpawnTime),
        spawnToolResult('tool-1', 'agent:copy-agent:subagent:xxx', ts(-30 * MIN + 500)),
        spawnToolCall('tool-2', 'dev-agent', ts(-25 * MIN)),
        spawnToolResult('tool-2', 'agent:dev-agent:subagent:yyy', ts(-25 * MIN + 500)),
        assistantMessage(ts(-10 * MIN)),
      ],
    }],
  })

  // --- copy-agent (archived child) ---
  await addAgent(tmpDir, 'copy-agent', {
    archivedFiles: [{
      id: CHILD_COPY_ID,
      suffix: '2026-02-20T23-00-00.000Z',
      lines: [
        sessionEntry(CHILD_COPY_ID, childCopyCreation),
        userMessage('[Fri 2026-02-20 14:04 PST] Write copy for the landing page', childCopyCreation),
        assistantMessage(ts(-20 * MIN)),
      ],
    }],
  })

  // --- dev-agent (archived child) ---
  await addAgent(tmpDir, 'dev-agent', {
    archivedFiles: [{
      id: CHILD_DEV_ID,
      suffix: '2026-02-20T23-05-00.000Z',
      lines: [
        sessionEntry(CHILD_DEV_ID, childDevCreation),
        userMessage('Build the HTML page with Tailwind', childDevCreation),
        assistantMessage(ts(-15 * MIN)),
      ],
    }],
  })

  // --- active-agent (active session from sessions.json) ---
  await addAgent(tmpDir, 'active-agent', {
    sessions: {
      'agent:active-agent:main': {
        sessionId: ACTIVE_ID, active: true,
        updatedAt: NOW - 5 * MIN, label: 'Running task',
      },
    },
    jsonlFiles: [{
      id: ACTIVE_ID,
      lines: [
        sessionEntry(ACTIVE_ID, ts(-20 * MIN)),
        userMessage('Do the thing', ts(-20 * MIN)),
      ],
    }],
  })

  // --- old-agent (session outside window) ---
  await addAgent(tmpDir, 'old-agent', {
    archivedFiles: [{
      id: OLD_ID,
      suffix: '2026-02-20T10-00-00.000Z',
      lines: [
        sessionEntry(OLD_ID, ts(-3 * HOUR)),
        userMessage('Ancient task', ts(-3 * HOUR)),
        assistantMessage(ts(-2.5 * HOUR)),
      ],
    }],
  })

  // --- dedup-agent (same session in sessions.json AND .deleted file) ---
  const dedupLines = [
    sessionEntry(DEDUP_ID, ts(-30 * MIN)),
    userMessage('Dedup task', ts(-30 * MIN)),
    assistantMessage(ts(-10 * MIN)),
  ]
  await addAgent(tmpDir, 'dedup-agent', {
    sessions: {
      'agent:dedup-agent:main': {
        sessionId: DEDUP_ID, active: false,
        updatedAt: NOW - 10 * MIN, label: 'Dedup test',
      },
    },
    jsonlFiles: [{ id: DEDUP_ID, lines: dedupLines }],
    archivedFiles: [{ id: DEDUP_ID, suffix: '2026-02-20T23-10-00.000Z', lines: dedupLines }],
  })

  // --- runs.json (empty — tests spawn scanning path) ---
  await fs.mkdir(path.join(tmpDir, 'subagents'), { recursive: true })
  await fs.writeFile(path.join(tmpDir, 'subagents', 'runs.json'), JSON.stringify({ version: 2, runs: {} }))
})

afterAll(async () => {
  await cleanupTestContext(tmpDir)
})

describe('GET /api/swarm/activity', () => {
  it('returns archived sessions from .deleted files', async () => {
    const res = await request(app, '/api/swarm/activity?window=1', { json: true })
    expect(res.status).toBe(200)
    const ids = res.body.activities.map(a => a.sessionId)
    expect(ids).toContain(CHILD_COPY_ID)
    expect(ids).toContain(CHILD_DEV_ID)
  })

  it('derives task labels from first user message', async () => {
    const res = await request(app, '/api/swarm/activity?window=1', { json: true })
    const copyActivity = res.body.activities.find(a => a.sessionId === CHILD_COPY_ID)
    // Should strip the "[Fri 2026-02-20 14:04 PST] " prefix
    expect(copyActivity.label).toBe('Write copy for the landing page')

    const devActivity = res.body.activities.find(a => a.sessionId === CHILD_DEV_ID)
    expect(devActivity.label).toBe('Build the HTML page with Tailwind')
  })

  it('shows active sessions from sessions.json', async () => {
    const res = await request(app, '/api/swarm/activity?window=1', { json: true })
    const active = res.body.activities.find(a => a.sessionId === ACTIVE_ID)
    expect(active).toBeDefined()
    expect(active.status).toBe('active')
  })

  it('deduplicates when session exists in both sessions.json and .deleted', async () => {
    const res = await request(app, '/api/swarm/activity?window=1', { json: true })
    const dedupEntries = res.body.activities.filter(a => a.sessionId === DEDUP_ID)
    expect(dedupEntries).toHaveLength(1)
  })

  it('resolves parent-child via spawn call timestamp matching', async () => {
    const res = await request(app, '/api/swarm/activity?window=1', { json: true })
    const copyActivity = res.body.activities.find(a => a.sessionId === CHILD_COPY_ID)
    const devActivity = res.body.activities.find(a => a.sessionId === CHILD_DEV_ID)
    expect(copyActivity.parentSessionId).toBe(PARENT_ID)
    expect(devActivity.parentSessionId).toBe(PARENT_ID)
  })

  it('excludes activities outside the time window', async () => {
    const res = await request(app, '/api/swarm/activity?window=1', { json: true })
    const ids = res.body.activities.map(a => a.sessionId)
    expect(ids).not.toContain(OLD_ID)
  })

  it('includes old activities when window is large enough', async () => {
    const res = await request(app, '/api/swarm/activity?window=6', { json: true })
    const ids = res.body.activities.map(a => a.sessionId)
    expect(ids).toContain(OLD_ID)
  })
})
