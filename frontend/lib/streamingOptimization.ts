/**
 * Streaming Optimization — Render components incrementally as data arrives
 */

import type { ComponentResponse, ComponentSpec } from '@/types/property'

/**
 * Prioritize components by render speed
 * Fast components render first for perceived performance
 */
export function prioritizeComponents(specs: ComponentSpec[]): {
  prioritized: ComponentSpec[]
  highPriority: ComponentSpec[]
  lowPriority: ComponentSpec[]
} {
  const renderTime: Record<string, number> = {
    // Fast (< 50ms)
    'confidence-badge': 5,
    'risk-meter': 30,
    'property-card': 40,

    // Medium (50-150ms)
    'amenities-grid': 60,
    'connectivity-list': 80,
    'builder-card': 100,
    'location-scorecard': 120,

    // Slow (> 150ms) — rendering charts, maps
    'price-chart': 200,
    'emi-calculator': 180,
    'timeline': 160,
    'payment-breakdown': 170,
    'map-view': 250,
    'comparison-table': 300,
  }

  const highPriority = specs.filter(s => (renderTime[s.type] || 100) < 80)
  const lowPriority = specs.filter(s => (renderTime[s.type] || 100) >= 80)

  // Sort within each priority by render time
  highPriority.sort((a, b) => (renderTime[a.type] || 100) - (renderTime[b.type] || 100))
  lowPriority.sort((a, b) => (renderTime[a.type] || 100) - (renderTime[b.type] || 100))

  return {
    prioritized: [...highPriority, ...lowPriority],
    highPriority,
    lowPriority,
  }
}

/**
 * Incremental component renderer
 * Start with high-priority, queue low-priority for later
 */
export class IncrementalRenderer {
  private rendered = new Set<number>()
  private batchSize = 3 // Render this many at a time
  private batchDelayMs = 100 // Wait between batches for DOM breathing

  /**
   * Get next batch of components to render
   */
  getNextBatch(specs: ComponentSpec[], prioritized = false): {
    batch: ComponentSpec[]
    totalRemaining: number
    batchNumber: number
  } {
    const specsToUse = prioritized ? prioritizeComponents(specs).prioritized : specs

    const batch = specsToUse.filter((_, i) => {
      if (this.rendered.has(i)) return false
      if (this.rendered.size >= this.batchSize) return false
      return true
    })

    batch.forEach((_, idx) => {
      const originalIdx = specsToUse.findIndex(s => s === batch[idx])
      this.rendered.add(originalIdx)
    })

    return {
      batch,
      totalRemaining: specsToUse.length - this.rendered.size,
      batchNumber: Math.ceil(this.rendered.size / this.batchSize),
    }
  }

  /**
   * Reset state
   */
  reset(): void {
    this.rendered.clear()
  }
}

/**
 * Debounce streaming updates
 */
export class StreamDebouncer {
  private pendingUpdate: ComponentResponse | null = null
  private timeout: NodeJS.Timeout | null = null
  private readonly debounceMs = 50

  /**
   * Queue update
   */
  queue(response: ComponentResponse, callback: (response: ComponentResponse) => void): void {
    this.pendingUpdate = response

    if (this.timeout) clearTimeout(this.timeout)

    this.timeout = setTimeout(() => {
      if (this.pendingUpdate) {
        callback(this.pendingUpdate)
        this.pendingUpdate = null
      }
      this.timeout = null
    }, this.debounceMs)
  }

  /**
   * Flush pending update immediately
   */
  flush(callback: (response: ComponentResponse) => void): void {
    if (this.timeout) clearTimeout(this.timeout)

    if (this.pendingUpdate) {
      callback(this.pendingUpdate)
      this.pendingUpdate = null
    }
    this.timeout = null
  }

  /**
   * Clear
   */
  clear(): void {
    if (this.timeout) clearTimeout(this.timeout)
    this.pendingUpdate = null
    this.timeout = null
  }
}

/**
 * Component render metrics
 */
export class RenderMetrics {
  private renderTimes = new Map<string, number[]>()
  private startTimes = new Map<string, number>()

  /**
   * Start measuring
   */
  start(componentType: string): void {
    this.startTimes.set(componentType, performance.now())
  }

  /**
   * End measuring
   */
  end(componentType: string): number {
    const startTime = this.startTimes.get(componentType)
    if (!startTime) return 0

    const duration = performance.now() - startTime
    this.startTimes.delete(componentType)

    if (!this.renderTimes.has(componentType)) {
      this.renderTimes.set(componentType, [])
    }

    this.renderTimes.get(componentType)!.push(duration)

    // Keep only last 10 measurements
    const times = this.renderTimes.get(componentType)!
    if (times.length > 10) times.shift()

    return duration
  }

  /**
   * Get average render time
   */
  getAverageTime(componentType: string): number {
    const times = this.renderTimes.get(componentType) || []
    if (times.length === 0) return 0
    return times.reduce((a, b) => a + b, 0) / times.length
  }

  /**
   * Get all metrics
   */
  getMetrics(): Record<string, { avg: number; count: number }> {
    const metrics: Record<string, { avg: number; count: number }> = {}

    for (const [type, times] of this.renderTimes.entries()) {
      metrics[type] = {
        avg: times.reduce((a, b) => a + b, 0) / times.length,
        count: times.length,
      }
    }

    return metrics
  }

  /**
   * Reset
   */
  reset(): void {
    this.renderTimes.clear()
    this.startTimes.clear()
  }
}

/**
 * Virtual scrolling for long component lists
 */
export class VirtualScroller {
  private viewportHeight = 800 // Assume 800px viewport
  private itemHeight = 200 // Assume 200px per component
  private overscroll = 2 // Render 2 items above/below viewport

  /**
   * Calculate visible indices
   */
  getVisibleIndices(scrollTop: number, totalItems: number): {
    start: number
    end: number
  } {
    const start = Math.max(0, Math.floor(scrollTop / this.itemHeight) - this.overscroll)
    const visibleCount = Math.ceil(this.viewportHeight / this.itemHeight)
    const end = Math.min(totalItems, start + visibleCount + this.overscroll * 2)

    return { start, end }
  }

  /**
   * Set measurements
   */
  setMeasurements(viewportHeight: number, itemHeight: number): void {
    this.viewportHeight = viewportHeight
    this.itemHeight = itemHeight
  }
}

/**
 * SSE streaming optimization
 */
export class SSEOptimizer {
  private lastEventTime = 0
  private eventCount = 0
  private readonly throttleMs = 16 // ~60fps

  /**
   * Check if should process event (throttle rapid events)
   */
  shouldProcess(): boolean {
    const now = performance.now()
    if (now - this.lastEventTime < this.throttleMs) {
      return false
    }
    this.lastEventTime = now
    this.eventCount++
    return true
  }

  /**
   * Get event rate
   */
  getEventRate(): { eventsPerSecond: number; totalEvents: number } {
    return {
      eventsPerSecond: this.eventCount,
      totalEvents: this.eventCount,
    }
  }

  /**
   * Reset
   */
  reset(): void {
    this.lastEventTime = 0
    this.eventCount = 0
  }
}
