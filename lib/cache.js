/**
 * Simple in-memory cache with TTL.
 * Usage:
 *   const cache = createCache(5000)  // 5s TTL
 *   cache.get()        // returns data or null
 *   cache.set(data)    // stores data with timestamp
 *   cache.invalidate() // clears cache
 */
export function createCache(ttl) {
  let data = null
  let timestamp = 0

  return {
    get() {
      if (data && (Date.now() - timestamp < ttl)) return data
      return null
    },
    set(value) {
      data = value
      timestamp = Date.now()
    },
    invalidate() {
      data = null
      timestamp = 0
    },
  }
}
