import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  createTestContext, cleanupTestContext, addAgent, request,
  sessionEntry, userMessage,
} from './test-helpers.js'

let app, tmpDir

beforeAll(async () => {
  ;({ app, tmpDir } = await createTestContext('reef-test-sessions-'))

  const activeId = 'aaaa1111-2222-3333-4444-555566667777'
  const archivedId = 'bbbb1111-2222-3333-4444-555566667777'
  const bothId = 'cccc1111-2222-3333-4444-555566667777'

  await addAgent(tmpDir, 'test-agent', {
    jsonlFiles: [
      {
        id: activeId,
        lines: [
          sessionEntry(activeId, '2026-02-20T10:00:00.000Z'),
          userMessage('Hello active session', '2026-02-20T10:00:01.000Z'),
        ],
      },
      {
        id: bothId,
        lines: [
          sessionEntry(bothId, '2026-02-20T11:00:00.000Z'),
          userMessage('Active version', '2026-02-20T11:00:01.000Z'),
        ],
      },
    ],
    archivedFiles: [
      {
        id: archivedId,
        suffix: '2026-02-20T12-00-00.000Z',
        lines: [
          sessionEntry(archivedId, '2026-02-20T09:00:00.000Z'),
          userMessage('Hello archived session', '2026-02-20T09:00:01.000Z'),
        ],
      },
      {
        id: bothId,
        suffix: '2026-02-20T12-00-00.000Z',
        lines: [
          sessionEntry(bothId, '2026-02-20T08:00:00.000Z'),
          userMessage('Archived version', '2026-02-20T08:00:01.000Z'),
        ],
      },
    ],
  })
})

afterAll(async () => {
  await cleanupTestContext(tmpDir)
})

describe('GET /api/sessions/:agentId/:sessionId', () => {
  it('serves active .jsonl file', async () => {
    const res = await request(app, '/api/sessions/test-agent/aaaa1111-2222-3333-4444-555566667777')
    expect(res.status).toBe(200)
    expect(res.body).toContain('Hello active session')
  })

  it('falls back to .jsonl.deleted.* for archived sessions', async () => {
    const res = await request(app, '/api/sessions/test-agent/bbbb1111-2222-3333-4444-555566667777')
    expect(res.status).toBe(200)
    expect(res.body).toContain('Hello archived session')
  })

  it('returns 404 when neither exists', async () => {
    const res = await request(app, '/api/sessions/test-agent/dddd1111-2222-3333-4444-555566667777')
    expect(res.status).toBe(404)
  })

  it('rejects invalid ID formats', async () => {
    const res = await request(app, '/api/sessions/test-agent/invalid..id..format')
    expect(res.status).toBe(400)
  })

  it('prefers .jsonl over .deleted when both exist', async () => {
    const res = await request(app, '/api/sessions/test-agent/cccc1111-2222-3333-4444-555566667777')
    expect(res.status).toBe(200)
    expect(res.body).toContain('Active version')
    expect(res.body).not.toContain('Archived version')
  })
})
