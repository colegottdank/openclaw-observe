import fs from 'fs/promises'
import path from 'path'

/**
 * Find the session file for a given sessionId within a sessions directory.
 * Checks for the primary `.jsonl` file first, then falls back to any
 * archived `.jsonl.deleted.*` variant.
 *
 * @param {string} sessionsDir - Absolute path to the agent's sessions directory
 * @param {string} sessionId - The session UUID to look up
 * @returns {Promise<string|null>} Absolute path to the session file, or null if not found
 */
export async function findSessionFile(sessionsDir, sessionId) {
  const primaryPath = path.join(sessionsDir, `${sessionId}.jsonl`)
  try {
    await fs.stat(primaryPath)
    return primaryPath
  } catch {
    // Primary file not found — scan for archived version
    try {
      const files = await fs.readdir(sessionsDir)
      const archived = files.find(f => f.startsWith(`${sessionId}.jsonl.deleted.`))
      if (archived) {
        return path.join(sessionsDir, archived)
      }
    } catch {}
  }
  return null
}
