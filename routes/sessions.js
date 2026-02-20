import { Router } from 'express'
import fs from 'fs/promises'
import { createReadStream } from 'fs'
import path from 'path'
import { createInterface } from 'readline'
import { AGENTS_ROOT } from '../lib/paths.js'
import { createCache } from '../lib/cache.js'

const router = Router()
const sessionCache = createCache(5000)

// --- Mock session logs ---
let mockSessionLogs = {}

router.post('/api/sessions/mock', async (req, res) => {
  try {
    const fixturePath = new URL('../fixtures/mock-sessions.json', import.meta.url).pathname
    mockSessionLogs = JSON.parse(await fs.readFile(fixturePath, 'utf-8'))
    console.log(`[mock] Loaded mock logs for ${Object.keys(mockSessionLogs).length} sessions`)
    res.json({ loaded: Object.keys(mockSessionLogs).length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/api/sessions/mock', (req, res) => {
  const count = Object.keys(mockSessionLogs).length
  mockSessionLogs = {}
  console.log(`[mock] Cleared mock session logs`)
  res.json({ cleared: count })
})


async function readFirstUserMessage(filePath) {
  try {
    const fileStream = createReadStream(filePath)
    const rl = createInterface({ input: fileStream, crlfDelay: Infinity })
    for await (const line of rl) {
      try {
        const entry = JSON.parse(line)
        if (entry.type === 'message' && entry.message?.role === 'user') {
          const content = entry.message.content
          const text = Array.isArray(content) ? content.map(b => b.text).join(' ') : content
          rl.close()
          fileStream.destroy()
          return text?.slice(0, 100) || null
        }
      } catch {}
    }
    rl.close()
    fileStream.destroy()
  } catch { return null }
  return null
}

router.get('/api/sessions', async (req, res) => {
  try {
    const cached = sessionCache.get()
    if (cached) {
      const { agentId } = req.query
      let result = [...cached]
      if (agentId) result = result.filter(s => s.agentId === agentId)
      result.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      return res.json(result)
    }

    const agents = await fs.readdir(AGENTS_ROOT)
    const allSessions = []

    await Promise.all(agents.map(async (agent) => {
      if (agent.startsWith('.')) return
      const sessionsDir = path.join(AGENTS_ROOT, agent, 'sessions')
      const sessionFile = path.join(sessionsDir, 'sessions.json')
      let foundSessions = false

      try {
        const stats = await fs.stat(sessionFile)
        if (stats.isFile()) {
          const data = await fs.readFile(sessionFile, 'utf-8')
          const sessions = JSON.parse(data)
          Object.entries(sessions).forEach(([key, s]) => {
            let context = 'unknown'
            let channelName = null
            if (s.deliveryContext?.channel === 'discord') {
              const chId = s.deliveryContext.to?.replace('channel:', '')
              channelName = s.deliveryContext.channelName || null
              context = channelName || `discord:#${chId?.slice(-4) || chId}`
            } else if (key.includes('discord')) {
              const parts = key.split(':')
              const chId = parts[parts.length - 1]
              context = `discord:#${chId?.slice(-4) || chId}`
            }
            allSessions.push({
              ...s, key, agentId: agent,
              status: s.abortedLastRun ? 'aborted' : (s.active ? 'active' : 'completed'),
              displayName: context, channelName,
            })
          })
          foundSessions = true
        }
      } catch {}

      if (!foundSessions || allSessions.filter(s => s.agentId === agent).length === 0) {
        try {
          const files = await fs.readdir(sessionsDir)
          const jsonlFiles = files.filter(f => f.endsWith('.jsonl'))
          const fileStats = await Promise.all(jsonlFiles.map(async (f) => {
            const fp = path.join(sessionsDir, f)
            const st = await fs.stat(fp)
            return { file: f, mtime: st.mtimeMs, birthtime: st.birthtimeMs, path: fp }
          }))
          fileStats.sort((a, b) => b.mtime - a.mtime)
          const recentFiles = fileStats.slice(0, 50)
          const enrichedSessions = await Promise.all(recentFiles.map(async (fsItem) => {
            const sessionId = fsItem.file.replace('.jsonl', '')
            const summary = await readFirstUserMessage(fsItem.path)
            return {
              sessionId, key: `agent:${agent}:${sessionId}`, agentId: agent,
              updatedAt: fsItem.mtime, status: 'unknown', createdAt: fsItem.birthtime,
              displayName: summary || 'No context', kind: 'file-scan', summary,
            }
          }))
          allSessions.push(...enrichedSessions)
        } catch {}
      }
    }))

    sessionCache.set(allSessions)

    const { agentId } = req.query
    let result = [...allSessions]
    if (agentId) result = result.filter(s => s.agentId === agentId)
    result.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    res.json(result)
  } catch (err) {
    console.error('Error fetching sessions:', err)
    res.status(500).json({ error: err.message })
  }
})

router.get('/api/sessions/:agentId/:sessionId', async (req, res) => {
  const { agentId, sessionId } = req.params
  if (!/^[a-zA-Z0-9-_]+$/.test(agentId) || !/^[a-zA-Z0-9-]+$/.test(sessionId)) {
    return res.status(400).json({ error: 'Invalid ID format' })
  }

  // Check mock data first
  if (mockSessionLogs[sessionId]) {
    const jsonl = mockSessionLogs[sessionId].map(e => JSON.stringify(e)).join('\n')
    res.set('Cache-Control', 'no-cache')
    return res.type('text/plain').send(jsonl)
  }

  const sessionPath = path.resolve(AGENTS_ROOT, agentId, 'sessions', `${sessionId}.jsonl`)
  if (!sessionPath.startsWith(path.resolve(AGENTS_ROOT))) {
    return res.status(403).json({ error: 'Access denied' })
  }
  try {
    const stat = await fs.stat(sessionPath)
    const lastModified = stat.mtime.toUTCString()

    const ifModifiedSince = req.headers['if-modified-since']
    if (ifModifiedSince && new Date(ifModifiedSince) >= stat.mtime) {
      return res.status(304).end()
    }

    const content = await fs.readFile(sessionPath, 'utf-8')
    res.set('Last-Modified', lastModified)
    res.set('Cache-Control', 'no-cache')
    res.type('text/plain').send(content)
  } catch (err) {
    if (err.code === 'ENOENT') return res.status(404).json({ error: 'Session log not found' })
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
