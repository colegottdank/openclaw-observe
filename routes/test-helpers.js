/**
 * Shared test helpers for route tests.
 *
 * This is an ESM module. REEF_DATA_DIR must be set before the dynamic import
 * of server.js because lib/paths.js reads it at module-load time.
 */

import fs from 'fs/promises'
import path from 'path'
import os from 'os'

// ---------------------------------------------------------------------------
// Test context (tmpDir + env + app)
// ---------------------------------------------------------------------------

/**
 * Creates a temporary directory, sets env vars, writes a minimal config,
 * and dynamically imports createApp. Returns a context object.
 *
 * @param {string} prefix - tmpdir prefix (e.g. 'reef-test-sessions-')
 * @returns {Promise<{ app: Express, tmpDir: string }>}
 */
export async function createTestContext(prefix) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), prefix))
  process.env.REEF_DATA_DIR = tmpDir
  process.env.REEF_CONFIG_PATH = path.join(tmpDir, 'clawdbot.json')

  // Minimal config so the agents route doesn't blow up
  await fs.writeFile(
    path.join(tmpDir, 'clawdbot.json'),
    JSON.stringify({ agents: { list: [] } }),
  )

  // Dynamic import after env is set so paths.js picks up the temp dir
  const { createApp } = await import('../server.js')
  const app = createApp()

  return { app, tmpDir }
}

/**
 * Removes the temporary directory created by createTestContext.
 */
export async function cleanupTestContext(tmpDir) {
  if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true })
}

// ---------------------------------------------------------------------------
// Agent fixture helper
// ---------------------------------------------------------------------------

/**
 * Creates an agent fixture directory under tmpDir/agents/<name>/sessions
 * with a sessions.json and optional JSONL / archived JSONL files.
 *
 * @param {string} tmpDir       - root temp directory
 * @param {string} name         - agent name
 * @param {object} options
 * @param {object} [options.sessions]       - sessions.json content (object)
 * @param {Array<{id: string, lines: string[]}>} [options.jsonlFiles]    - active JSONL files
 * @param {Array<{id: string, suffix: string, lines: string[]}>} [options.archivedFiles] - .deleted JSONL files
 */
export async function addAgent(tmpDir, name, { sessions = {}, jsonlFiles = [], archivedFiles = [] } = {}) {
  const sessionsDir = path.join(tmpDir, 'agents', name, 'sessions')
  await fs.mkdir(sessionsDir, { recursive: true })

  await fs.writeFile(
    path.join(sessionsDir, 'sessions.json'),
    JSON.stringify(sessions),
  )

  for (const { id, lines } of jsonlFiles) {
    await fs.writeFile(path.join(sessionsDir, `${id}.jsonl`), lines.join('\n'))
  }

  for (const { id, suffix, lines } of archivedFiles) {
    await fs.writeFile(path.join(sessionsDir, `${id}.jsonl.deleted.${suffix}`), lines.join('\n'))
  }

  return sessionsDir
}

// ---------------------------------------------------------------------------
// HTTP request helper
// ---------------------------------------------------------------------------

/**
 * Spins up the Express app on a random port, makes a GET request,
 * and tears it down. Returns { status, body, headers }.
 *
 * @param {Express} app
 * @param {string}  url       - path to GET (e.g. '/api/sessions/...')
 * @param {object}  [options]
 * @param {boolean} [options.json=false] - if true, parse body as JSON
 * @returns {Promise<{ status: number, body: string|object, headers: object }>}
 */
export async function request(app, url, { json = false } = {}) {
  const { default: http } = await import('http')
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port
      http.get(`http://127.0.0.1:${port}${url}`, (res) => {
        let body = ''
        res.on('data', d => body += d)
        res.on('end', () => {
          server.close()
          resolve({
            status: res.statusCode,
            body: json ? JSON.parse(body) : body,
            headers: res.headers,
          })
        })
      }).on('error', (err) => {
        server.close()
        reject(err)
      })
    })
  })
}

// ---------------------------------------------------------------------------
// JSONL entry builders
// ---------------------------------------------------------------------------

export function sessionEntry(id, timestamp) {
  return JSON.stringify({ type: 'session', version: 3, id, timestamp, cwd: '/tmp' })
}

export function userMessage(text, timestamp) {
  return JSON.stringify({
    type: 'message', id: Math.random().toString(36).slice(2, 10),
    timestamp,
    message: { role: 'user', content: [{ type: 'text', text }], timestamp: new Date(timestamp).getTime() },
  })
}

export function assistantMessage(timestamp) {
  return JSON.stringify({
    type: 'message', id: Math.random().toString(36).slice(2, 10),
    timestamp,
    message: { role: 'assistant', content: [{ type: 'text', text: 'Done.' }] },
  })
}

export function spawnToolCall(toolId, agentId, timestamp) {
  return JSON.stringify({
    type: 'message', id: Math.random().toString(36).slice(2, 10),
    timestamp,
    message: {
      role: 'assistant',
      content: [{
        type: 'toolCall', name: 'sessions_spawn', id: toolId,
        arguments: { agentId, task: `Task for ${agentId}` },
      }],
    },
  })
}

export function spawnToolResult(toolId, childSessionKey, timestamp) {
  return JSON.stringify({
    type: 'message', id: Math.random().toString(36).slice(2, 10),
    timestamp,
    toolCallId: toolId,
    message: {
      role: 'toolResult',
      content: [{ type: 'text', text: JSON.stringify({ status: 'accepted', childSessionKey, runId: 'run-123' }) }],
    },
  })
}
