# Reef — OpenClaw Swarm Observability

## Project
- **Location**: `/Users/spud/.openclaw/openclaw-observe/`
- **API server**: port 3179 (`node server.js`)
- **Stack**: Express 5, React 19, Vite 7, TypeScript 5.9, Tailwind 4, wouter, ESM
- **CLI**: `cli/reef.js` — globally linked as `reef`, zero deps (native fetch + ANSI formatting)

## Architecture
- `server.js` — Express API on port 3179
- `routes/` — agents.js, sessions.js, swarm.js, gateway.js, files.js
- `lib/paths.js` — ROOT_DIR, AGENTS_ROOT, CONFIG_PATH, CHANNEL_MAP
- `lib/cache.js` — simple TTL cache
- `src/` — React frontend (Vite)
- `cli/reef.js` — CLI tool (commands: agents, sessions, timeline, status, logs, config)

## Pending Work

### Kill Overview page, make Timeline the landing page
The Overview page (`src/components/Overview.tsx`) is redundant:
- Its "Agent Fleet" panel is identical to the Agents page (same `AgentCard`, same `groupAgentsBySwarm`)
- Its 4 KPI stat cards don't add value beyond what Timeline already shows
- The split layout has an empty right 1/3 panel

**Plan**: Remove Overview entirely. Change the `/` route in `App.tsx` to render `TimelinePage` instead. Remove Overview from `NAV_ITEMS`. Delete `src/components/Overview.tsx`.

Files to touch:
- `src/App.tsx` — change `/` route from `<Overview />` to `<TimelinePage />`, remove Overview from NAV_ITEMS and imports
- `src/components/Overview.tsx` — delete

### CLI minor issues (low priority)
- Emoji column alignment: `🎛️` on Control agent shifts row slightly (emoji display width != char count)
- Sessions context column shows raw Discord channel IDs when CHANNEL_MAP doesn't cover them (API-side gap in `lib/paths.js`)
