// OpenClaw plugin entry point for Reef
// Registers Reef as a background service that starts/stops with the gateway.
//
// Plugin config (in clawdbot.json → plugins.entries.reef.config):
//   port     — HTTP port for the Reef dashboard (default: 3179)
//   dataDir  — Path to the OpenClaw data directory (default: auto-detected from stateDir)

import path from 'path'

const plugin = {
  id: 'reef',
  name: 'Reef',
  description: 'Swarm observability dashboard — monitor agent activity, inspect session traces, and visualize delegation trees.',

  register(api) {
    const cfg = api.pluginConfig || {}
    let reefServer = null

    api.registerService({
      id: 'reef',

      async start(ctx) {
        const port = cfg.port || parseInt(process.env.REEF_PORT) || 3179
        const host = cfg.host || process.env.REEF_HOST || '127.0.0.1'
        const dataDir = cfg.dataDir || ctx.stateDir

        // Configure paths via env vars before loading the server module.
        // server.js → lib/paths.js reads these at import time.
        process.env.REEF_DATA_DIR = dataDir
        process.env.REEF_CONFIG_PATH = path.join(ctx.stateDir, 'clawdbot.json')
        process.env.REEF_PORT = String(port)
        process.env.REEF_HOST = host

        // Dynamic import so paths.js picks up the env vars we just set
        const { createServer } = await import('./server.js')
        reefServer = createServer({ port, host })
        await reefServer.start()

        ctx.logger.info(`Reef dashboard running on http://${host}:${port}`)
      },

      async stop(ctx) {
        if (reefServer) {
          await reefServer.stop()
          reefServer = null
          ctx.logger.info('Reef dashboard stopped')
        }
      },
    })
  },
}

export default plugin
