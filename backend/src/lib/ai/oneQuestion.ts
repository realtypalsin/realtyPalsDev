// backend/src/lib/ai/oneQuestion.ts
//
// One question per turn, enforced on the bytes.
//
// The prompt has asked for this in three places for weeks, and it is still the
// most reliably broken rule in the product. Measured on a single funnel run,
// after the rule was tightened with two worked counter-examples:
//
//   "…do you have a specific micro-market or sector in Noida in mind, or would
//    you like to narrow down a shortlist based on your preferred budget and
//    room configuration?"
//   "Are you aiming for a ready-to-move 3 or 4 BHK, and what is your target
//    budget for your family's home?"
//
// Three answers requested in one breath, both times. A buyer facing that is
// filling in a form, which is the thing this product exists not to be.
//
// A prompt rule is a request; this runs after generation, so it cannot be
// talked out of. Same reasoning as the table stripper and the over-promise
// softener.
//
// Deliberately conservative in two ways. An either/or — "X, or would you rather
// Y?" — is left alone: that is one decision with two options, which is how a
// good advisor narrows things, and cutting it would leave a worse question. And
// it only ever TRIMS; it never rewrites a clause or invents a connective, so
// the worst case is a shorter question rather than a wrong one.

/** `, and what is your budget` — a second ask smuggled onto the first. */
const SECOND_ASK =
  /,\s+(?:and|plus|also)\s+(?=(?:what|which|how|when|where|do|does|did|are|is|would|will|can|could|have|has|any)\b)/i

export interface OneQuestionResult {
  text: string
  /** How many extra asks were removed. Zero means the reply was already fine. */
  trimmed: number
}

/**
 * Keeps the first question and drops every ask after it.
 *
 * Trailing questions go whole. A second ask joined onto the first with ", and"
 * is cut at the join, which is safe because everything before the join is
 * already a complete question.
 */
export function oneQuestion(input: string): OneQuestionResult {
  const text = input ?? ''
  if (!text.includes('?')) return { text, trimmed: 0 }

  // Never touch anything inside a fenced block or a table row — a table cell can
  // legitimately hold a question mark, and code is not prose.
  if (/^\s*(?:\||```)/m.test(text) && text.split('?').length > 2) {
    // Tables are common in these replies; only operate on the trailing prose.
    const lastBlockEnd = Math.max(text.lastIndexOf('\n|'), text.lastIndexOf('```'))
    if (lastBlockEnd > -1) {
      const head = text.slice(0, lastBlockEnd)
      const tailStart = text.indexOf('\n', lastBlockEnd + 1)
      if (tailStart === -1) return { text, trimmed: 0 }
      const tail = text.slice(tailStart)
      const done = oneQuestion(tail)
      return { text: head + text.slice(lastBlockEnd, tailStart) + done.text, trimmed: done.trimmed }
    }
  }

  let trimmed = 0

  // 1. Drop everything after the first question mark, when what follows
  //    contains another one. Anything after a question is either a second ask
  //    or a trailing pleasantry, and both are better gone.
  const first = text.indexOf('?')
  const rest = text.slice(first + 1)
  let out = rest.includes('?') ? text.slice(0, first + 1) : text
  if (out !== text) trimmed += rest.split('?').length - 1

  // 2. Cut a second ask hung off the first with ", and …".
  const q = out.lastIndexOf('?')
  if (q > -1) {
    const question = out.slice(0, q)
    const join = SECOND_ASK.exec(question)
    if (join && join.index > 12) {
      out = `${question.slice(0, join.index).trimEnd()}?${out.slice(q + 1)}`
      trimmed += 1
    }
  }

  return { text: out, trimmed }
}
