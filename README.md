# Reef

Swarm observability for [OpenClaw](https://github.com/colegottdank/openclaw) agent systems. Monitor agent activity, inspect session traces, and visualize delegation trees across your swarm in real time.

![Reef](public/logo_v2.png)

## Features

- **Timeline** — Real-time swimlane chart showing all agent sessions, heartbeats, cron jobs, and sub-agent delegations. Hover to highlight delegation chains. Click to inspect session traces in a sidebar.
- **Agents** — Agent fleet overview grouped by swarm. Status, model, session count, token usage, and current task at a glance.
- **Sessions** — Browse and search all sessions across the swarm. Filter by agent, status, or text. Click any session to view its full trace.
- **Logs** — Live-tailing gateway system logs with level and source filtering.
- **Session Trace Viewer** — Shared component used across all views. Renders markdown in assistant responses, smart summaries for known tools (Read, Edit, Bash, etc.), collapsible thinking blocks, and distinct styling for delegation calls.
- **CLI** — Terminal-based access to all the same data via the `reef` command.

## Stack

- **Frontend**: React 19, TypeScript 5.9, Vite 7, Tailwind 4, wouter
- **Backend**: Express 5 (ESM), reads directly from OpenClaw agent data on disk
- **CLI**: Zero dependencies — native `fetch` + ANSI formatting

## Install as OpenClaw Plugin

Reef runs as an OpenClaw plugin — it starts and stops automatically with the gateway.

```bash
# Clone into the global extensions directory
git clone <repo-url> ~/.openclaw/extensions/reef
cd ~/.openclaw/extensions/reef
npm install
npm run build
```

Then enable it in your `~/.openclaw/clawdbot.json`:

```json
{
  "plugins": {
    "entries": {
      "reef": {
        "enabled": true,
        "config": {
          "port": 3179
        }
      }
    }
  }
}
```

Restart the gateway and Reef will be available at `http://localhost:3179`.

### Plugin Config

| Option | Default | Description |
|--------|---------|-------------|
| `port` | `3179` | HTTP port for the dashboard |
| `host` | `127.0.0.1` | Bind address (`0.0.0.0` for remote access) |
| `dataDir` | `~/.openclaw` | Path to the OpenClaw data directory |

## Standalone Setup

You can also run Reef without the OpenClaw plugin system.

```bash
npm install
npm run build

# Start the server (serves both API and built frontend)
node server.js
```

The server reads agent data from `~/.openclaw/agents/` by default. Configure via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `REEF_DATA_DIR` | `~/.openclaw` | OpenClaw data directory |
| `REEF_CONFIG_PATH` | `~/.openclaw/clawdbot.json` | OpenClaw config file path |
| `REEF_PORT` | `3179` | Server port |
| `REEF_HOST` | `127.0.0.1` | Bind address (`0.0.0.0` for remote access) |

### Development

```bash
# Start the Vite dev server (port 5173) with hot reload
npm run dev

# In another terminal, start the API server
node server.js
```

## CLI

The CLI talks to the same API server and gives you terminal access to all data.

```bash
# Link globally
npm link

# Or run directly
node cli/reef.js
```

### Commands

```
reef agents                  List agents with status, sessions, and token usage
reef sessions                List sessions across all agents
reef sessions --agent=main   Filter sessions by agent
reef sessions --limit=50     Show more sessions
reef timeline                Show swarm activity in the last hour
reef timeline --window=6     Show last 6 hours
reef status                  Gateway health check
reef logs                    Tail gateway logs
reef logs --lines=100        More log lines
reef config                  View gateway config (redacted)
```

### Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `REEF_URL` | `http://localhost:3179` | API server base URL |

## Architecture

```
plugin.js              OpenClaw plugin entry point (registerService)
openclaw.plugin.json   Plugin manifest and config schema
server.js              Express API server (importable + standalone)
routes/
  agents.js            Agent list, status, config from gateway
  sessions.js          Session list + JSONL log retrieval
  swarm.js             Swarm activity timeline + mock data
  gateway.js           Gateway health, logs, config
  files.js             File serving
lib/
  paths.js             Configurable paths (env vars or plugin config)
  cache.js             Simple TTL cache
src/                   React frontend
  components/
    TimelinePage.tsx    Timeline (landing page)
    TimelineChart.tsx   Swimlane chart with lanes, groups, connections
    SessionsPage.tsx    Session browser with sidebar
    AgentsList.tsx      Agent grid grouped by swarm
    AgentDetail.tsx     Agent session list with sidebar
    SessionTraceViewer.tsx  Shared trace viewer (markdown, tool summaries)
    RunOverview.tsx     Delegation tree visualization
    LogsPage.tsx        Live log viewer
  hooks/               Data fetching with polling
  utils/               Agent colors, time formatting
cli/
  reef.js              CLI tool
```

## License

[MIT](LICENSE)
