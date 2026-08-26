// backend/src/lib/ai/semanticCache.ts
// In-process FAQ & Real Estate Advisory Cache with 24h TTL and LRU-style eviction.
// Zero network overhead, zero external dependencies (no Redis required).

export interface CachedEntry {
  token: string
  chips?: Array<{
    id: string
    actionType: string
    label: string
    icon?: string
    analyticsId?: string
    priority?: number
    payload?: Record<string, unknown>
  }>
  intentState?: string
  responseMode?: string
  expiresAt: number
  hitCount: number
}

interface CacheStats {
  hits: number
  misses: number
  size: number
  maxSize: number
  hitRate: string
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours
const MAX_CACHE_ENTRIES = 5000

const cache = new Map<string, CachedEntry>()
const accessOrder = new Map<string, number>() // Track access time for LRU
let cacheHits = 0
let cacheMisses = 0
let accessCounter = 0 // Monotonic counter for access ordering

/**
 * Normalizes query string for semantic matching:
 * - Lowercase
 * - Strips punctuation, extra spaces, and filler words (e.g. "please", "can you", "tell me")
 */
export function normalizeQueryKey(query: string): string {
  if (!query) return ''
  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\b(please|can you|could you|tell me|explain to me|i want to know|what is|what are|how to|how do i)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Scope for a cache entry.
 *
 * `GLOBAL_SCOPE` is only correct for answers that contain no session-specific
 * facts — statutory rates, "how do I check RERA", builder league tables. Any
 * answer written around a particular project or sector MUST pass that project's
 * id (or the sector name) as the scope: the cache key is otherwise just the
 * normalized question text, so "show payment plans" asked while viewing one
 * project would be served verbatim to the next user asking it about a different
 * project.
 */
export const GLOBAL_SCOPE = 'global'

function buildCacheKey(query: string, scope: string): string {
  const normalized = normalizeQueryKey(query)
  if (!normalized || normalized.length < 3) return ''
  return `${scope}::${normalized}`
}

/**
 * Retrieves a cached advisory response if valid and unexpired.
 */
export function getCachedResponse(query: string, scope: string = GLOBAL_SCOPE): CachedEntry | null {
  const key = buildCacheKey(query, scope)
  if (!key) return null

  const entry = cache.get(key)
  if (!entry) {
    cacheMisses++
    return null
  }

  // Check TTL expiration
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    accessOrder.delete(key)
    cacheMisses++
    return null
  }

  entry.hitCount++
  cacheHits++
  accessOrder.set(key, ++accessCounter) // Update LRU timestamp
  return entry
}

/**
 * Stores a verified advisory response in the in-memory cache.
 */
export function setCachedResponse(
  query: string,
  data: {
    token: string
    chips?: CachedEntry['chips']
    intentState?: string
    responseMode?: string
  },
  ttlMs = CACHE_TTL_MS,
  scope: string = GLOBAL_SCOPE
): void {
  const key = buildCacheKey(query, scope)
  if (!key || !data.token) return

  // Evict least-recently-used entry if capacity reached
  if (cache.size >= MAX_CACHE_ENTRIES) {
    let lruKey: string | undefined
    let minAccessTime = Infinity
    for (const [k, accessTime] of accessOrder.entries()) {
      if (accessTime < minAccessTime) {
        minAccessTime = accessTime
        lruKey = k
      }
    }
    if (lruKey) {
      cache.delete(lruKey)
      accessOrder.delete(lruKey)
    }
  }

  cache.set(key, {
    token: data.token,
    chips: data.chips,
    intentState: data.intentState ?? 'SHORTLISTED',
    responseMode: data.responseMode ?? 'chat',
    expiresAt: Date.now() + ttlMs,
    hitCount: 0,
  })
  accessOrder.set(key, ++accessCounter) // Mark as recently accessed
}

/**
 * Returns cache telemetry for Admin Analytics
 */
export function getCacheStats(): CacheStats {
  const total = cacheHits + cacheMisses
  const hitRate = total > 0 ? `${((cacheHits / total) * 100).toFixed(1)}%` : '0.0%'
  return {
    hits: cacheHits,
    misses: cacheMisses,
    size: cache.size,
    maxSize: MAX_CACHE_ENTRIES,
    hitRate,
  }
}
