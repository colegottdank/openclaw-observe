import path from 'path'
import os from 'os'

// All paths are configurable via environment variables.
// When running as an OpenClaw plugin, these are set by plugin.js before server.js loads.
// When running standalone (node server.js), they default to ~/.openclaw.

const OPENCLAW_DIR = process.env.REEF_DATA_DIR || path.join(os.homedir(), '.openclaw')

export const ROOT_DIR = OPENCLAW_DIR
export const WORKSPACE_ROOT = OPENCLAW_DIR
export const AGENTS_ROOT = path.join(OPENCLAW_DIR, 'agents')
export const CONFIG_PATH = process.env.REEF_CONFIG_PATH || path.join(OPENCLAW_DIR, 'clawdbot.json')
