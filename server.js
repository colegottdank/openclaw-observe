import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { ROOT_DIR, AGENTS_ROOT } from './lib/paths.js'

import filesRouter from './routes/files.js'
import sessionsRouter from './routes/sessions.js'
import agentsRouter from './routes/agents.js'
import gatewayRouter from './routes/gateway.js'
import swarmRouter from './routes/swarm.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function createApp() {
  const app = express()
  app.use(express.json({ limit: '50mb' }))

  // Serve built frontend from dist/ (production)
  const distDir = path.join(__dirname, 'dist')
  app.use(express.static(distDir))

  // Mount API routes
  app.use(filesRouter)
  app.use(sessionsRouter)
  app.use(agentsRouter)
  app.use(gatewayRouter)
  app.use(swarmRouter)

  // SPA fallback — serve index.html for non-API routes
  app.get('/{*path}', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next()
    res.sendFile(path.join(distDir, 'index.html'), (err) => {
      if (err) next() // dist not built yet — let Vite dev server handle it
    })
  })

  return app
}

export function createServer(options = {}) {
  const port = options.port || parseInt(process.env.REEF_PORT) || 3179
  const app = createApp()
  let httpServer = null

  return {
    start() {
      return new Promise((resolve) => {
        httpServer = app.listen(port, '0.0.0.0', () => {
          console.log(`Reef server running on http://localhost:${port}`)
          console.log(`Data directory: ${ROOT_DIR}`)
          console.log(`Agents root: ${AGENTS_ROOT}`)
          resolve(httpServer)
        })
      })
    },
    stop() {
      return new Promise((resolve) => {
        if (httpServer) {
          httpServer.close(() => {
            console.log('Reef server stopped')
            resolve()
          })
        } else {
          resolve()
        }
      })
    },
  }
}

// Auto-start when run directly: node server.js
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = createServer()
  server.start()
}
