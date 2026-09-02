// backend/src/lib/discovery/reference.ts
//
// "Tell me about the first one" and "compare it with the second option".
//
// Measured on a 15-turn production run, both failed and both failed loudly:
//
//   T10  "tell me about the first one"        -> an essay about Jewar Airport
//   T14  "compare it with the second option"  -> "we currently only have ATS
//                                                Nobility in our verified
//                                                records"
//
// Two turns earlier the assistant had named five real projects in its own
// prose. Nothing resolved an ordinal against them, so "the first one" reached
// the entity lookup as the literal string "the first one", missed, and the
// general lane free-associated from an empty context.
//
// `ChatSession.last_projects` already holds the ordered set — it just had no
// reader for ordinal language.

/**
 * Ordinal words a buyer uses for a position in a list they were just shown.
 *
 * No bare numerals. "3" was in this alternation and "show me 3 options" only
 * escaped resolving to the third project because `option` is written plural
 * there and the word boundary failed — accidental, and "give me 2 project"
 * would have matched. An ordinal is written as an ordinal.
 */
const NOUN = '(?:one|option|project|society|choice|pick|listing|result)s?'
const ORDINALS: Array<[RegExp, number]> = [
  [new RegExp(`\\b(?:the\\s+)?(?:1st|first|topmost)\\s+${NOUN}\\b`, 'i'), 0],
  [new RegExp(`\\b(?:the\\s+)?(?:2nd|second)\\s+${NOUN}\\b`, 'i'), 1],
  [new RegExp(`\\b(?:the\\s+)?(?:3rd|third)\\s+${NOUN}\\b`, 'i'), 2],
  [new RegExp(`\\b(?:the\\s+)?(?:4th|fourth)\\s+${NOUN}\\b`, 'i'), 3],
  [new RegExp(`\\b(?:the\\s+)?(?:5th|fifth)\\s+${NOUN}\\b`, 'i'), 4],
  [new RegExp(`\\b(?:the\\s+)?last\\s+${NOUN}\\b`, 'i'), -1],
]

/**
 * A bare ordinal, with the noun left implicit.
 *
 * "tell me about the first", "what about the second" — common, and the noun
 * being absent is exactly why the entity extractor made a name out of it.
 */
const BARE_ORDINALS: Array<[RegExp, number]> = [
  [/\b(?:about|for|on)\s+(?:the\s+)?(?:1st|first)\b/i, 0],
  [/\b(?:about|for|on)\s+(?:the\s+)?(?:2nd|second)\b/i, 1],
  [/\b(?:about|for|on)\s+(?:the\s+)?(?:3rd|third)\b/i, 2],
]

export interface ShownProject {
  id: string
  name: string
}

/**
 * Which of the projects just shown does this message point at?
 *
 * Returns null when the message names no position, which is the common case —
 * a message naming a project outright is resolved by name elsewhere, and
 * guessing a position for it would answer about the wrong building.
 */
export function resolveOrdinalReference(
  message: string,
  shown: readonly ShownProject[],
): { project: ShownProject; index: number } | null {
  if (!shown.length) return null
  const text = (message ?? '').trim()
  if (!text) return null

  for (const [re, idx] of [...ORDINALS, ...BARE_ORDINALS]) {
    if (!re.test(text)) continue
    const index = idx === -1 ? shown.length - 1 : idx
    const project = shown[index]
    // An ordinal past the end of the list refers to nothing. Better to fall
    // through and let the turn ask than to answer about an arbitrary project.
    if (!project) return null
    return { project, index }
  }
  return null
}

/**
 * Every position the message points at — for "compare the first two", or
 * "compare it with the second option" where `it` is the project in focus.
 */
export function resolveOrdinalPair(
  message: string,
  shown: readonly ShownProject[],
  focusId?: string | null,
): ShownProject[] {
  const out: ShownProject[] = []
  const seen = new Set<string>()
  const push = (p?: ShownProject) => {
    if (p && !seen.has(p.id)) { seen.add(p.id); out.push(p) }
  }

  // "compare it with the second" — `it` is whatever the session is focused on.
  if (/\b(?:it|this|that|the\s+(?:current|same)\s+(?:one|project))\b/i.test(message) && focusId) {
    push(shown.find((p) => p.id === focusId))
  }
  if (/\bfirst\s+two\b/i.test(message)) { push(shown[0]); push(shown[1]) }
  if (/\bfirst\s+three\b/i.test(message)) { push(shown[0]); push(shown[1]); push(shown[2]) }

  for (const [re, idx] of ORDINALS) {
    if (!re.test(message)) continue
    push(shown[idx === -1 ? shown.length - 1 : idx])
  }
  return out
}

/**
 * Does this message rely on something shown earlier to mean anything at all?
 *
 * Used to decide that a turn must NOT be handed to the stateless general lane.
 * "the first one" carries no subject of its own; answering it without the list
 * is how a question about a shortlist became an essay about an airport.
 */
export function needsShownContext(message: string): boolean {
  const text = (message ?? '').trim()
  if (!text) return false
  return (
    ORDINALS.some(([re]) => re.test(text)) ||
    BARE_ORDINALS.some(([re]) => re.test(text)) ||
    /\b(?:these|those|them|the\s+(?:above|ones?|shortlist|list|options))\b/i.test(text) ||
    /\bwhich\s+(?:of\s+)?(?:these|those|them)\b/i.test(text) ||
    /\bfirst\s+(?:two|three|four|couple)\b/i.test(text)
  )
}
