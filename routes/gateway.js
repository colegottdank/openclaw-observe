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
    res.status(500).json({ error: 'Failed to read config' })
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
    res.status(500).json({ error: 'Failed to apply config patch' })
  }
})

router.get('/api/gateway/status', (req, res) => {
  exec('openclaw gateway status --json', (error, stdout, stderr) => {
    if (error) {
      console.error('Status error:', stderr)
      return res.json({ error: 'Failed to get gateway status', status: 'offline' })
    }
    try {
      const rawStatus = JSON.parse(stdout)
      const rawPid = rawStatus.service?.runtime?.pid
      const pid = typeof rawPid === 'number' ? rawPid : parseInt(rawPid)

      if (!Number.isInteger(pid) || pid <= 0) {
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
      console.error('Failed to parse gateway status:', e.message)
      res.status(500).json({ error: 'Failed to parse gateway status' })
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
    res.status(500).json({ error: 'Failed to restart gateway' })
  }
})

export { configCache }
export default router
