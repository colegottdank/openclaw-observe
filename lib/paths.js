import path from 'path'
import { fileURLToPath } from 'url'
import os from 'os'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// .openclaw directory (parent of openclaw-observe)
export const ROOT_DIR = path.resolve(__dirname, '../../')
export const WORKSPACE_ROOT = ROOT_DIR
export const AGENTS_ROOT = path.join(ROOT_DIR, 'agents')
export const CONFIG_PATH = path.join(os.homedir(), '.openclaw', 'clawdbot.json')

export const CHANNEL_MAP = {
  '1468421608707461325': '#atlas-ceo',
  '1469615895021093029': '#forge-backend',
  '1469615896505880657': '#pixel-frontend',
  '1469615897948979402': '#echo-growth',
  '1470184543565647894': '#system-engineering',
  '1468748716205932596': '#mission-control',
  '1468534271130992732': '#voice-logs',
}
