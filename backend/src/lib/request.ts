import type { Request } from 'express'

// Returns the real client IP. Requires app.set('trust proxy', 1) in index.ts.
// With trust proxy configured, Express populates req.ip from the
// X-Forwarded-For chain correctly instead of exposing the raw header.
export function clientIp(req: Request): string {
  return req.ip ?? 'unknown'
}
