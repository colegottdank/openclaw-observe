import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

let app, tmpDir

beforeAll(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'reef-test-sessions-'))
  process.env.REEF_DATA_DIR = tmpDir
  process.env.REEF_CONFIG_PATH = path.join(tmpDir, 'clawdbot.json')

  // Create minimal config so agents route doesn't blow up
  await fs.writeFile(path.join(tmpDir, 'clawdbot.json'), JSON.stringify({ agents: { list: [] } }))

  // Create agent sessions directory
  const sessionsDir = path.join(tmpDir, 'agents', 'test-agent', 'sessions')
  await fs.mkdir(sessionsDir, { recursive: true })

  // Active session JSONL
  const activeId = 'aaaa1111-2222-3333-4444-555566667777'
  const activeJsonl = [
    JSON.stringify({ type: 'session', version: 3, id: activeId, timestamp: '2026-02-20T10:00:00.000Z', cwd: '/tmp' }),
    JSON.stringify({ type: 'message', message: { role: 'user', content: [{ type: 'text', text: 'Hello active session' }] }, timestamp: '2026-02-20T10:00:01.000Z' }),
  ].join('\n')
  await fs.writeFile(path.join(sessionsDir, `${activeId}.jsonl`), activeJsonl)

  // Archived session JSONL (only .deleted file exists)
  const archivedId = 'bbbb1111-2222-3333-4444-555566667777'
  const archivedJsonl = [
    JSON.stringify({ type: 'session', version: 3, id: archivedId, timestamp: '2026-02-20T09:00:00.000Z', cwd: '/tmp' }),
    JSON.stringify({ type: 'message', message: { role: 'user', content: [{ type: 'text', text: 'Hello archived session' }] }, timestamp: '2026-02-20T09:00:01.000Z' }),
  ].join('\n')
  await fs.writeFile(path.join(sessionsDir, `${archivedId}.jsonl.deleted.2026-02-20T12-00-00.000Z`), archivedJsonl)

  // Session with both active and archived (active should win)
  const bothId = 'cccc1111-2222-3333-4444-555566667777'
  const activeContent = [
    JSON.stringify({ type: 'session', version: 3, id: bothId, timestamp: '2026-02-20T11:00:00.000Z', cwd: '/tmp' }),
    JSON.stringify({ type: 'message', message: { role: 'user', content: [{ type: 'text', text: 'Active version' }] }, timestamp: '2026-02-20T11:00:01.000Z' }),
  ].join('\n')
  const archivedContent = [
    JSON.stringify({ type: 'session', version: 3, id: bothId, timestamp: '2026-02-20T08:00:00.000Z', cwd: '/tmp' }),
    JSON.stringify({ type: 'message', message: { role: 'user', content: [{ type: 'text', text: 'Archived version' }] }, timestamp: '2026-02-20T08:00:01.000Z' }),
  ].join('\n')
  await fs.writeFile(path.join(sessionsDir, `${bothId}.jsonl`), activeContent)
  await fs.writeFile(path.join(sessionsDir, `${bothId}.jsonl.deleted.2026-02-20T12-00-00.000Z`), archivedContent)

  // Empty sessions.json
  await fs.writeFile(path.join(sessionsDir, 'sessions.json'), '{}')

  // Dynamic import after env is set so paths.js picks up the temp dir
  const { createApp } = await import('../server.js')
  app = createApp()
})

afterAll(async () => {
  if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true })
})

/** Helper to make requests against the Express app */
async function request(url) {
  const { default: http } = await import('http')
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port
      http.get(`http://127.0.0.1:${port}${url}`, (res) => {
        let body = ''
        res.on('data', d => body += d)
        res.on('end', () => {
          server.close()
          resolve({ status: res.statusCode, body, headers: res.headers })
        })
      }).on('error', (err) => {
        server.close()
        reject(err)
      })
    })
  })
}

describe('GET /api/sessions/:agentId/:sessionId', () => {
  it('serves active .jsonl file', async () => {
    const res = await request('/api/sessions/test-agent/aaaa1111-2222-3333-4444-555566667777')
    expect(res.status).toBe(200)
    expect(res.body).toContain('Hello active session')
  })

  it('falls back to .jsonl.deleted.* for archived sessions', async () => {
    const res = await request('/api/sessions/test-agent/bbbb1111-2222-3333-4444-555566667777')
    expect(res.status).toBe(200)
    expect(res.body).toContain('Hello archived session')
  })

  it('returns 404 when neither exists', async () => {
    const res = await request('/api/sessions/test-agent/dddd1111-2222-3333-4444-555566667777')
    expect(res.status).toBe(404)
  })

  it('rejects invalid ID formats', async () => {
    // The regex requires [a-zA-Z0-9-_] for agentId and [a-zA-Z0-9-] for sessionId
    const res = await request('/api/sessions/test-agent/invalid..id..format')
    expect(res.status).toBe(400)
  })

  it('prefers .jsonl over .deleted when both exist', async () => {
    const res = await request('/api/sessions/test-agent/cccc1111-2222-3333-4444-555566667777')
    expect(res.status).toBe(200)
    expect(res.body).toContain('Active version')
    expect(res.body).not.toContain('Archived version')
  })
})
