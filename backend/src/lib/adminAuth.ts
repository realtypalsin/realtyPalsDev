import { randomUUID } from 'crypto'
import type { Request, Response, NextFunction } from 'express'
import { getCached, setCached, deleteCached } from './cache'

const SESSION_TTL_SECS = 7 * 24 * 60 * 60 // 7 days
const SESSION_PREFIX = 'admin:session:'

export interface AdminSession {
  createdAt: string
  lastSeen: string
  ip: string
  userAgent: string
}

// ---------------------------------------------------------------------------
// In-memory fallback store — used when Redis is unavailable.
// Covers single-process / local deployments where Redis may not be running.
// Each entry carries its own expiry timestamp so old sessions are evicted on
// the next access rather than accumulating indefinitely.
// ---------------------------------------------------------------------------
interface MemEntry { session: AdminSession; expiresAt: number }
const memSessions = new Map<string, MemEntry>()

function memGet(token: string): AdminSession | null {
  const entry = memSessions.get(token)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) { memSessions.delete(token); return null }
  return entry.session
}

function memSet(token: string, session: AdminSession): void {
  memSessions.set(token, { session, expiresAt: Date.now() + SESSION_TTL_SECS * 1000 })
}

function memDelete(token: string): void {
  memSessions.delete(token)
}

export async function createAdminSession(ip: string, userAgent: string): Promise<string> {
  const token = randomUUID()
  const now = new Date().toISOString()
  const session: AdminSession = { createdAt: now, lastSeen: now, ip, userAgent }

  const written = await setCached<AdminSession>(`${SESSION_PREFIX}${token}`, session, SESSION_TTL_SECS)
  if (!written) {
    // Redis unavailable — fall back to in-memory store.
    console.warn('[adminAuth] Redis unavailable — using in-memory session store (single-process only)')
    memSet(token, session)
  }
  return token
}

export async function validateAdminSession(token: string | undefined): Promise<AdminSession | null> {
  if (!token) return null
  // Try Redis first; if Redis returns null, check in-memory fallback.
  const fromRedis = await getCached<AdminSession>(`${SESSION_PREFIX}${token}`)
  if (fromRedis) return fromRedis
  return memGet(token)
}

export async function destroyAdminSession(token: string): Promise<void> {
  await deleteCached(`${SESSION_PREFIX}${token}`)
  memDelete(token) // always clean up both stores
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.admin_token as string | undefined
  console.log('[requireAdmin] token from cookie:', token ? 'present' : 'missing')
  const session = await validateAdminSession(token)
  console.log('[requireAdmin] session lookup result:', session ? 'found' : 'not found')
  if (!session) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  next()
}
