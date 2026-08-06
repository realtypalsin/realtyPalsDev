/**
 * Health Checks — Database, Redis, LLM connectivity and response times
 */

import { prisma } from '@/lib/db'
import { Redis } from '@upstash/redis'

let redis: Redis | null = null

/**
 * Initialize Redis for health checks
 */
export function initRedisForHealth(redisUrl: string): void {
  try {
    const url = new URL(redisUrl)
    const token = process.env.UPSTASH_REDIS_REST_TOKEN || ''
    redis = new Redis({
      url: url.href,
      token,
    })
  } catch (err) {
    console.error('Failed to initialize Redis for health checks:', err)
  }
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  database: ComponentHealth
  redis: ComponentHealth
  llm: ComponentHealth
  responseTime: {
    totalMs: number
    databaseMs: number
    redisMs: number
    llmMs: number
  }
}

interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  latencyMs: number
  lastError?: string
}

/**
 * Check database health
 */
async function checkDatabase(): Promise<ComponentHealth> {
  const start = performance.now()
  try {
    const result = await prisma.$queryRaw`SELECT 1`
    const latencyMs = Math.round(performance.now() - start)

    if (latencyMs > 1000) {
      return { status: 'degraded', latencyMs }
    }
    return { status: 'healthy', latencyMs }
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start)
    return {
      status: 'unhealthy',
      latencyMs,
      lastError: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Check Redis health
 */
async function checkRedis(): Promise<ComponentHealth> {
  if (!redis) {
    return {
      status: 'unhealthy',
      latencyMs: 0,
      lastError: 'Redis not initialized',
    }
  }

  const start = performance.now()
  try {
    await redis.ping()
    const latencyMs = Math.round(performance.now() - start)

    if (latencyMs > 500) {
      return { status: 'degraded', latencyMs }
    }
    return { status: 'healthy', latencyMs }
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start)
    return {
      status: 'unhealthy',
      latencyMs,
      lastError: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Check LLM API health (Groq)
 */
async function checkLLM(): Promise<ComponentHealth> {
  const start = performance.now()
  try {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return {
        status: 'unhealthy',
        latencyMs: 0,
        lastError: 'GROQ_API_KEY not set',
      }
    }

    // Lightweight LLM health check: list models endpoint
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000), // 5s timeout
    })

    const latencyMs = Math.round(performance.now() - start)

    if (!response.ok) {
      return {
        status: 'unhealthy',
        latencyMs,
        lastError: `HTTP ${response.status}`,
      }
    }

    if (latencyMs > 2000) {
      return { status: 'degraded', latencyMs }
    }
    return { status: 'healthy', latencyMs }
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start)
    return {
      status: 'unhealthy',
      latencyMs,
      lastError: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Run all health checks
 */
export async function runHealthChecks(): Promise<HealthCheckResult> {
  const totalStart = performance.now()

  const [database, redis, llm] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkLLM(),
  ])

  const totalMs = Math.round(performance.now() - totalStart)

  // Overall status: healthy if all components healthy, degraded if any degraded, unhealthy if any unhealthy
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
  if (
    database.status === 'unhealthy' ||
    redis.status === 'unhealthy' ||
    llm.status === 'unhealthy'
  ) {
    status = 'unhealthy'
  } else if (
    database.status === 'degraded' ||
    redis.status === 'degraded' ||
    llm.status === 'degraded'
  ) {
    status = 'degraded'
  }

  return {
    status,
    timestamp: new Date().toISOString(),
    database,
    redis,
    llm,
    responseTime: {
      totalMs,
      databaseMs: database.latencyMs,
      redisMs: redis.latencyMs,
      llmMs: llm.latencyMs,
    },
  }
}

/**
 * Check if system is healthy enough to serve requests
 */
export async function isSystemHealthy(): Promise<boolean> {
  const health = await runHealthChecks()
  // System is healthy if database is healthy (critical)
  // Redis/LLM degradation is acceptable
  return health.database.status !== 'unhealthy'
}

/**
 * Cleanup
 */
export async function closeHealthChecks(): Promise<void> {
  // Upstash Redis doesn't require explicit cleanup
  redis = null
}
