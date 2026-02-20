import { Router } from 'express'
import fs from 'fs/promises'
import path from 'path'
import { AGENTS_ROOT, WORKSPACE_ROOT, CONFIG_PATH } from '../lib/paths.js'
import { createCache } from '../lib/cache.js'

const router = Router()
const agentsCache = createCache(10000)

router.get('/api/agents', async (req, res) => {
  try {
    const cached = agentsCache.get()
    if (cached) return res.json(cached)

    let configuredAgents = []
    try {
      const rawConfig = await fs.readFile(CONFIG_PATH, 'utf-8')
      const config = JSON.parse(rawConfig)
      configuredAgents = config.agents?.list || []
    } catch (e) {
      console.error('Failed to read configured agents:', e)
      return res.json([])
    }

    const agentList = []
    for (const agentConfig of configuredAgents) {
      const agentId = agentConfig.id
      const agentDir = agentConfig.workspace || path.join(AGENTS_ROOT, agentId)
      let status = 'idle'
      let lastActive = null
      let sessionCount = 0
      let errorCount = 0
      let currentTask = null
      let totalTokens = 0

      try {
        const sessionsFile = path.join(agentDir, 'sessions', 'sessions.json')
        await fs.access(sessionsFile)
        const sessionData = await fs.readFile(sessionsFile, 'utf-8')
        const sessions = JSON.parse(sessionData)
        const sessionList = Object.values(sessions)
        sessionCount = sessionList.length

        const activeSession = sessionList.find(s => s.active)
        if (activeSession) {
          status = 'busy'
          currentTask = activeSession.label || activeSession.displayName || null
        }

        errorCount = sessionList.filter(s => s.abortedLastRun).length
        totalTokens = sessionList.reduce((sum, s) => sum + (s.totalTokens || 0), 0)

        const times = sessionList.map(s => s.updatedAt || 0)
        if (times.length > 0) lastActive = new Date(Math.max(...times)).toISOString()
      } catch {}

      const absWorkspace = agentConfig.workspace || path.join(AGENTS_ROOT, agentId)
      const relWorkspace = path.relative(WORKSPACE_ROOT, absWorkspace)

      agentList.push({
        id: agentId,
        name: agentConfig.identity?.name || (agentId.charAt(0).toUpperCase() + agentId.slice(1)),
        emoji: agentConfig.identity?.emoji,
        role: agentConfig.identity?.theme,
        status,
        lastActive,
        model: agentConfig.model || 'default',
        enabled: true,
        workspace: relWorkspace || '',
        subagents: agentConfig.subagents?.allowAgents || [],
        sessionCount,
        errorCount,
        currentTask,
        totalTokens,
      })
    }

    agentsCache.set(agentList)
    res.json(agentList)
  } catch (err) {
    console.error('Error fetching agents:', err)
    res.status(500).json({ error: 'Failed to fetch agents' })
  }
})

export default router
