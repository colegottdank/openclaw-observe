import { Router } from 'express'
import fs from 'fs/promises'
import path from 'path'
import { ROOT_DIR, WORKSPACE_ROOT } from '../lib/paths.js'

const router = Router()

router.get('/api/files', async (req, res) => {
  try {
    const relativePath = req.query.path || 'workspace'
    const safePath = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '')
    const fullPath = path.join(WORKSPACE_ROOT, safePath)

    if (!fullPath.startsWith(ROOT_DIR)) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const stats = await fs.stat(fullPath)

    if (stats.isDirectory()) {
      const entries = await fs.readdir(fullPath, { withFileTypes: true })
      const list = await Promise.all(entries.map(async (f) => {
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
      const content = await fs.readFile(fullPath, 'utf-8')
      res.json({ type: 'file', content, path: relativePath })
    }
  } catch (err) {
    console.error('Error reading file:', err)
    res.status(500).json({ error: err.message })
  }
})

router.post('/api/files', async (req, res) => {
  try {
    const { path: relativePath, content } = req.body
    if (!relativePath) {
      return res.status(400).json({ error: 'Path is required' })
    }

    const safePath = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '')
    const fullPath = path.join(WORKSPACE_ROOT, safePath)

    if (!fullPath.startsWith(WORKSPACE_ROOT)) {
      return res.status(403).json({ error: 'Access denied' })
    }

    await fs.writeFile(fullPath, content, 'utf-8')
    console.log('Saved file:', relativePath)
    res.json({ success: true })
  } catch (err) {
    console.error('Error writing file:', err)
    res.status(500).json({ error: err.message })
  }
})

export default router
