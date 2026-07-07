/**
 * Frontend-side authentication utilities for API routes
 * Verifies Supabase tokens and enforces admin access
 */

import { NextRequest } from 'next/server'

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY =
  process.env.SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY

const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS || '').split(',').filter(Boolean)

const tokenCache = new Map<string, { userId: string; exp: number }>()
const CACHE_TTL_MS = 60_000

function bearer(req: NextRequest): string | null {
  const h = req.headers.get('authorization')
  if (!h) return null
  const m = h.match(/^Bearer\s+(.+)$/i)
  return m ? m[1].trim() : null
}

export async function verifyUser(req: NextRequest): Promise<string | null> {
  const token = bearer(req)
  if (!token) return null

  const cached = tokenCache.get(token)
  if (cached && cached.exp > Date.now()) return cached.userId

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('[auth] SUPABASE_URL / key not configured')
    return null
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_KEY },
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return null

    const user = (await res.json()) as { id?: string }
    if (!user?.id) return null

    tokenCache.set(token, { userId: user.id, exp: Date.now() + CACHE_TTL_MS })
    return user.id
  } catch (err) {
    console.warn('[auth] token verification failed:', (err as Error).message)
    return null
  }
}

export async function verifyAdminUser(req: NextRequest): Promise<string | null> {
  const userId = await verifyUser(req)
  if (!userId) return null

  // Check if user is in admin list
  if (ADMIN_USER_IDS.length > 0 && !ADMIN_USER_IDS.includes(userId)) {
    console.warn(`[auth] user ${userId} not in admin list`)
    return null
  }

  return userId
}
