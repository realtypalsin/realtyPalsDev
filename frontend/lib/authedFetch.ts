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

/** Merge an Authorization header (when logged in) into an existing headers object. */
export async function authHeaders(base: Record<string, string> = {}): Promise<Record<string, string>> {
  const token = await getAccessToken()
  return token ? { ...base, Authorization: `Bearer ${token}` } : { ...base }
}
