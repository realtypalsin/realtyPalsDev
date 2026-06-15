// backend/src/lib/redis.ts
import { Redis } from '@upstash/redis'

let _redis: Redis | null = null

function getRedis(): Redis | null {
  if (_redis) return _redis
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  }
  return _redis
}

export async function checkRateLimit(key: string, limit = 20, windowSecs = 60): Promise<{ allowed: boolean; remaining: number }> {
  const redis = getRedis()
  if (!redis) return { allowed: true, remaining: 999 }

  const redisKey = `rl:${key}`
  try {
    const count = await redis.incr(redisKey)
    if (count === 1) await redis.expire(redisKey, windowSecs)
    return { allowed: count <= limit, remaining: Math.max(0, limit - count) }
  } catch {
    return { allowed: true, remaining: 999 }
  }
}

export async function getCached<T>(key: string): Promise<T | null> {
  const redis = getRedis()
  if (!redis) return null
  try {
    return await redis.get<T>(key)
  } catch {
    return null
  }
}

export async function setCached<T>(key: string, value: T, ttlSecs = 3600): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  try {
    await redis.set(key, value, { ex: ttlSecs })
  } catch {}
}
