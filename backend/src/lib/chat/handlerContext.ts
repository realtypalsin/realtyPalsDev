/**
 * Context and contract for the chat topic handlers.
 *
 * chat-router.ts grew a single ~3,900-line POST handler containing fourteen
 * hardcoded topic branches, each doing its own database work, writing its own
 * response and returning early before the generic gateway path below them ever
 * ran. That shape is why every fabrication bug found in this codebase lived in
 * one file: fourteen independent places to get honesty right is fourteen places
 * to get it wrong, and they drifted — one of them still instructed buyers to
 * visit up-rera.in, which the system prompt explicitly forbids.
 *
 * Extracting them behind this contract does three things:
 *   - each topic becomes a file small enough to review and test on its own
 *   - the context is an explicit type, so a handler cannot silently depend on
 *     some incidental local variable — the compiler is the verifier
 *   - a handler can be deleted once the generic path answers its topic as well,
 *     one at a time, with a test per removal
 */

import type { Response } from 'express'
import type { Intent } from '../discovery'

/** A chip as emitted to the client. Structural, so handlers can build literals. */
export interface ChatChip {
  id: string
  actionType: string
  label: string
  icon?: string
  analyticsId?: string
  priority?: number
  payload?: Record<string, unknown>
}

export interface UiState {
  stage: string
  thinking: string
  chips: ChatChip[]
  missingFields?: string[]
  confidence?: string
  [key: string]: unknown
}

/**
 * Everything a topic handler is allowed to reach.
 *
 * Deliberately narrow: a handler gets the buyer's message, the resolved intent,
 * the session identity, and the two emit functions. Anything it needs beyond
 * this it must import directly, which keeps the dependency visible.
 */
export interface ChatHandlerContext {
  /** Sanitised user message for this turn. */
  message: string
  /** Intent after hydration and post-processing. */
  intent: Intent
  /** Session id used for chip dedup and persistence — always present. */
  sessionId: string
  userId?: string
  guestToken?: string

  /** Raw SSE writer. */
  send: (event: string, data: Record<string, unknown>) => void
  /**
   * The single exit for ui_state. Applies sector filtering, session dedup and
   * the chip cap. Handlers must use this rather than send('ui_state', …) —
   * bypassing it is how chips the buyer had already dismissed came back.
   */
  emitUiState: (state: UiState, opts?: { fallbackChips?: ChatChip[]; skipDedup?: boolean }) => void

  /** For handlers that must end the response themselves. */
  res: Response

  /**
   * Projects carried over from the previous turn, used when the buyer says
   * "these" or asks a follow-up without naming anything. May be empty.
   */
  cachedProjects: ReadonlyArray<{ id: string }>

  /** Classification flags computed once per turn by the router. */
  flags: Readonly<Record<string, boolean>>
}

export interface ChatTopicHandler {
  /** Stable id, used in logs and tests. */
  id: string
  /** One line: which buyer question this answers. */
  description: string
  /** Cheap predicate over the precomputed flags and intent. No I/O. */
  matches: (ctx: ChatHandlerContext) => boolean
  /**
   * Produce the answer. Writes to the socket and ends the response.
   * Returning `false` means "declined after inspection" — the router carries
   * on to the next handler, which lets a matcher stay cheap while the handler
   * bails on a condition only visible after a lookup.
   */
  handle: (ctx: ChatHandlerContext) => Promise<boolean | void>
}

/**
 * Runs the first matching handler. Returns true when one produced a response,
 * in which case the router must not continue.
 */
export async function runTopicHandlers(
  handlers: readonly ChatTopicHandler[],
  ctx: ChatHandlerContext,
): Promise<boolean> {
  for (const handler of handlers) {
    if (!handler.matches(ctx)) continue
    const handled = await handler.handle(ctx)
    if (handled !== false) return true
  }
  return false
}
