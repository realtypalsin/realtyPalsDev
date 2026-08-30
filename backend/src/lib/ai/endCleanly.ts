// backend/src/lib/ai/endCleanly.ts
//
// A reply ceiling cuts wherever the token budget runs out, which is routinely
// mid-word or mid-table-row:
//
//   | **Techzone 4** | IT commuters, NRIs | 5,80
//
// Raising the ceilings in inferenceProfile.ts is the actual fix and covers the
// streaming legs, where nothing can be retracted once sent. This is the safety
// net for the buffered path — a tool-blind leg holds its whole answer back so
// the fabrication guard can read it, and that same seam can drop a dangling
// fragment before the buyer ever sees it.
//
// It does not recover the lost content. It removes the broken edge, which is
// the part that reads as a bug rather than as an answer that stopped.

/** Already a clean ending: sentence, list item, closed fence, or table row. */
const ENDS_CLEANLY = /(?:[.!?:)\]"'`]|\|)\s*$/

/** A table row is complete when it opens and closes with a pipe. */
const COMPLETE_ROW = /^\s*\|.*\|\s*$/

/**
 * How much of an answer may be discarded to reach a clean edge.
 *
 * A dangling half-sentence is worth losing. More than half the answer is not —
 * past that the rough edge is the lesser harm, and the raised ceilings mean
 * hitting this at all is rare. The bound matters most on SHORT replies, where
 * one dropped table row is a large fraction of the whole.
 */
const MAX_TRIM_RATIO = 0.5

export function endCleanly(text: string): string {
  const trimmed = text.trimEnd()
  if (!trimmed || ENDS_CLEANLY.test(trimmed)) return text

  const lines = trimmed.split('\n')
  const last = lines[lines.length - 1]

  // Inside a table, the unit is the row: drop a partial one entirely rather
  // than leaving a half-built row the renderer will mangle.
  if (last.trimStart().startsWith('|') && !COMPLETE_ROW.test(last)) {
    const kept = lines.slice(0, -1).join('\n').trimEnd()
    return kept.length >= trimmed.length * MAX_TRIM_RATIO ? kept : text
  }

  // Otherwise the unit is the sentence. Look for the last terminator that is
  // followed by a space or a line break, so a decimal point or an abbreviation
  // mid-number ("₹1.25") is not mistaken for the end of a sentence.
  const lastStop = Math.max(
    trimmed.lastIndexOf('. '),
    trimmed.lastIndexOf('.\n'),
    trimmed.lastIndexOf('! '),
    trimmed.lastIndexOf('?\n'),
    trimmed.lastIndexOf('? '),
    trimmed.lastIndexOf('!\n'),
  )
  if (lastStop <= 0) return text

  const kept = trimmed.slice(0, lastStop + 1)
  return kept.length >= trimmed.length * MAX_TRIM_RATIO ? kept : text
}
