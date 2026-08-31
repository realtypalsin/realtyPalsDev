// backend/src/lib/ai/rateBudget.ts
//
// Skip a leg BEFORE it rate-limits, rather than after.
//
// providerCooldown reacts: a leg 429s, we cool it for 65 seconds, the turn has
// already paid a round-trip to find out. That is fine when it happens once. It
// is not fine during a burst — a corpus run, or a buyer asking six questions in
// a minute — because every leg in the tier hits its limit in turn and each one
// costs a failed request first.
//
// Worse, a 429 that lands MID-STREAM cannot be rolled over: tokens are already
// on the buyer's screen, so the turn ends with a truncation notice. The only
// way to not truncate is to not start on a leg that is about to be refused.
//
// So: a sliding one-minute window of request counts per key, checked before the
// leg is used. When the window is full the leg is skipped silently and the next
// one is tried — no failed request, no cooldown, no half-written answer.
//
// Deliberately request-count only, not tokens. Token limits differ per model
// and per tier and we cannot read them; request rate is the limit that actually
// bites first on the free tiers this chain leads with, and a counter we can
// keep honestly beats an estimate we cannot.

/** Requests per minute we allow ourselves, per provider. */
const RPM: Record<string, number> = {
  // Google's published free-tier limit for flash-lite is 15/min. 12 leaves room
  // for the intent-extraction call that shares the same key on the same turn.
  gemini: Number(process.env.RPM_GEMINI ?? 12),
  // Groq documents 30/min on the free developer tier.
  groq: Number(process.env.RPM_GROQ ?? 25),
  // Cohere's trial keys are the tightest thing in the chain.
  cohere: Number(process.env.RPM_COHERE ?? 18),
  nvidia: Number(process.env.RPM_NVIDIA ?? 35),
  // Cloudflare bills a daily neuron pool rather than a per-minute rate.
  cloudflare: Number(process.env.RPM_CLOUDFLARE ?? 50),
  mistral: Number(process.env.RPM_MISTRAL ?? 25),
  cerebras: Number(process.env.RPM_CEREBRAS ?? 25),
}

/** Anything not named above. Generous: an unknown limit is not a reason to throttle. */
const DEFAULT_RPM = 60

const WINDOW_MS = 60_000

/** Request timestamps per budget key, oldest first. */
const hits = new Map<string, number[]>()

function prune(key: string, now: number): number[] {
  const list = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS)
  hits.set(key, list)
  return list
}

/** The limit that applies to this leg. Vendor beats provider — see fallbackChain. */
export function limitFor(vendor: string): number {
  return RPM[vendor] ?? DEFAULT_RPM
}

/**
 * True when using this leg right now would probably be refused.
 *
 * "Probably" is the honest word: these are published limits, not limits we can
 * read back from the provider, and a key shared with another process would blow
 * through them without this counter seeing it. It removes the common case —
 * our own burst — and the cooldown still catches everything else.
 */
export function wouldExceed(budgetKey: string, vendor: string): boolean {
  return prune(budgetKey, Date.now()).length >= limitFor(vendor)
}

/** Call immediately before dispatching to a leg. */
export function recordAttempt(budgetKey: string): void {
  const now = Date.now()
  hits.set(budgetKey, [...prune(budgetKey, now), now])
}

/**
 * A 429 means our published limit is wrong for this key, so believe the
 * provider over the constant: fill the window, which parks the leg until it
 * genuinely rolls over.
 */
export function recordRateLimited(budgetKey: string, vendor: string): void {
  const now = Date.now()
  hits.set(budgetKey, Array.from({ length: limitFor(vendor) }, () => now))
}

/** How many requests are left in this leg's window. For logging and tests. */
export function remaining(budgetKey: string, vendor: string): number {
  return Math.max(0, limitFor(vendor) - prune(budgetKey, Date.now()).length)
}

/** Test seam. */
export function resetRateBudget(): void {
  hits.clear()
}
