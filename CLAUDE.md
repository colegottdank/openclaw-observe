# Reef — OpenClaw Swarm Observability

## Project
- **Stack**: Express 5, React 19, Vite 7, TypeScript 5.9, Tailwind 4, wouter, ESM
- **API server**: port 3179 (`node server.js`)
- **Plugin**: OpenClaw plugin via `plugin.js` + `openclaw.plugin.json`
- **CLI**: `cli/reef.js` — globally linked as `reef`, zero deps (native fetch + ANSI formatting)

## Architecture
- `plugin.js` — OpenClaw plugin entry point (registerService lifecycle)
- `server.js` — Express API (importable module with createApp/createServer, or standalone)
- `routes/` — agents.js, sessions.js, swarm.js, gateway.js, files.js
- `lib/paths.js` — Configurable paths via env vars (REEF_DATA_DIR, REEF_CONFIG_PATH)
- `lib/cache.js` — simple TTL cache
- `src/` — React frontend (Vite)
- `cli/reef.js` — CLI tool (commands: agents, sessions, timeline, status, logs, config)

## Configuration
All paths are configurable via environment variables:
- `REEF_DATA_DIR` — OpenClaw data directory (default: ~/.openclaw)
- `REEF_CONFIG_PATH` — Config file path (default: ~/.openclaw/clawdbot.json)
- `REEF_PORT` — Server port (default: 3179)
- `REEF_HOST` — Bind address (default: 127.0.0.1)

## Known Issues (low priority)
- Emoji column alignment in CLI: wide emoji chars shift row alignment slightly
