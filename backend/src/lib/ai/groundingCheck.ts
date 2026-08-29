// backend/src/lib/ai/groundingCheck.ts
//
// Does every figure in the answer appear in the facts we handed the model?
//
// Perplexity's research prompt requires "a citation to every sentence that
// includes information derived from tool outputs", and the OpenAI Agents SDK
// wraps generation in input and output guardrails with a tripwire. We cannot
// ask a buyer-facing answer to carry [1][2] markers — but we can do the check
// those markers exist to make possible, mechanically and after the fact: a
// rupee figure, a date or an area in the answer that appears nowhere in the
// context is a figure the model supplied from memory.
//
// This measures; it does not block. Today's most useful discovery was that our
// own test harness had been scoring an outage as a success, so a detector that
// starts by rejecting answers would be trusting itself before it has earned it.
// `[CHAT:UNGROUNDED]` in the log is the signal, and `groundingRate()` over a
// corpus run is the number to move.

/** Figures a buyer would act on. Prose adjectives are not checked; numbers are. */
const CLAIM_PATTERNS: Array<{ kind: string; re: RegExp }> = [
  // Ranges first, and both ends of them. "₹1.25–1.85 Cr" carries two claims,
  // and only the second is adjacent to the unit — a pattern anchored on ₹
  // followed by the unit sees neither, which is how the first version of this
  // file passed an invented range as grounded.
  { kind: 'rupee_cr', re: /₹?\s?(\d+(?:\.\d+)?)\s*[–—-]\s*₹?\s?\d+(?:\.\d+)?\s*(?:cr|crore)/gi },
  { kind: 'rupee_cr', re: /[–—-]\s*₹?\s?(\d+(?:\.\d+)?)\s*(?:cr|crore)/gi },
  { kind: 'rupee_cr', re: /₹\s?(\d+(?:\.\d+)?)\s*(?:cr|crore)/gi },
  { kind: 'rupee_lakh', re: /₹?\s?(\d+(?:\.\d+)?)\s*[–—-]\s*₹?\s?\d+(?:\.\d+)?\s*(?:lakh|lac)/gi },
  { kind: 'rupee_lakh', re: /[–—-]\s*₹?\s?(\d+(?:\.\d+)?)\s*(?:lakh|lac)/gi },
  { kind: 'rupee_lakh', re: /₹\s?(\d+(?:\.\d+)?)\s*(?:lakh|lac)/gi },
  { kind: 'rupee_psf', re: /₹\s?([\d,]{3,})\s*(?:\/|per\s*)?(?:sq\.?\s?ft|sqft)/gi },
  { kind: 'area', re: /([\d,]{3,})\s*(?:sq\.?\s?ft|sqft|sq\.?\s?m)/gi },
  { kind: 'year', re: /\b(20\d{2})\b/g },
  { kind: 'rera', re: /\b(UPRERA[A-Z0-9]+)\b/gi },
]

/**
 * Figures that are true of every project and need no row to support them.
 *
 * Statutory rates are fixed by UP law — `factPresentation.ts` is the source of
 * truth for them — so flagging "7% stamp duty" as ungrounded would train us to
 * ignore the signal.
 */
const STATUTORY = new Set(['7', '6', '5', '1', '0', '30000', '10000'])

export interface UngroundedClaim {
  kind: string
  value: string
  /** The sentence it appeared in, for the log. */
  context: string
}

const normaliseNumber = (s: string): string => s.replace(/,/g, '').replace(/\.0+$/, '')

/**
 * Claims in `answer` with no support in `context`.
 *
 * `context` is everything the model was given for this turn — the project facts
 * block, any rendered table, the injected market block. A figure is supported
 * when it appears there in any form; the comparison is on the digits, so
 * "₹1.45 Cr" in the answer is matched by "1.45" in the facts.
 */
export function findUngroundedClaims(answer: string, context: string): UngroundedClaim[] {
  if (!answer.trim() || !context.trim()) return []
  const haystack = normaliseNumber(context.toLowerCase())
  const out: UngroundedClaim[] = []
  const seen = new Set<string>()

  for (const { kind, re } of CLAIM_PATTERNS) {
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(answer)) !== null) {
      const raw = m[1]
      const value = normaliseNumber(raw.toLowerCase())
      if (!value || STATUTORY.has(value)) continue
      const key = `${kind}:${value}`
      if (seen.has(key)) continue
      seen.add(key)
      if (haystack.includes(value)) continue

      const at = m.index
      const start = Math.max(0, answer.lastIndexOf('.', at) + 1)
      const end = answer.indexOf('.', at)
      out.push({
        kind,
        value: raw,
        context: answer.slice(start, end === -1 ? Math.min(answer.length, at + 90) : end).trim().slice(0, 140),
      })
    }
  }
  return out
}

/** Share of answers carrying no unsupported figure. The number to move. */
export function groundingRate(
  turns: Array<{ answer: string; context: string }>,
): { rate: number; grounded: number; total: number } {
  const total = turns.length
  if (total === 0) return { rate: 1, grounded: 0, total: 0 }
  const grounded = turns.filter((t) => findUngroundedClaims(t.answer, t.context).length === 0).length
  return { rate: grounded / total, grounded, total }
}

/**
 * Log what the model could not have known, without failing the turn.
 *
 * Arithmetic the model is asked to do — an EMI, a total outflow — legitimately
 * produces figures absent from the context, so this will over-report until the
 * corpus tells us by how much. Measure first, enforce second.
 */
export function reportGrounding(answer: string, context: string, meta: Record<string, unknown> = {}): void {
  const claims = findUngroundedClaims(answer, context)
  if (claims.length === 0) return
  console.warn('[CHAT:UNGROUNDED]', {
    ...meta,
    count: claims.length,
    claims: claims.slice(0, 5).map((c) => `${c.kind}=${c.value} :: ${c.context}`),
  })
}
