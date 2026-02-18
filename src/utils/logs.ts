import type { LogEntry } from '../types'

/**
 * Parse raw gateway log text into structured LogEntry objects.
 * Extracts timestamp, level, source tag (e.g. [discord], [ws]), and message.
 * Returns lines in reverse chronological order (newest first).
 */
export function parseLogLines(rawText: string): LogEntry[] {
  const lines = rawText.split('\n').filter((l: string) => l.trim())

  return lines.map((line: string, i: number) => {
    let level = 'info'
    if (line.match(/error|fail|exception/i)) level = 'error'
    else if (line.match(/warn/i)) level = 'warn'

    const tsMatch = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[\d.]*[^ ]*)/)
    const timestamp = tsMatch ? tsMatch[1] : ''
    let rest = tsMatch ? line.slice(tsMatch[0].length).trim() : line

    // Extract source tag like [gateway], [discord], [ws], [heartbeat]
    let source = 'gateway'
    const sourceMatch = rest.match(/^\[([^\]]+)\]\s*/)
    if (sourceMatch) {
      source = sourceMatch[1]
      rest = rest.slice(sourceMatch[0].length)
    }

    return {
      id: `log-${i}`,
      timestamp,
      level,
      source,
      message: rest,
      raw: line,
    }
  }).reverse()
}
