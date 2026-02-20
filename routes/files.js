import { Router } from 'express'
import fs from 'fs/promises'
import path from 'path'
import { AGENTS_ROOT } from '../lib/paths.js'

const router = Router()

// Read-only file browser scoped to the agents directory
router.get('/api/files', async (req, res) => {
  try {
    const relativePath = req.query.path || ''
    const safePath = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '')
    const fullPath = path.resolve(AGENTS_ROOT, safePath)

    // Strict containment check — must stay within AGENTS_ROOT
    if (!fullPath.startsWith(path.resolve(AGENTS_ROOT))) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const stats = await fs.stat(fullPath)

    if (stats.isDirectory()) {
      const entries = await fs.readdir(fullPath, { withFileTypes: true })
      // Cap directory listing to prevent unbounded reads
      const limited = entries.slice(0, 500)
      const list = await Promise.all(limited.map(async (f) => {
        let updatedAt
        try {
          const st = await fs.stat(path.join(fullPath, f.name))
          updatedAt = st.mtime.toISOString()
        } catch { updatedAt = null }
        return {
          name: f.name,
          isDirectory: f.isDirectory(),
          path: path.join(relativePath, f.name),
          updatedAt,
        }
      }))
      res.json({ type: 'directory', files: list })
    } else {
      // Cap file reads at 10MB
      if (stats.size > 10 * 1024 * 1024) {
        return res.status(413).json({ error: 'File too large' })
      }
      const content = await fs.readFile(fullPath, 'utf-8')
      res.json({ type: 'file', content, path: relativePath })
    }
  } catch (err) {
    if (err.code === 'ENOENT') return res.status(404).json({ error: 'Not found' })
    console.error('Error reading file:', err.message)
    res.status(500).json({ error: 'Failed to read file' })
  }
})

export default router
