import type { ChatTopicHandler } from '../handlerContext'
import { reraVerificationHandler } from './reraVerification'
import { statutoryTaxHandler } from './statutoryTax'
import { possessionStatusHandler } from './possessionStatus'

/**
 * Topic handlers, in priority order — the first match wins.
 *
 * These are being lifted out of the ~3,900-line POST handler in chat-router.ts
 * one at a time. Order is preserved exactly as it was inline, because several
 * matchers overlap (a message can look like both a tax question and a cost
 * question) and the original sequence encodes which reading won.
 *
 * The long-term shape is that this list shrinks: each handler is deleted once
 * the generic gateway path answers its topic as well or better, verified by a
 * test per removal. The registry is the mechanism for retiring them safely, not
 * a place to keep adding to.
 *
 * Extracted so far — all three were rewritten in the process, each for a reason
 * recorded in its own file:
 *   rera_verification   sent buyers to up-rera.in, which rule 17 forbids
 *   statutory_tax       had every UP rate typed in as a literal
 *   possession_status   defaulted to Sector 76, and fabricated a table row
 *
 * Still inline in chat-router.ts: builder reputation, sector orientation,
 * amenities, unit configuration, total outflow, connectivity, sector compare,
 * payment plans, cost sheet, project detail, open-query lane.
 */
export const CHAT_TOPIC_HANDLERS: readonly ChatTopicHandler[] = [
  reraVerificationHandler,
  statutoryTaxHandler,
  possessionStatusHandler,
]

export { reraVerificationHandler, statutoryTaxHandler, possessionStatusHandler }
