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

/** Read first line (metadata) and last line (real end time) of a JSONL session file */
async function readSessionMeta(filePath) {
  try {
    // Read first line for metadata (parentSessionId, createdAt)
    const stream = createReadStream(filePath)
    const rl = createInterface({ input: stream, crlfDelay: Infinity })
    let firstEntry = null
    for await (const line of rl) {
      try { firstEntry = JSON.parse(line) } catch {}
      rl.close()
      stream.destroy()
      break
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

    return {
      parentSessionId: firstEntry?.parentSessionId || null,
      createdAt: firstEntry?.timestamp ? new Date(firstEntry.timestamp).getTime() : null,
      lastActivityAt,
    }
  } catch {}
  return { parentSessionId: null, createdAt: null, lastActivityAt: null }
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

router.get('/api/swarm/activity', async (req, res) => {
  try {
    const windowHours = parseInt(req.query.window) || 1
    const now = Date.now()
    const windowStart = now - (windowHours * 60 * 60 * 1000)
    const activities = []
    const agents = await fs.readdir(AGENTS_ROOT)

    // Collect activities from all agents
    const parentLookups = []

    await Promise.all(agents.map(async (agent) => {
      if (agent.startsWith('.')) return
      const sessionsFile = path.join(AGENTS_ROOT, agent, 'sessions', 'sessions.json')
      try {
        const data = await fs.readFile(sessionsFile, 'utf-8')
        const sessions = JSON.parse(data)
        Object.entries(sessions).forEach(([key, session]) => {
          const end = session.updatedAt
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
            const activity = { agentId: agent, sessionId: session.sessionId, start: end - 60000, end, label, status, key, parentSessionId: null }
            activities.push(activity)

            // Read session metadata from JSONL (createdAt + parentSessionId)
            if (session.sessionId) {
              const jsonlPath = path.join(AGENTS_ROOT, agent, 'sessions', `${session.sessionId}.jsonl`)
              parentLookups.push(
                readSessionMeta(jsonlPath).then(meta => {
                  activity.parentSessionId = meta.parentSessionId
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
    }))

    // Resolve parent session IDs in parallel
    await Promise.all(parentLookups)

    // Deduplicate by sessionId (cron jobs create both a schedule entry and a run entry)
    const seen = new Map()
    for (const a of activities) {
      if (!a.sessionId) continue
      const existing = seen.get(a.sessionId)
      if (!existing || a.label !== 'Unknown task') {
        seen.set(a.sessionId, a)
      }
    }
    const deduped = Array.from(seen.values())

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
