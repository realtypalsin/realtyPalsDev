/**
 * Project Data Gateway Cache — Reduce repeated queries
 */

import type { ProjectDataGatewayResponse } from './projectDataGateway'
import type { QueryIntent } from '../discovery/queryPlanner'

export interface CacheEntry {
  data: ProjectDataGatewayResponse
  timestamp: number
  hits: number
}

/**
 * In-memory cache for gateway responses
 * TTL: 1 hour for primary queries, 30 min for secondary
 */
export class GatewayCache {
  private cache = new Map<string, CacheEntry>()
  private readonly ttlMs = 60 * 60 * 1000 // 1 hour primary
  private readonly ttlSecondaryMs = 30 * 60 * 1000 // 30 min secondary
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(cleanupIntervalMs = 5 * 60 * 1000) {
    // Auto-cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), cleanupIntervalMs)
  }

  /**
   * Generate cache key from query parameters
   */
  private getCacheKey(projectId: string, intent: QueryIntent, requiredFields: string[]): string {
    // Sort fields for consistent key generation
    const fieldsSorted = [...requiredFields].sort().join(':')
    return `${projectId}:${intent}:${fieldsSorted}`
  }

  /**
   * Determine TTL based on intent type (some data more stable than others)
   */
  private getTTL(intent: QueryIntent): number {
    // More stable data (builder, project details): full TTL
    if (intent === 'builder' || intent === 'details') return this.ttlMs

    // Time-sensitive data (timeline, investment): shorter TTL
    if (intent === 'timeline' || intent === 'investment') return this.ttlSecondaryMs

    // Payment/location: medium TTL
    return this.ttlMs
  }

  /**
   * Get from cache if valid
   */
  get(projectId: string, intent: QueryIntent, requiredFields: string[]): ProjectDataGatewayResponse | null {
    const key = this.getCacheKey(projectId, intent, requiredFields)
    const entry = this.cache.get(key)

    if (!entry) return null

    const ageMs = Date.now() - entry.timestamp
    const ttl = this.getTTL(intent)

    // Expired
    if (ageMs > ttl) {
      this.cache.delete(key)
      return null
    }

    // Valid hit
    entry.hits++
    return entry.data
  }

  /**
   * Store in cache
   */
  set(
    projectId: string,
    intent: QueryIntent,
    requiredFields: string[],
    data: ProjectDataGatewayResponse
  ): void {
    const key = this.getCacheKey(projectId, intent, requiredFields)
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      hits: 0,
    })
  }

  /**
   * Manual invalidation (e.g., after data update)
   */
  invalidate(projectId: string, intent?: QueryIntent): number {
    let removed = 0

    for (const [key] of this.cache.entries()) {
      const [pid] = key.split(':')
      if (pid === projectId) {
        if (!intent || key.includes(`:${intent}:`)) {
          this.cache.delete(key)
          removed++
        }
      }
    }

    return removed
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Auto-cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    let removed = 0

    for (const [key, entry] of this.cache.entries()) {
      const ttlMs = this.ttlMs // Use primary TTL for cleanup
      if (now - entry.timestamp > ttlMs) {
        this.cache.delete(key)
        removed++
      }
    }

    if (removed > 0) {
      console.log(`[CACHE:CLEANUP] Removed ${removed} expired entries`)
    }
  }

  /**
   * Get cache stats
   */
  getStats(): {
    size: number
    entries: Array<{ key: string; age: number; hits: number; ttl: number }>
  } {
    const entries = Array.from(this.cache.entries())
      .map(([key, entry]) => {
        const [, intent] = key.split(':')
        const ttl = this.getTTL(intent as QueryIntent)
        return {
          key,
          age: Date.now() - entry.timestamp,
          hits: entry.hits,
          ttl,
        }
      })
      .sort((a, b) => b.hits - a.hits)

    return {
      size: this.cache.size,
      entries: entries.slice(0, 10), // Top 10
    }
  }

  /**
   * Destroy and cleanup
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.cache.clear()
  }
}

/**
 * Query pattern cache to avoid redundant planning
 */
export class QueryPlannerCache {
  private cache = new Map<string, any>()
  private readonly ttlMs = 30 * 60 * 1000 // 30 minutes

  /**
   * Hash user message to detect duplicate queries
   */
  private hashMessage(message: string): string {
    // Simple hash: normalize and take first 100 chars
    return message
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .substring(0, 100)
  }

  /**
   * Get cached plan if available
   */
  get(userMessage: string): any | null {
    const hash = this.hashMessage(userMessage)
    const entry = this.cache.get(hash)

    if (!entry) return null

    const ageMs = Date.now() - entry.timestamp
    if (ageMs > this.ttlMs) {
      this.cache.delete(hash)
      return null
    }

    entry.hits++
    return entry.plan
  }

  /**
   * Store plan in cache
   */
  set(userMessage: string, plan: any): void {
    const hash = this.hashMessage(userMessage)
    this.cache.set(hash, {
      plan,
      timestamp: Date.now(),
      hits: 0,
    })
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get stats
   */
  getStats(): {
    size: number
    topPatterns: Array<{ hash: string; hits: number; age: number }>
  } {
    const entries = Array.from(this.cache.entries())
      .map(([hash, entry]) => ({
        hash: hash.substring(0, 50),
        hits: entry.hits,
        age: Date.now() - entry.timestamp,
      }))
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 10)

    return {
      size: this.cache.size,
      topPatterns: entries,
    }
  }
}

/**
 * LLM response cache to avoid redundant summarization
 */
export class LLMResponseCache {
  private cache = new Map<string, string>()
  private readonly ttlMs = 2 * 60 * 60 * 1000 // 2 hours

  /**
   * Generate key from fact data (deterministic)
   */
  private getKey(facts: Record<string, any>, intent: string): string {
    const factKeys = Object.keys(facts).sort().join(':')
    return `${intent}:${factKeys}`
  }

  /**
   * Get cached summary
   */
  get(facts: Record<string, any>, intent: string): string | null {
    const key = this.getKey(facts, intent)
    const entry = this.cache.get(key)

    if (!entry) return null

    const ageMs = Date.now() - (entry as any).timestamp
    if (ageMs > this.ttlMs) {
      this.cache.delete(key)
      return null
    }

    return (entry as any).summary
  }

  /**
   * Store summary in cache
   */
  set(facts: Record<string, any>, intent: string, summary: string): void {
    const key = this.getKey(facts, intent)
    ;(summary as any).timestamp = Date.now()
    this.cache.set(key, summary)
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear()
  }
}

/**
 * Global singleton instances
 */
let gatewayCache: GatewayCache | null = null
let plannerCache: QueryPlannerCache | null = null
let llmCache: LLMResponseCache | null = null

/**
 * Initialize caches
 */
export function initializeCaches(): {
  gateway: GatewayCache
  planner: QueryPlannerCache
  llm: LLMResponseCache
} {
  gatewayCache = new GatewayCache()
  plannerCache = new QueryPlannerCache()
  llmCache = new LLMResponseCache()

  return {
    gateway: gatewayCache,
    planner: plannerCache,
    llm: llmCache,
  }
}

/**
 * Get cache instances
 */
export function getCaches(): {
  gateway: GatewayCache | null
  planner: QueryPlannerCache | null
  llm: LLMResponseCache | null
} {
  return {
    gateway: gatewayCache,
    planner: plannerCache,
    llm: llmCache,
  }
}

/**
 * Destroy all caches
 */
export function destroyCaches(): void {
  gatewayCache?.destroy()
  plannerCache?.clear()
  llmCache?.clear()
  gatewayCache = null
  plannerCache = null
  llmCache = null
}
