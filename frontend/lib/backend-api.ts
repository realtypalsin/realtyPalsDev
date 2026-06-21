// frontend/lib/backend-api.ts
// Client for the Express backend (http://localhost:3001)

import { authHeaders } from '@/lib/authedFetch'

// Default aligned with backend/.env (PORT=3002). Override via NEXT_PUBLIC_BACKEND_URL.
const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3002'

export interface UnitTypeSummary {
  name: string
  bhk: number
  bathrooms: number | null
  super_area_sqft?: number | null
  carpet_area_sqft?: number | null
  price_min_cr?: number | null
  price_max_cr?: number | null
  price_label?: string | null
}

export interface AmenitySummary {
  name: string
  category: string
}

export interface ConnSummary {
  type: string
  name: string
  distance_km?: number | null
}

export interface ScoredProject {
  id: string
  slug: string
  name: string
  tagline?: string | null
  builder: { name: string; slug: string }
  rera_number?: string | null
  rera_url?: string | null
  lat?: number | null
  lng?: number | null
  sector: string
  city: string
  address?: string | null
  land_area_acres?: number | null
  total_towers?: number | null
  status: string
  possession_label?: string | null
  possession_date: string | null
  architect?: string | null
  interior_designer?: string | null
  design_theme?: string | null
  marketing_claims: string[]
  hero_image_url?: string | null
  price_min_cr?: number | null
  price_max_cr?: number | null
  price_range_label: string
  unit_types: UnitTypeSummary[]
  top_amenities: AmenitySummary[]
  top_connectivity: ConnSummary[]
  images: Array<{
    id: string
    url: string
    type: string
    caption: string | null
    sort_order: number
  }>
  matchScore: number
  matchReason: string
}

export interface NearbyExpansion {
  requestedSector: string
  searchedSectors: string[]
  reason: 'no_results_in_requested_sector'
}

export type SSEEvent =
  | { type: 'intent'; intent: Record<string, unknown>; intentState: string }
  | { type: 'properties'; exactResults: ScoredProject[]; nearbyResults: ScoredProject[]; expansion: NearbyExpansion | null }
  | { type: 'token'; token: string }
  | { type: 'done'; sessionId: string; intentState: string; intent?: Record<string, unknown> }
  | { type: 'error'; message: string }

export function streamChat(
  message: string,
  options: {
    sessionId?: string
    userId?: string
    guestToken?: string
    intent?: Record<string, unknown>
    onEvent: (event: SSEEvent) => void
    onDone?: () => void
    signal?: AbortSignal
  }
): void {
  authHeaders({ 'Content-Type': 'application/json' }).then((headers) => fetch(`${BACKEND}/api/v1/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message,
      sessionId: options.sessionId,
      guestToken: options.guestToken,
      intent: options.intent,
    }),
    signal: options.signal,
  })).then(async (res) => {
    if (!res.ok || !res.body) {
      // Surface the real reason (auth/rate-limit/etc.) instead of a generic message.
      let msg = 'The advisor is having trouble right now. Please try again in a moment.'
      try {
        const err = await res.json()
        if (res.status === 429) msg = 'You’re sending messages a bit fast — give it a few seconds and try again.'
        else if (res.status === 401 || res.status === 403) msg = 'Your session expired. Please sign in again.'
        else if (err?.error) msg = err.error
      } catch { /* non-JSON body */ }
      options.onEvent({ type: 'error', message: msg })
      options.onDone?.()
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split('\n\n')
      buffer = parts.pop() ?? ''

      for (const part of parts) {
        if (!part.trim()) continue
        const eventLine = part.match(/^event: (\w+)/m)
        const dataLine = part.match(/^data: (.+)/m)
        if (!eventLine || !dataLine) continue

        const eventType = eventLine[1]
        try {
          const data = JSON.parse(dataLine[1])
          options.onEvent({ type: eventType, ...data } as SSEEvent)
        } catch { /* ignore parse errors */ }
      }
    }
    options.onDone?.()
  }).catch((err) => {
    if ((err as Error).name !== 'AbortError') {
      options.onEvent({ type: 'error', message: 'Connection error. Please try again.' })
    }
    options.onDone?.()
  })
}

export async function getSessions(userId?: string, guestToken?: string) {
  const url = new URL(`${BACKEND}/api/v1/sessions`)
  if (guestToken && !userId) url.searchParams.set('guestToken', guestToken)

  const res = await fetch(url.toString(), {
    headers: await authHeaders(),
  })
  if (!res.ok) return { sessions: [] as Array<{
    id: string; title: string | null; chat_phase: string;
    message_count: number; last_active: string;
  }> }
  return res.json() as Promise<{ sessions: Array<{
    id: string; title: string | null; chat_phase: string;
    message_count: number; last_active: string;
  }> }>
}

export async function getReEngagement(userId?: string, guestToken?: string) {
  const url = new URL(`${BACKEND}/api/v1/sessions/re-engagement/latest`)
  if (guestToken && !userId) url.searchParams.set('guestToken', guestToken)

  const res = await fetch(url.toString(), {
    headers: await authHeaders(),
  })
  if (!res.ok) return { session: null }
  return res.json() as Promise<{ session: {
    id: string; title: string | null; chat_phase: string; last_active: string;
  } | null }>
}

export async function migrateSessions(userId: string, guestToken: string) {
  await fetch(`${BACKEND}/api/v1/sessions/migrate`, {
    method: 'POST',
    headers: await authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ guestToken }),
  })
}
