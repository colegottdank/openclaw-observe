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

## Setup

```bash
# Install dependencies
npm install

# Start the API server (port 3179)
node server.js

# Start the dev server (port 5173)
npm run dev

# Or build for production
npm run build
```

The API server reads agent data from the OpenClaw agents directory (default: `~/.openclaw/agents/`). Configure paths in `lib/paths.js`.

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
reef config                  View gateway config
reef config --raw            Unredacted config
```

### Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `REEF_URL` | `http://localhost:3179` | API server base URL |

## Architecture

```
server.js              Express API server (port 3179)
routes/
  agents.js            Agent list, status, config from gateway
  sessions.js          Session list + JSONL log retrieval
  swarm.js             Swarm activity timeline + mock data
  gateway.js           Gateway health, logs, config
  files.js             File serving
lib/
  paths.js             ROOT_DIR, AGENTS_ROOT, CONFIG_PATH
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

Private — OpenClaw project.
