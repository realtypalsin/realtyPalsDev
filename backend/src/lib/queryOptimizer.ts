/**
 * Query Optimizer — Optimize database queries based on intent
 */

import type { QueryIntent } from './discovery/queryPlanner'

/**
 * Optimize Prisma select() based on intent
 * Only fetch fields needed for the specific query type
 */
export function getOptimizedProjectSelect(intent: QueryIntent): Record<string, any> {
  const baseSelect = {
    id: true,
    name: true,
    slug: true,
    builder_id: true,
    status: true,
  }

  const intentSelects: Record<QueryIntent, Record<string, any>> = {
    payment: {
      ...baseSelect,
      price_min_cr: true,
      price_max_cr: true,
      gst_rate_pct: true,
      stamp_duty_pct: true,
      cost_sheet: {
        select: {
          base_price_per_sqft: true,
          parking_cost_lakh: true,
          ifms_lakh: true,
        },
        take: 1,
      },
    },

    investment: {
      ...baseSelect,
      price_min_cr: true,
      price_cagr_pct: true,
      construction_progress_pct: true,
      price_history: {
        select: {
          price_cr: true,
          recorded_date: true,
        },
        orderBy: { recorded_date: 'desc' as const },
        take: 5,
      },
      builder: {
        select: {
          id: true,
          name: true,
          delivery_score: true,
        },
      },
    },

    location: {
      ...baseSelect,
      coordinates: true,
      connectivity: {
        select: {
          name: true,
          type: true,
          distance_km: true,
        },
        take: 10,
      },
      amenity: {
        select: {
          name: true,
          category: true,
        },
        take: 15,
      },
    },

    timeline: {
      ...baseSelect,
      possession_date: true,
      construction_status: {
        select: {
          phase: true,
          progress_pct: true,
          milestone_date: true,
        },
        orderBy: { milestone_date: 'asc' as const },
        take: 5,
      },
    },

    builder: {
      ...baseSelect,
      builder: {
        select: {
          id: true,
          name: true,
          founding_year: true,
          delivery_score: true,
          projects_completed: true,
          projects_ongoing: true,
          rera_status: true,
        },
      },
    },

    details: {
      ...baseSelect,
      price_min_cr: true,
      possession_date: true,
      floor_plan: {
        select: {
          configuration: true,
          count: true,
          carpet_area_sqft: true,
        },
        take: 5,
      },
      amenity: {
        select: {
          name: true,
          category: true,
        },
        take: 20,
      },
      connectivity: {
        select: {
          name: true,
          distance_km: true,
        },
        take: 5,
      },
    },

    compare: {
      ...baseSelect,
      price_min_cr: true,
      price_cagr_pct: true,
      construction_progress_pct: true,
      floor_plan: {
        select: {
          configuration: true,
          count: true,
        },
        take: 3,
      },
      amenity: {
        select: {
          name: true,
        },
        take: 10,
      },
    },

    general: {
      // Fallback: get all common fields
      id: true,
      name: true,
      slug: true,
      status: true,
      price_min_cr: true,
      possession_date: true,
      builder_id: true,
    },
  }

  return intentSelects[intent] || intentSelects.general
}

/**
 * Estimate query cost (for metrics/monitoring)
 */
export function estimateQueryCost(intent: QueryIntent): {
  tableAccesses: number
  estimatedMs: number
  cacheability: 'high' | 'medium' | 'low'
} {
  const costs: Record<QueryIntent, { tableAccesses: number; estimatedMs: number; cacheability: 'high' | 'medium' | 'low' }> = {
    payment: { tableAccesses: 2, estimatedMs: 150, cacheability: 'high' },
    investment: { tableAccesses: 3, estimatedMs: 200, cacheability: 'medium' },
    location: { tableAccesses: 3, estimatedMs: 180, cacheability: 'high' },
    timeline: { tableAccesses: 2, estimatedMs: 140, cacheability: 'high' },
    builder: { tableAccesses: 1, estimatedMs: 100, cacheability: 'high' },
    details: { tableAccesses: 4, estimatedMs: 250, cacheability: 'medium' },
    compare: { tableAccesses: 3, estimatedMs: 200, cacheability: 'low' },
    general: { tableAccesses: 5, estimatedMs: 300, cacheability: 'low' },
  }

  return costs[intent] || costs.general
}

/**
 * Optimize field selection for required fields
 */
export function optimizeRequiredFields(requiredFields: string[], intent: QueryIntent): string[] {
  // Remove redundant fields
  const uniqueFields = [...new Set(requiredFields)]

  // Limit to actually needed fields (prevent over-fetching)
  const maxFields = 20
  if (uniqueFields.length > maxFields) {
    console.warn(`[QUERY_OPTIMIZER] Too many required fields (${uniqueFields.length}), limiting to ${maxFields}`)
    return uniqueFields.slice(0, maxFields)
  }

  return uniqueFields
}

/**
 * Batch similar queries to reduce database load
 */
export class QueryBatcher {
  private batch = new Map<string, { fields: string[]; promises: Array<Promise<any>> }>()
  private timeout: NodeJS.Timeout | null = null
  private readonly batchWindowMs = 10 // 10ms batch window

  /**
   * Add query to batch
   */
  async batchQuery(projectId: string, intent: QueryIntent, requiredFields: string[], fn: () => Promise<any>): Promise<any> {
    const key = `${projectId}:${intent}`
    const existing = this.batch.get(key)

    // Create promise that will be resolved when batch executes
    const promise = new Promise((resolve, reject) => {
      // Immediately execute if no batch window in progress
      if (!this.timeout) {
        this.scheduleExecution()
      }

      // Add to batch
      if (!existing) {
        this.batch.set(key, {
          fields: requiredFields,
          promises: [],
        })
      }

      this.batch.get(key)!.promises.push(promise.then(resolve).catch(reject))
    })

    // Execute batch if enough items accumulated
    if (this.batch.size > 5) {
      await this.executeBatch()
    }

    return promise
  }

  /**
   * Schedule batch execution
   */
  private scheduleExecution(): void {
    this.timeout = setTimeout(() => {
      this.executeBatch()
    }, this.batchWindowMs)
  }

  /**
   * Execute all batched queries
   */
  private async executeBatch(): Promise<void> {
    if (this.timeout) {
      clearTimeout(this.timeout)
      this.timeout = null
    }

    const batchCopy = new Map(this.batch)
    this.batch.clear()

    for (const [key, item] of batchCopy.entries()) {
      // Execute query once and distribute results to all waiters
      try {
        // In real implementation, would call DB with optimized select
        console.log(`[QUERY_BATCHER] Executing batch for ${key} (${item.promises.length} waiters)`)
      } catch (err) {
        item.promises.forEach(p => Promise.reject(err))
      }
    }
  }

  /**
   * Clear batch
   */
  clear(): void {
    if (this.timeout) {
      clearTimeout(this.timeout)
      this.timeout = null
    }
    this.batch.clear()
  }
}

/**
 * Request coalescing — multiple identical requests → single fetch
 */
export class RequestCoalescer {
  private pending = new Map<string, Promise<any>>()

  /**
   * Coalesce identical requests
   */
  async coalesce<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // Return pending request if exists
    if (this.pending.has(key)) {
      return this.pending.get(key)!
    }

    // Execute and cache promise (not result)
    const promise = fn()
      .then(result => {
        this.pending.delete(key)
        return result
      })
      .catch(err => {
        this.pending.delete(key)
        throw err
      })

    this.pending.set(key, promise)
    return promise
  }

  /**
   * Clear pending
   */
  clear(): void {
    this.pending.clear()
  }
}
