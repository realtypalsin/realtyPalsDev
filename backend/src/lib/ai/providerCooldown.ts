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

/**
 * Cooldown for a per-minute rate limit. Free-tier windows are minute-length, so
 * this is long enough to clear one and short enough that the leg is back before
 * a busy minute is over.
 */
const RATE_LIMIT_COOLDOWN_MS = 65 * 1000

/** Quota windows are usually per-minute or per-day; five minutes splits it sensibly. */
const cooldowns = new Map<string, { until: number; reason: string }>()

export type FailureKind = 'durable' | 'transient' | 'rate_limited'

/**
 * A per-minute rate limit, as opposed to an exhausted balance or day quota.
 *
 * These read almost identically — both arrive as 429 with the word "quota" in
 * them — but they want opposite handling. A free-tier key that has hit its
 * requests-per-minute ceiling is healthy and will answer again in under a
 * minute; cooling it for the full durable window throws away the only fallback
 * capacity there is. An exhausted prepaid balance will not recover today.
 *
 * Matched before the durable list, and deliberately narrow: anything that
 * mentions billing, credits or a daily limit falls through to durable.
 */
const RATE_LIMIT_PATTERNS = [
  'rate limit',
  'rate_limit',
  'requests per minute',
  'too many requests',
  'resource_exhausted: quota exceeded for quota metric',
  'per minute',
  'retry after',
  'retry_after',
]

/** Signals a limit that will not clear on its own within the turn. */
const NOT_MERELY_RATE_LIMITED = [
  'credits are depleted',
  'prepayment',
  'billing',
  'per day',
  'daily limit',
  'requests per day',
  'insufficient_quota',
]

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

  // Checked before `durable`, because a per-minute limit also says "quota".
  if (
    RATE_LIMIT_PATTERNS.some(needle => message.includes(needle)) &&
    !NOT_MERELY_RATE_LIMITED.some(needle => message.includes(needle))
  ) {
    return 'rate_limited'
  }

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
  if (kind === 'durable' || kind === 'rate_limited') {
    const reason = (error instanceof Error ? error.message : String(error ?? '')).slice(0, 120)
    // A per-minute limit clears on its own; a depleted balance does not. Cooling
    // a rate-limited free key for the full durable window would remove the only
    // fallback capacity available precisely when the paid key is also struggling.
    const ms = kind === 'rate_limited' ? RATE_LIMIT_COOLDOWN_MS : COOLDOWN_MS
    cooldowns.set(key, { until: Date.now() + ms, reason })
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
