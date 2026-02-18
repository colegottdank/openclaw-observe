import { Router } from 'express'
import fs from 'fs/promises'
import { createReadStream } from 'fs'
import { createInterface } from 'readline'
import path from 'path'
import { spawn } from 'child_process'
import { ROOT_DIR, AGENTS_ROOT } from '../lib/paths.js'

const router = Router()

/** Read the first line of a JSONL session file to extract parentSessionId */
async function readParentSessionId(filePath) {
  try {
    const stream = createReadStream(filePath)
    const rl = createInterface({ input: stream, crlfDelay: Infinity })
    for await (const line of rl) {
      try {
        const entry = JSON.parse(line)
        rl.close()
        stream.destroy()
        return entry.parentSessionId || null
      } catch {}
      break
    }
    rl.close()
    stream.destroy()
  } catch {}
  return null
}

router.get('/api/gateway/logs', async (req, res) => {
  try {
    const lines = parseInt(req.query.lines) || 100
    const logPath = path.join(ROOT_DIR, 'logs', 'gateway.log')

    // Check primary log path, then scan /tmp/openclaw/ for latest log
    let targetLog = logPath
    try {
      await fs.access(logPath)
    } catch {
      try {
        const tmpDir = '/tmp/openclaw'
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
    res.status(500).json({ error: err.message })
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
          const start = session.createdAt || session.updatedAt - 60000
          const end = session.updatedAt
          if (end >= windowStart || start >= windowStart) {
            let label = session.label || 'Unknown task'
            if (label === 'Unknown task' && key.includes(':')) {
              label = key.split(':').slice(2).join(':').replace(/^(discord|channel):?/, '')
            }
            let status = 'completed'
            if (session.active || (now - end) < 60000) status = 'active'
            else if (session.abortedLastRun) status = 'aborted'
            const activity = { agentId: agent, sessionId: session.sessionId, start, end, label, status, key, parentSessionId: null }
            activities.push(activity)

            // Queue parent lookup from JSONL file
            if (session.sessionId) {
              const jsonlPath = path.join(AGENTS_ROOT, agent, 'sessions', `${session.sessionId}.jsonl`)
              parentLookups.push(
                readParentSessionId(jsonlPath).then(pid => { activity.parentSessionId = pid })
              )
            }
          }
        })
      } catch {}
    }))

    // Resolve parent session IDs in parallel
    await Promise.all(parentLookups)

    activities.sort((a, b) => b.start - a.start)
    res.json({ activities, window: { start: windowStart, end: now, hours: windowHours } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
