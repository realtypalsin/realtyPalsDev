import assert from 'node:assert/strict'

/**
 * A softened claim still has to be a sentence.
 *
 * The rewriter that shipped before this helper produced
 *
 *   "This is no guarantee of a over five years."
 *
 * and every test passed, because each one asserted only that the banned word
 * had gone. That is the whole lesson: **a test on a rewriter has to assert what
 * it produces, not only what it removes.**
 *
 * The checks below are the shapes a verb-phrase swap leaves behind when its
 * object is a list or a clause — each one observed in real output:
 *
 *   stranded preposition  "…is no guarantee of a over five years"
 *   doubled replacement   "This is on record and is on record as filed with…"
 *   trailing connective   "…the authority and"
 *   welded replacement    "…still saving.I can't see the status"
 */
export function assertReadsAsProse(text: string): void {
  const t = text.trim()

  // An article or preposition left dangling where the object used to be.
  assert.ok(
    !/\b(?:of|to|for|with|on|in|as)\s+(?:a|an|the)\s+(?:over|while|and|before|after|under)\b/i.test(t),
    `stranded preposition: ${t}`,
  )

  // The same replacement spliced twice into one sentence.
  for (const phrase of ['on record with the authority', 'is on record', 'lowers the risk']) {
    const doubled = new RegExp(`${phrase}[^.!?]*${phrase}`, 'i')
    assert.ok(!doubled.test(t), `doubled "${phrase}": ${t}`)
  }

  // A sentence must not end on a connective.
  assert.ok(
    !/\b(?:and|or|but|with|of|for|to|while)\s*[.!?]?\s*$/i.test(t),
    `ends on a connective: ${t}`,
  )

  // A replacement welded to the end of the preceding word.
  assert.ok(
    !/[a-z](?:Registration puts|Past prices|That lowers|I can't see)/.test(t),
    `welded replacement: ${t}`,
  )
}
