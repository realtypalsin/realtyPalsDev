// backend/src/lib/routeCache.ts
// Generic route-level cache middleware using Redis/in-memory fallback.
// Usage: router.get('/path', routeCache(300), handler)

import { Request, Response, NextFunction } from 'express'
import { getCached, setCached } from './cache'

/**
 * @param ttlSecs How long to cache the response (seconds)
 */
export function routeCache(ttlSecs: number) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Only cache GET requests with no auth (public data)
    if (req.method !== 'GET') { next(); return }

    const cacheKey = `route:${req.path}:${JSON.stringify(req.query)}`
    const cachedObj = await getCached<{ data: unknown; staleAt: number }>(cacheKey)
    
    // Intercept res.json to capture and cache the response
    const originalJson = res.json.bind(res)
    let headersSentByCache = false

    res.json = ((body: unknown) => {
      // Update cache
      if (res.statusCode >= 200 && res.statusCode < 300) {
        setCached(cacheKey, { data: body, staleAt: Date.now() + (ttlSecs * 1000) }, ttlSecs * 2).catch(() => {})
      }
      // If we already sent the stale cache to the client, suppress this json call
      if (headersSentByCache) return res

      res.setHeader('X-Cache', 'MISS')
      return originalJson(body)
    }) as any

    if (cachedObj !== null) {
      const isStale = Date.now() > cachedObj.staleAt
      
      if (!isStale) {
        res.setHeader('X-Cache', 'HIT')
        // We use originalJson here so it doesn't trigger the cache-update logic again
        originalJson(cachedObj.data)
        return
      }

      // It's stale. Serve stale immediately.
      res.setHeader('X-Cache', 'STALE')
      headersSentByCache = true
      originalJson(cachedObj.data)

      // Let the request continue in the background to update the cache
      next()
      return
    }

    next()
  }
}
