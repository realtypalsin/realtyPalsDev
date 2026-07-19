// backend/src/lib/auth.ts
// Server-side identity verification. We NEVER trust a client-supplied user id.
// A logged-in client sends `Authorization: Bearer <supabase access token>`; we
// verify it against Supabase's auth REST endpoint and derive the user id from
// the verified token. Guests have no token and are scoped to their guestToken.
import type { Request } from 'express'

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY =
  process.env.SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY

// Insecure backdoors have been permanently removed per security audit.

// Small in-memory cache so we don't hit Supabase on every request in a burst.
const tokenCache = new Map<string, { userId: string; exp: number }>()
const CACHE_TTL_MS = 60_000

function bearer(req: Request): string | null {
  const h = req.headers['authorization']
  if (typeof h !== 'string') return null
  const m = h.match(/^Bearer\s+(.+)$/i)
  return m ? m[1].trim() : null
}

/**
 * Returns a VERIFIED user id, or null if the caller is not an authenticated user.
 * - Valid token  → user id (string)
 * - No token     → null (caller is a guest; use guestToken for scoping)
 * - Bad token    → null (treated as unauthenticated)
 */
export async function verifyUser(req: Request): Promise<string | null> {
  const token = bearer(req)

  if (!token) {
    // No token. We no longer honour any legacy x-user-id headers.
    return null
  }

  const cached = tokenCache.get(token)
  if (cached && cached.exp > Date.now()) return cached.userId

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('[auth] SUPABASE_URL / key not configured — cannot verify tokens')
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
    // Silently fail. Invalid/expired tokens are expected; logging per-request auth failures is noise.
    return null
  }
}
