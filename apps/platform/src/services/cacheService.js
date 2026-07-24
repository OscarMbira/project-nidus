/**
 * Cache Service
 * Handles client-side caching for performance optimization
 */

// In-memory cache with TTL support
const cache = new Map()
const cacheTimestamps = new Map()

// Maximum cache size (entries)
const MAX_CACHE_SIZE = 1000

/**
 * Get value from cache
 */
export function cacheGet(key) {
  try {
    const cached = cache.get(key)
    const timestamp = cacheTimestamps.get(key)

    if (!cached || !timestamp) {
      return null
    }

    // Check if expired (TTL in seconds)
    const ttl = cached.ttl || Infinity
    const now = Date.now()
    const age = (now - timestamp) / 1000

    if (age > ttl) {
      // Expired, remove from cache
      cache.delete(key)
      cacheTimestamps.delete(key)
      return null
    }

    return cached.value
  } catch (error) {
    console.error('Cache get error:', error)
    return null
  }
}

/**
 * Set value in cache
 */
export function cacheSet(key, value, ttl = 300) {
  try {
    // Enforce max cache size (LRU eviction)
    if (cache.size >= MAX_CACHE_SIZE) {
      // Remove oldest entry
      const oldestKey = cacheTimestamps.keys().next().value
      if (oldestKey) {
        cache.delete(oldestKey)
        cacheTimestamps.delete(oldestKey)
      }
    }

    cache.set(key, { value, ttl })
    cacheTimestamps.set(key, Date.now())

    return true
  } catch (error) {
    console.error('Cache set error:', error)
    return false
  }
}

/**
 * Invalidate cache entry by key pattern
 */
export function cacheInvalidate(pattern) {
  try {
    const regex = new RegExp(pattern)

    let count = 0
    for (const key of cache.keys()) {
      if (regex.test(key)) {
        cache.delete(key)
        cacheTimestamps.delete(key)
        count++
      }
    }

    return count
  } catch (error) {
    console.error('Cache invalidate error:', error)
    return 0
  }
}

/**
 * Clear all cache
 */
export function cacheClear() {
  try {
    cache.clear()
    cacheTimestamps.clear()
    return true
  } catch (error) {
    console.error('Cache clear error:', error)
    return false
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  try {
    const now = Date.now()
    let validEntries = 0
    let expiredEntries = 0

    for (const [key, timestamp] of cacheTimestamps.entries()) {
      const cached = cache.get(key)
      const age = (now - timestamp) / 1000

      if (cached && age <= (cached.ttl || Infinity)) {
        validEntries++
      } else {
        expiredEntries++
      }
    }

    return {
      total_entries: cache.size,
      valid_entries: validEntries,
      expired_entries: expiredEntries,
      max_size: MAX_CACHE_SIZE,
      utilization_percent: (cache.size / MAX_CACHE_SIZE) * 100
    }
  } catch (error) {
    console.error('Cache stats error:', error)
    return null
  }
}

/**
 * Clean expired entries
 */
export function cacheCleanup() {
  try {
    const now = Date.now()
    let cleaned = 0

    for (const [key, timestamp] of cacheTimestamps.entries()) {
      const cached = cache.get(key)
      if (!cached) continue

      const age = (now - timestamp) / 1000
      const ttl = cached.ttl || Infinity

      if (age > ttl) {
        cache.delete(key)
        cacheTimestamps.delete(key)
        cleaned++
      }
    }

    return cleaned
  } catch (error) {
    console.error('Cache cleanup error:', error)
    return 0
  }
}

// Auto-cleanup every 5 minutes
setInterval(cacheCleanup, 5 * 60 * 1000)

