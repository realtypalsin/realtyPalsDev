/**
 * Short-lived cooldown for provider legs that just failed for a durable reason.
 *
 * The chain had no memory. A key that was out of quota was retried on every
 * single turn, in order, before the request reached a provider that answers —
 * and a live health check found exactly that: both tier-1 Gemini keys returning
 * 429 "You exceeded your current quota", costing roughly 1.8 seconds of dead
 * latency before the first token of every conversation.
 *
 * The distinction that matters is *durable* versus *transient*:
 *
 *   durable    quota exhausted, key revoked, model retired, billing required.
 *              Retrying in ten seconds cannot succeed. Skip the leg for a while.
 *   transient  a timeout, a stall, a 500, a dropped socket. Retrying is exactly
 *              the right response, and a cooldown here would remove capacity
 *              during the outage it is meant to survive.
 *
 * Deliberately in-process and unsynchronised. Each instance learns from its own
 * traffic within a minute; sharing this through Redis would add a network round
 * trip to the hot path to save a request that is already rare after the first.
 */

/** How long a leg stays skipped. Long enough to matter, short enough to recover. */
const COOLDOWN_MS = 5 * 60 * 1000

/** Quota windows are usually per-minute or per-day; five minutes splits it sensibly. */
const cooldowns = new Map<string, { until: number; reason: string }>()

export type FailureKind = 'durable' | 'transient'

/**
 * Classifies a provider failure.
 *
 * Errors reach here as free text from four different SDKs, so this reads the
 * message rather than a status code. Anything unrecognised is treated as
 * transient: wrongly cooling a healthy provider costs more than one wasted retry.
 */
export function classifyFailure(error: unknown): FailureKind {
  const message = (error instanceof Error ? error.message : String(error ?? '')).toLowerCase()

  const durable = [
    'exceeded your current quota',
    'quota',
    'insufficient_quota',
    'billing',
    'payment required',
    'payment_required',
    '402',
    'invalid api key',
    'incorrect api key',
    'invalid_api_key',
    'unauthorized',
    'authentication',
    '401',
    'permission',
    '403',
    'model does not exist',
    'model_not_found',
    'does not exist or you do not have access',
    'has been retired',
    'retirement',
    'deprecated',
    '410',
  ]

  return durable.some(needle => message.includes(needle)) ? 'durable' : 'transient'
}

/** True when this leg should be skipped right now. */
export function isCoolingDown(key: string): boolean {
  const entry = cooldowns.get(key)
  if (!entry) return false
  if (entry.until <= Date.now()) {
    cooldowns.delete(key)
    return false
  }
  return true
}

/** Why a leg is cooling down, for the log line. */
export function cooldownReason(key: string): string | null {
  const entry = cooldowns.get(key)
  return entry && entry.until > Date.now() ? entry.reason : null
}

/**
 * Records a failure. Only durable ones start a cooldown.
 * Returns the kind so the caller can log it.
 */
export function recordFailure(key: string, error: unknown): FailureKind {
  const kind = classifyFailure(error)
  if (kind === 'durable') {
    const reason = (error instanceof Error ? error.message : String(error ?? '')).slice(0, 120)
    cooldowns.set(key, { until: Date.now() + COOLDOWN_MS, reason })
  }
  return kind
}

/** A leg that answers is trusted again immediately. */
export function recordSuccess(key: string): void {
  cooldowns.delete(key)
}

/** Test seam. */
export function resetCooldowns(): void {
  cooldowns.clear()
}

/** Current state, for the health endpoint. */
export function activeCooldowns(): Array<{ key: string; secondsLeft: number; reason: string }> {
  const now = Date.now()
  const out: Array<{ key: string; secondsLeft: number; reason: string }> = []
  for (const [key, entry] of cooldowns) {
    if (entry.until > now) out.push({ key, secondsLeft: Math.round((entry.until - now) / 1000), reason: entry.reason })
  }
  return out
}
