interface CacheEntry<T> {
  value: T
  expiresAt: number
}

export class TTLCache<T> {
  private store = new Map<string, CacheEntry<T>>()
  private readonly ttlMs: number
  private readonly maxSize: number

  constructor(ttlMs: number, maxSize = 500) {
    this.ttlMs = ttlMs
    this.maxSize = maxSize
  }

  get(key: string): T | null {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }
    // LRU: re-insert to move to end
    this.store.delete(key)
    this.store.set(key, entry)
    return entry.value
  }

  set(key: string, value: T): void {
    // Evict oldest entry if at capacity
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      const oldest = this.store.keys().next().value
      if (oldest) this.store.delete(oldest)
    }
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs })
  }

  delete(key: string): void {
    this.store.delete(key)
  }

  size(): number {
    return this.store.size
  }
}

// Singleton caches (survive across requests in the same Node.js process)
const globalForCaches = global as unknown as {
  projectDetailCache: TTLCache<unknown>
}

export const projectDetailCache: TTLCache<unknown> =
  globalForCaches.projectDetailCache ??
  new TTLCache(5 * 60 * 1000, 200) // 5 minute TTL

if (process.env.NODE_ENV !== 'production') {
  globalForCaches.projectDetailCache = projectDetailCache
}
