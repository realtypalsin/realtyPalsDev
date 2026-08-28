// backend/src/lib/ai/semanticCache.ts
//
// Two-tier answer cache: an in-process LRU in front of a shared Redis store.
//
// L1 is the map below — nanoseconds, but it dies with the process and is private
// to one instance. L2 is Upstash, already configured for rate limiting. Without
// L2 every deploy started cold and every instance kept its own private copy, so
// the cache only ever helped a user who repeated themselves inside one process.
//
// Why this is worth having at all: 62% of measured Noida demand is bare head
// terms — "2 bhk in noida", "property rates in sector 75" — drawn from a long-
// tailed but heavily repeated keyword distribution. Those are the same question
// from every buyer who asks them, and at ~$0.004 a turn they are the cheapest
// thing in the product to stop paying for twice.
//
// The danger is serving one buyer an answer written for another. Two things
// prevent it:
//
//   - `scope`, which was already here: an answer about one project is keyed to
//     that project and cannot surface for another. See semanticCacheScope.test.
//   - the intent fingerprint added below. An answer shaped by a stated budget,
//     sector or BHK is keyed to that shape. Two buyers in the same situation
//     share it — which is correct, they would get the same answer — and a buyer
//     in a different situation misses and gets their own.
//
// Every Redis path is wrapped and returns null on failure. A cache problem must
// never cost a buyer their answer, and it must never delay one either: reads
// carry a short timeout, writes are fire-and-forget.

import { createHash } from 'node:crypto'
import { getRedis } from '../cache'

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

/**
 * Intent fields that change what a correct answer says.
 *
 * Anything not listed is either bookkeeping (queryKind, radiusKm, loop counts)
 * or too fine-grained to be worth splitting the cache on. Getting this wrong in
 * the cautious direction only costs a cache miss; the other direction serves
 * one buyer an answer written around another's budget.
 */
const ANSWER_SHAPING_FIELDS = [
  'sector',
  'bhk',
  'budgetMin',
  'budgetMax',
  'possession',
  'purpose',
  'builderName',
  'projectNames',
  'lifestyleKeywords',
] as const

/**
 * Short, stable digest of the intent an answer was written under.
 *
 * An empty intent — a first turn, a buyer who has stated nothing — digests to
 * `anon`, and that is the bucket the head terms land in. It is also the bucket
 * with by far the highest hit rate, which is the whole point: those are the
 * questions where one answer genuinely serves everyone.
 */
export function intentFingerprint(intent?: Record<string, unknown> | null): string {
  if (!intent) return 'anon'
  const shaping: Record<string, unknown> = {}
  for (const f of ANSWER_SHAPING_FIELDS) {
    const v = intent[f]
    if (v === undefined || v === null) continue
    if (Array.isArray(v) && v.length === 0) continue
    // Sort arrays so ["2","3"] and ["3","2"] are one bucket, not two.
    shaping[f] = Array.isArray(v) ? [...v].map(String).sort() : v
  }
  const keys = Object.keys(shaping)
  if (keys.length === 0) return 'anon'
  const canonical = JSON.stringify(shaping, keys.sort())
  return createHash('sha256').update(canonical).digest('hex').slice(0, 12)
}

function buildCacheKey(query: string, scope: string, fingerprint = 'anon'): string {
  const normalized = normalizeQueryKey(query)
  if (!normalized || normalized.length < 3) return ''
  return `${scope}::${fingerprint}::${normalized}`
}

/**
 * L1 only. Synchronous, so it can be used where an await is impossible and by
 * the scope tests, which are about keying rather than about Redis.
 */
export function getCachedResponseLocal(
  query: string,
  scope: string = GLOBAL_SCOPE,
  fingerprint = 'anon',
): CachedEntry | null {
  const key = buildCacheKey(query, scope, fingerprint)
  if (!key) return null
  return readLocal(key)
}

/**
 * L1, then Redis.
 *
 * A Redis hit is promoted into L1, so a popular head term costs one network
 * round trip per instance per TTL and nothing after that.
 */
export async function getCachedResponse(
  query: string,
  scope: string = GLOBAL_SCOPE,
  fingerprint = 'anon',
): Promise<CachedEntry | null> {
  const key = buildCacheKey(query, scope, fingerprint)
  if (!key) return null

  const local = readLocal(key, false)
  if (local) return local

  const remote = await readRemote(key)
  if (!remote) {
    cacheMisses++
    return null
  }

  // Promote. The remote copy already carries its own absolute expiry, so this
  // does not extend the entry's life, it just stops paying for it again.
  cache.set(key, remote)
  accessOrder.set(key, ++accessCounter)
  cacheHits++
  return remote
}

/**
 * `countMiss` is false when the caller is about to consult Redis: an L1 miss
 * that Redis then serves is a hit, and counting both made the reported hit rate
 * describe the tiers rather than the cache.
 */
function readLocal(key: string, countMiss = true): CachedEntry | null {
  const entry = cache.get(key)
  if (!entry) {
    if (countMiss) cacheMisses++
    return null
  }

  // Check TTL expiration
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    accessOrder.delete(key)
    if (countMiss) cacheMisses++
    return null
  }

  entry.hitCount++
  cacheHits++
  accessOrder.set(key, ++accessCounter) // Update LRU timestamp
  return entry
}

// ── L2: Upstash ──────────────────────────────────────────────────────────────

/** Namespace, so a key change is a cache flush rather than a wrong answer. */
const REDIS_PREFIX = 'ac:v2:'

/**
 * A read that takes longer than this is not worth waiting for — the LLM call it
 * would have saved is only a few seconds, and a slow cache that delays every
 * turn is worse than no cache.
 */
const REDIS_READ_TIMEOUT_MS = Number(process.env.ANSWER_CACHE_READ_TIMEOUT_MS ?? 250)

/** Resolves to null rather than rejecting, and never waits past the deadline. */
async function readRemote(key: string): Promise<CachedEntry | null> {
  const redis = getRedis()
  if (!redis) return null
  try {
    const raced = await Promise.race([
      redis.get<CachedEntry>(REDIS_PREFIX + key),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), REDIS_READ_TIMEOUT_MS)),
    ])
    if (!raced || typeof raced !== 'object') return null
    const entry = raced as CachedEntry
    // Redis TTL and our own expiry can disagree after a clock skew or a manual
    // key edit. The stored expiry wins: it is what the answer was written under.
    if (!entry.token || typeof entry.expiresAt !== 'number' || Date.now() > entry.expiresAt) {
      return null
    }
    return entry
  } catch (err) {
    console.warn('[answerCache] redis read failed:', err instanceof Error ? err.message : err)
    return null
  }
}

/** Fire-and-forget. A write that fails costs one future cache miss, nothing more. */
function writeRemote(key: string, entry: CachedEntry, ttlMs: number): void {
  const redis = getRedis()
  if (!redis) return
  void redis
    .set(REDIS_PREFIX + key, entry, { ex: Math.max(1, Math.floor(ttlMs / 1000)) })
    .catch((err: unknown) => {
      console.warn('[answerCache] redis write failed:', err instanceof Error ? err.message : err)
    })
}

/**
 * Stores a verified advisory response in L1, and in Redis when configured.
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
  scope: string = GLOBAL_SCOPE,
  fingerprint = 'anon',
): void {
  const key = buildCacheKey(query, scope, fingerprint)
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

  const entry: CachedEntry = {
    token: data.token,
    chips: data.chips,
    intentState: data.intentState ?? 'SHORTLISTED',
    responseMode: data.responseMode ?? 'chat',
    expiresAt: Date.now() + ttlMs,
    hitCount: 0,
  }
  cache.set(key, entry)
  accessOrder.set(key, ++accessCounter) // Mark as recently accessed
  // Shared copy, so the next instance and the next deploy do not pay for this
  // answer again. Never awaited — see writeRemote.
  writeRemote(key, entry, ttlMs)
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
