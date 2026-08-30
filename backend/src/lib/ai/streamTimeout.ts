// backend/src/lib/ai/streamTimeout.ts
//
// Mistral and Cerebras were the only legs in the fallback chain with no timeout
// of any kind. Gemini, Groq and OpenAI each grew their own; these two never
// did, so a stalled stream ran until the HTTP client gave up. That matters more
// than it sounds: both sit directly below three Gemini legs that are cooling
// down on a depleted balance, so they are the legs most turns actually land on.
//
// Groq and OpenAI keep their own copies of this logic. They are not touched
// here — this exists so the two legs that had nothing get one implementation
// rather than two more.

/** Thrown when a provider stream stalls, or its headers never arrive. */
export class StreamStalledError extends Error {
  readonly tokensSent: boolean
  constructor(provider: string, tokensSent: boolean) {
    super(`${provider} stream stalled`)
    this.name = 'StreamStalledError'
    this.tokensSent = tokensSent
  }
}

/** 60 seconds of SILENCE, the same budget Groq and OpenAI use. */
export const DEFAULT_INACTIVITY_MS = 60_000

export interface InactivityGuard {
  /** Pass to the SDK as `{ signal }` so an abort tears the fetch down. */
  readonly signal: AbortSignal
  /** Call on every chunk. A generation that is slow but progressing never trips. */
  reset(): void
  /** Call once the stream ends, on every path. */
  clear(): void
  /** Records that content has reached the client, for the thrown error. */
  markTokenSent(): void
  /**
   * Rethrows as StreamStalledError when this guard caused the failure, and
   * rethrows the original otherwise — the chain treats those differently.
   */
  rethrow(err: unknown): never
}

/**
 * Guards one streaming call. Arm it BEFORE the create() await so a header stall
 * is caught in the same window as a mid-body stall.
 */
export function createInactivityGuard(provider: string, inactivityMs = DEFAULT_INACTIVITY_MS): InactivityGuard {
  const controller = new AbortController()
  let timer: NodeJS.Timeout | null = null
  let fired = false
  let tokensSent = false

  const reset = () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fired = true
      console.warn(`[${provider.toUpperCase()}] inactivity timeout after ${inactivityMs}ms tokensSent=${tokensSent}`)
      controller.abort()
    }, inactivityMs)
  }

  reset()

  return {
    signal: controller.signal,
    reset,
    clear: () => { if (timer) clearTimeout(timer) },
    markTokenSent: () => { tokensSent = true },
    rethrow(err: unknown): never {
      if (timer) clearTimeout(timer)
      if (fired || controller.signal.aborted) throw new StreamStalledError(provider, tokensSent)
      throw err
    },
  }
}
