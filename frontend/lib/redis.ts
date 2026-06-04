import { Redis } from '@upstash/redis'

let client: Redis | null = null

function getClient(): Redis {
  if (!client) {
    client = new Redis({
      url: process.env.UPSTASH_REDIS_URL!,
      token: process.env.UPSTASH_REDIS_TOKEN!,
    })
  }
  return client
}

// In-process fallback when Redis is unavailable
const localRl = new Map<string, { count: number; resetAt: number }>()

/**
 * Rate limit a user. Returns { allowed, remaining }.
 * Default: 15 requests per 60 seconds per user.
 */
export async function checkRateLimit(
  userId: string,
  windowSec = 60,
  maxReqs = 15,
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const redis = getClient()
    const key = `rl:chat:${userId}`
    const count = await redis.incr(key)
    if (count === 1) await redis.expire(key, windowSec)
    return { allowed: count <= maxReqs, remaining: Math.max(0, maxReqs - count) }
  } catch {
    // Redis unavailable — use in-process fallback (fail-closed, not fail-open)
    const now = Date.now()
    const windowMs = windowSec * 1000
    const entry = localRl.get(userId)
    if (!entry || now > entry.resetAt) {
      localRl.set(userId, { count: 1, resetAt: now + windowMs })
      return { allowed: true, remaining: maxReqs - 1 }
    }
    entry.count++
    return { allowed: entry.count <= maxReqs, remaining: Math.max(0, maxReqs - entry.count) }
  }
}

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    return await getClient().get<T>(key)
  } catch {
    return null
  }
}

export async function setCached<T>(key: string, value: T, ttlSec: number): Promise<void> {
  try {
    await getClient().setex(key, ttlSec, value as Parameters<Redis['setex']>[2])
  } catch {
    // cache errors are non-fatal
  }
}

export function makeKey(...parts: string[]): string {
  return parts.join(':')
}

export async function invalidateSessionListCache(userId: string): Promise<void> {
  try {
    await getClient().del(makeKey('sessions', 'list', userId))
  } catch {
    // cache errors are non-fatal
  }
}
