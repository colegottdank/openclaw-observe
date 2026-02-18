import express from 'express'
import { ROOT_DIR, AGENTS_ROOT } from './lib/paths.js'

import filesRouter from './routes/files.js'
import sessionsRouter from './routes/sessions.js'
import agentsRouter from './routes/agents.js'
import gatewayRouter from './routes/gateway.js'
import swarmRouter from './routes/swarm.js'

const app = express()
app.use(express.json({ limit: '50mb' }))

console.log('Serving files from:', ROOT_DIR)
console.log('Agents root:', AGENTS_ROOT)

// Mount route modules
app.use(filesRouter)
app.use(sessionsRouter)
app.use(agentsRouter)
app.use(gatewayRouter)
app.use(swarmRouter)

const PORT = 3179
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API Server running on port ${PORT}`)
})
