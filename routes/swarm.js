import { Router } from 'express'
import fs from 'fs/promises'
import { createReadStream } from 'fs'
import { createInterface } from 'readline'
import path from 'path'
import os from 'os'
import { spawn } from 'child_process'
import { ROOT_DIR, AGENTS_ROOT } from '../lib/paths.js'

const router = Router()

// --- Mock data for testing (dev only) ---
let mockActivities = []

if (process.env.NODE_ENV !== 'production') {
  router.post('/api/swarm/mock', async (req, res) => {
    try {
      const fixturePath = new URL('../fixtures/mock-swarm.json', import.meta.url).pathname
      const data = JSON.parse(await fs.readFile(fixturePath, 'utf-8'))
      const now = Date.now()
      mockActivities = data.activities.map(a => ({
        ...a,
        start: now + a.start,
        end: a.end === null ? now : now + a.end,
      }))
      console.log(`[mock] Loaded ${mockActivities.length} mock activities`)
      res.json({ loaded: mockActivities.length })
    } catch (err) {
      res.status(500).json({ error: 'Failed to load mock data' })
    }
  })

  router.delete('/api/swarm/mock', (req, res) => {
    const count = mockActivities.length
    mockActivities = []
    res.json({ cleared: count })
  })

  router.get('/api/swarm/mock', (req, res) => {
    res.json({ count: mockActivities.length, activities: mockActivities })
  })
}

/** Read first few lines (metadata) and last line (real end time) of a JSONL session file */
async function readSessionMeta(filePath) {
  try {
    // Read first few lines for metadata (parentSessionId, createdAt, first user message)
    const stream = createReadStream(filePath)
    const rl = createInterface({ input: stream, crlfDelay: Infinity })
    let firstEntry = null
    let firstUserMessage = null
    let lineCount = 0
    for await (const line of rl) {
      lineCount++
      try {
        const entry = JSON.parse(line)
        if (!firstEntry) firstEntry = entry
        if (!firstUserMessage && entry.type === 'message' && entry.message?.role === 'user') {
          const content = entry.message.content
          firstUserMessage = Array.isArray(content) ? content.map(b => b.text).join(' ') : content
        }
      } catch {}
      if (firstUserMessage || lineCount >= 8) {
        rl.close()
        stream.destroy()
        break
      }
    }

    // Read last line efficiently via tail for real end time
    const lastActivityAt = await new Promise((resolve) => {
      const tail = spawn('tail', ['-1', filePath])
      let output = ''
      tail.stdout.on('data', d => output += d.toString())
      tail.on('close', () => {
        try {
          const entry = JSON.parse(output.trim())
          resolve(entry.timestamp ? new Date(entry.timestamp).getTime() : null)
        } catch { resolve(null) }
      })
      tail.on('error', () => resolve(null))
    })

    // Derive a short label from the first user message
    let taskLabel = null
    if (firstUserMessage) {
      // Strip timestamp prefix like "[Fri 2026-02-20 15:09 PST] "
      let text = firstUserMessage.replace(/^\[.*?\]\s*/, '').trim()
      taskLabel = text.slice(0, 60) + (text.length > 60 ? '...' : '')
    }

    return {
      parentSessionId: firstEntry?.parentSessionId || null,
      createdAt: firstEntry?.timestamp ? new Date(firstEntry.timestamp).getTime() : null,
      lastActivityAt,
      taskLabel,
    }
  } catch {}
  return { parentSessionId: null, createdAt: null, lastActivityAt: null, taskLabel: null }
}

router.get('/api/gateway/logs', async (req, res) => {
  try {
    const lines = Math.min(Math.max(parseInt(req.query.lines) || 100, 1), 5000)
    const logPath = path.join(ROOT_DIR, 'logs', 'gateway.log')

    // Check primary log path, then scan platform-appropriate temp dir
    let targetLog = logPath
    try {
      await fs.access(logPath)
    } catch {
      try {
        const tmpDir = path.join(os.tmpdir(), 'openclaw')
        const files = await fs.readdir(tmpDir)
        const logFiles = files.filter(f => f.endsWith('.log')).sort().reverse()
        targetLog = logFiles.length > 0 ? path.join(tmpDir, logFiles[0]) : logPath
      } catch {}
    }

    const tail = spawn('tail', ['-n', lines.toString(), targetLog])
    let output = ''
    tail.stdout.on('data', d => output += d.toString())
    tail.on('close', () => {
      res.json({ logs: output })
    })
  } catch (err) {
    console.error('Error reading logs:', err.message)
    res.status(500).json({ error: 'Failed to read logs' })
  }
})

/** Read subagent runs registry for parent-child relationships */
async function readRunsRegistry() {
  const childToParent = new Map() // childSessionKey → requesterSessionKey
  try {
    const runsPath = path.join(ROOT_DIR, 'subagents', 'runs.json')
    const data = JSON.parse(await fs.readFile(runsPath, 'utf-8'))
    if (data.runs) {
      for (const run of Object.values(data.runs)) {
        if (run.childSessionKey && run.requesterSessionKey) {
          childToParent.set(run.childSessionKey, run.requesterSessionKey)
        }
      }
    }
  } catch {}
  return childToParent
}

/** Scan a session JSONL for sessions_spawn tool calls to find child spawns.
 *  Returns array of { agentId, spawnTimestamp } for each spawn call. */
async function readSpawnCalls(filePath) {
  const spawns = []
  try {
    const stream = createReadStream(filePath)
    const rl = createInterface({ input: stream, crlfDelay: Infinity })
    for await (const line of rl) {
      try {
        const entry = JSON.parse(line)
        const content = entry.message?.content
        if (!Array.isArray(content)) continue
        for (const block of content) {
          if (block.type === 'toolCall' && block.name === 'sessions_spawn') {
            const agentId = block.arguments?.agentId
            const ts = entry.timestamp ? new Date(entry.timestamp).getTime() : null
            if (agentId && ts) {
              spawns.push({ agentId, spawnTimestamp: ts })
            }
          }
        }
      } catch {}
    }
  } catch {}
  return spawns
}

router.get('/api/swarm/activity', async (req, res) => {
  try {
    const windowHours = parseInt(req.query.window) || 1
    const now = Date.now()
    const windowStart = now - (windowHours * 60 * 60 * 1000)
    const activities = []
    const agents = await fs.readdir(AGENTS_ROOT)

    // Read subagent runs registry for parent-child links
    const childToParentKey = await readRunsRegistry()

    // Collect activities from all agents
    const parentLookups = []
    // Track session key → sessionId for resolving parent references
    const keyToSessionId = new Map()

    await Promise.all(agents.map(async (agent) => {
      if (agent.startsWith('.')) return
      const sessionsDir = path.join(AGENTS_ROOT, agent, 'sessions')
      const sessionsFile = path.join(sessionsDir, 'sessions.json')
      const knownSessionIds = new Set()

      // Phase 1: Read active sessions from sessions.json
      try {
        const data = await fs.readFile(sessionsFile, 'utf-8')
        const sessions = JSON.parse(data)
        Object.entries(sessions).forEach(([key, session]) => {
          const end = session.updatedAt
          // Register key → sessionId mapping for all sessions (needed for parent resolution)
          if (session.sessionId) {
            keyToSessionId.set(key, session.sessionId)
            knownSessionIds.add(session.sessionId)
          }
          // Be generous here — real start comes from JSONL, post-filter handles overlap
          if (end >= windowStart || session.active) {
            let label = session.label || 'Unknown task'
            if (label === 'Unknown task' && key.includes(':')) {
              label = key.split(':').slice(2).join(':').replace(/^(discord|channel):?/, '')
            }
            // Truncate long channel IDs to last 4 digits
            label = label.replace(/\b(\d{8,})\b/g, (m) => `#${m.slice(-4)}`)
            let status = 'completed'
            if (session.active || (now - end) < 60000) status = 'active'
            else if (session.abortedLastRun) status = 'aborted'
            // start will be filled in from JSONL metadata; fallback to updatedAt - 60s
            const activity = { agentId: agent, sessionId: session.sessionId, start: end - 60000, end, label, status, key, parentSessionId: null, _spawnedBy: session.spawnedBy || null }
            activities.push(activity)

            // Read session metadata from JSONL (createdAt)
            if (session.sessionId) {
              const jsonlPath = path.join(sessionsDir, `${session.sessionId}.jsonl`)
              parentLookups.push(
                readSessionMeta(jsonlPath).then(meta => {
                  if (meta.parentSessionId) {
                    activity.parentSessionId = meta.parentSessionId
                  }
                  if (meta.createdAt) {
                    activity.start = meta.createdAt
                  }
                  // Use last JSONL timestamp as real end time (sessions.json updatedAt is unreliable for cron jobs)
                  if (meta.lastActivityAt && meta.lastActivityAt > activity.end) {
                    activity.end = meta.lastActivityAt
                  }
                  // Re-evaluate status with corrected end time
                  if (!session.active && activity.status !== 'aborted') {
                    activity.status = (now - activity.end) < 60000 ? 'active' : 'completed'
                  }
                })
              )
            }
          }
        })
      } catch {}

      // Phase 2: Discover archived sessions from .deleted JSONL files
      try {
        const files = await fs.readdir(sessionsDir)
        const archivedFiles = files.filter(f => f.includes('.jsonl.deleted.'))
        for (const file of archivedFiles) {
          // Extract session ID: "abc123.jsonl.deleted.2026-..." → "abc123"
          const sessionId = file.split('.jsonl.')[0]
          if (!sessionId || knownSessionIds.has(sessionId)) continue

          const filePath = path.join(sessionsDir, file)
          knownSessionIds.add(sessionId)

          // Derive a label from the session key or use a fallback
          const activity = { agentId: agent, sessionId, start: 0, end: 0, label: 'Archived session', status: 'completed', key: `agent:${agent}:${sessionId}`, parentSessionId: null, _archived: true }
          activities.push(activity)

          parentLookups.push(
            readSessionMeta(filePath).then(meta => {
              if (meta.parentSessionId) {
                activity.parentSessionId = meta.parentSessionId
              }
              if (meta.createdAt) {
                activity.start = meta.createdAt
              }
              if (meta.lastActivityAt) {
                activity.end = meta.lastActivityAt
              }
              if (meta.taskLabel) {
                activity.label = meta.taskLabel
              }
              // If we couldn't get times, skip this activity (will be filtered out)
              if (!activity.start && !activity.end) {
                activity._skip = true
              }
            })
          )
        }
      } catch {}
    }))

    // Resolve parent session IDs in parallel
    await Promise.all(parentLookups)

    // Resolve parent-child relationships from runs registry and spawnedBy
    for (const activity of activities) {
      if (activity.parentSessionId) continue // already resolved from JSONL

      // Try runs.json first: childSessionKey → requesterSessionKey → sessionId
      const parentKey = childToParentKey.get(activity.key) || activity._spawnedBy
      if (parentKey) {
        const parentSessionId = keyToSessionId.get(parentKey)
        if (parentSessionId) {
          activity.parentSessionId = parentSessionId
        }
      }
      delete activity._spawnedBy
    }

    // Phase 3: For activities still missing parentSessionId, scan parent JONLs
    // for sessions_spawn tool calls and match by agentId + timestamp proximity
    const unresolved = activities.filter(a => !a.parentSessionId && a.start)
    if (unresolved.length > 0) {
      // Scan all non-child activities for spawn calls (potential parents)
      const potentialParents = activities.filter(a => !a._archived && a.sessionId)
      const spawnScanPromises = potentialParents.map(async (parent) => {
        const sessionsDir = path.join(AGENTS_ROOT, parent.agentId, 'sessions')
        // Try active .jsonl first, then archived
        let jsonlPath = path.join(sessionsDir, `${parent.sessionId}.jsonl`)
        try { await fs.access(jsonlPath) } catch {
          try {
            const files = await fs.readdir(sessionsDir)
            const archived = files.find(f => f.startsWith(`${parent.sessionId}.jsonl.deleted.`))
            if (archived) jsonlPath = path.join(sessionsDir, archived)
            else return
          } catch { return }
        }
        const spawns = await readSpawnCalls(jsonlPath)
        for (const spawn of spawns) {
          // Find the unresolved child: match by agentId + timestamp within 5s
          for (const child of unresolved) {
            if (child.parentSessionId) continue
            if (child.agentId !== spawn.agentId) continue
            if (Math.abs(child.start - spawn.spawnTimestamp) < 5000) {
              child.parentSessionId = parent.sessionId
            }
          }
        }
      })
      await Promise.all(spawnScanPromises)
    }

    // Deduplicate by sessionId (cron jobs create both a schedule entry and a run entry)
    const seen = new Map()
    for (const a of activities) {
      if (a._skip) continue
      if (!a.sessionId) continue
      const existing = seen.get(a.sessionId)
      // Prefer non-archived entries; among same type prefer ones with real labels
      if (!existing || (!a._archived && existing._archived) || a.label !== 'Unknown task') {
        seen.set(a.sessionId, a)
      }
    }
    const deduped = Array.from(seen.values())

    // Clean up internal fields
    for (const a of deduped) {
      delete a._skip
      delete a._archived
    }

    // Filter: keep activities that overlap with the time window (now that we have real start times)
    const filtered = deduped.filter(a => a.end >= windowStart && a.start <= now)

    // Merge mock activities (if any)
    for (const mock of mockActivities) {
      if (mock.end >= windowStart && mock.start <= now) {
        filtered.push(mock)
      }
    }

    filtered.sort((a, b) => b.start - a.start)
    res.json({ activities: filtered, window: { start: windowStart, end: now, hours: windowHours } })
  } catch (err) {
    console.error('Error fetching swarm activity:', err)
    res.status(500).json({ error: 'Failed to fetch swarm activity' })
  }
})

export default router
