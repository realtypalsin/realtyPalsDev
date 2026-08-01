// frontend/lib/authedFetch.ts
// Client-side helper: attaches the verified Supabase access token to backend
// requests as `Authorization: Bearer <token>`. We send the TOKEN, never a raw
// user id — the server derives identity from the verified token.
import { getSupabaseClient } from '@/lib/supabase'

let cachedToken: { value: string; exp: number } | null = null

export async function getAccessToken(): Promise<string | null> {
  if (cachedToken && cachedToken.exp > Date.now()) return cachedToken.value
  try {
    const supabase = await getSupabaseClient()
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token ?? null
    // Short cache to avoid hitting Supabase on every call in a burst.
    if (token) cachedToken = { value: token, exp: Date.now() + 30_000 }
    else cachedToken = null
    return token
  } catch {
    return null
  }
}

import { getGuestToken } from '@/lib/guestToken'

/** Merge an Authorization header (when logged in) and X-Guest-Token into an existing headers object. */
export async function authHeaders(base: Record<string, string> = {}): Promise<Record<string, string>> {
  const token = await getAccessToken()
  const guestToken = getGuestToken()
  const headers: Record<string, string> = { ...base }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  if (guestToken) {
    headers['X-Guest-Token'] = guestToken
  }
  return headers
}

/** Get admin Authorization header from localStorage token. */
export function adminAuthHeaders(base: Record<string, string> = {}): Record<string, string> {
  if (typeof window === 'undefined') return base
  const token = localStorage.getItem('admin_token')
  return token ? { ...base, Authorization: `Bearer ${token}` } : { ...base }
}
