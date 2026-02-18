import { Router } from 'express'
import fs from 'fs/promises'
import path from 'path'
import { exec } from 'child_process'
import os from 'os'
import { CONFIG_PATH } from '../lib/paths.js'
import { createCache } from '../lib/cache.js'

const router = Router()
const configCache = createCache(60000)

router.get('/api/gateway/config', async (req, res) => {
  const cached = configCache.get()
  if (cached) return res.json(cached)

  try {
    const rawConfig = await fs.readFile(CONFIG_PATH, 'utf-8')
    const config = JSON.parse(rawConfig)

    // Redact sensitive fields
    const redacted = JSON.parse(JSON.stringify(config))
    if (redacted.env) {
      for (const key in redacted.env) {
        if (key.includes('KEY') || key.includes('TOKEN') || key.includes('PASSWORD') || key.includes('SECRET')) {
          redacted.env[key] = '********'
        }
      }
    }
    if (redacted.gateway?.auth?.password) redacted.gateway.auth.password = '********'
    if (redacted.gateway?.auth?.token) redacted.gateway.auth.token = '********'

    configCache.set(redacted)
    res.json(redacted)
  } catch (e) {
    if (e.code === 'ENOENT') {
      return res.status(404).json({ error: 'Config file not found' })
    }
    console.error('Config read error:', e.message)
    res.status(500).json({ error: e.message })
  }
})

router.patch('/api/gateway/config', async (req, res) => {
  const patch = req.body

  // Invalidate caches immediately
  configCache.invalidate()

  const tmpFile = path.join(os.tmpdir(), `patch-${Date.now()}.json`)

  try {
    await fs.writeFile(tmpFile, JSON.stringify(patch))
    console.log('Applying config patch:', JSON.stringify(patch, null, 2))

    exec(`openclaw gateway config.patch --file "${tmpFile}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Patch error: ${stderr || error.message}`)
      } else {
        console.log(`Patch applied: ${stdout}`)
      }
    })

    res.json({ message: 'Config update queued' })
  } catch (error) {
    console.error('Config patch error:', error)
    res.status(500).json({ error: error.message })
  }
})

router.get('/api/gateway/config/raw', async (req, res) => {
  try {
    const content = await fs.readFile(CONFIG_PATH, 'utf-8')
    res.json({ content })
  } catch (e) {
    if (e.code === 'ENOENT') {
      return res.status(404).json({ error: 'Config file not found' })
    }
    res.status(500).json({ error: e.message })
  }
})

router.put('/api/gateway/config/raw', async (req, res) => {
  const { content } = req.body
  if (typeof content !== 'string') {
    return res.status(400).json({ error: 'content must be a string' })
  }

  try {
    JSON.parse(content)
  } catch (e) {
    return res.status(400).json({ error: `Invalid JSON: ${e.message}` })
  }

  try {
    await fs.writeFile(CONFIG_PATH, content, 'utf-8')
    configCache.invalidate()
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/api/gateway/status', (req, res) => {
  exec('openclaw gateway status --json', (error, stdout, stderr) => {
    if (error) {
      console.error('Status error:', stderr)
      return res.status(500).json({ error: stderr || error.message, status: 'offline' })
    }
    try {
      const rawStatus = JSON.parse(stdout)
      const pid = rawStatus.service?.runtime?.pid

      if (!pid) {
        return res.json({
          status: 'offline',
          pid: null,
          port: rawStatus.gateway?.port,
          version: 'unknown',
          uptime: '0s',
          memoryUsage: '0 MB',
        })
      }

      exec(`ps -p ${pid} -o rss,etime`, (psErr, psOut) => {
        let uptime = 'unknown'
        let memoryUsage = '0 MB'

        if (!psErr && psOut) {
          const lines = psOut.trim().split('\n')
          if (lines.length > 1) {
            const parts = lines[1].trim().split(/\s+/)
            if (parts.length >= 2) {
              const rss = parts[0]
              const etime = parts[1]
              memoryUsage = `${Math.round(parseInt(rss) / 1024)} MB`
              uptime = etime
            }
          }
        }

        res.json({
          status: rawStatus.service?.runtime?.status === 'running' ? 'online' : 'offline',
          pid,
          port: rawStatus.gateway?.port,
          version: rawStatus.service?.version || rawStatus.gateway?.version || undefined,
          uptime,
          memoryUsage,
        })
      })
    } catch (e) {
      res.status(500).json({ error: 'Failed to parse status JSON', raw: stdout })
    }
  })
})

router.post('/api/gateway/restart', async (req, res) => {
  try {
    console.log('Restarting gateway...')
    exec('openclaw gateway restart', (error, stdout, stderr) => {
      if (error) {
        console.error(`Restart error: ${error}`)
        return
      }
      console.log(`Restart stdout: ${stdout}`)
    })
    res.json({ success: true, message: 'Gateway restart initiated' })
  } catch (err) {
    console.error('Error restarting gateway:', err)
    res.status(500).json({ error: err.message })
  }
})

export { configCache }
export default router
