// backend/src/lib/ai/stateBrief.ts
//
// What the assistant already knows about this buyer, as a few lines for the
// prompt.
//
// `buildGeneralConversationalPrompt` took `{userMessage, webContext, city,
// hasVerifiedData}` — no intent, no focus project, no history. So the general
// lane was stateless, and on a 15-turn production run that produced the two
// worst answers in it:
//
//   T10  "tell me about the first one"  -> an essay about Jewar Airport, because
//                                          nothing told it what had been listed
//   T13  "what are the negatives"       -> generic Noida risks, closing with
//                                          "leaning toward Sector 150?" — a
//                                          question the buyer had answered six
//                                          turns earlier by naming Sector 63
//
// CLAUDE.md already requires this ("Persistent memory within a session,
// referenced naturally... use them, don't just store them"). The data was
// stored and never passed.

export interface ConversationState {
  budgetMinCr?: number | null
  budgetMaxCr?: number | null
  bhk?: number[] | null
  sector?: string | null
  /** Where the buyer WORKS — the point to measure commute from, never a filter. */
  workplace?: string | null
  possession?: string | null
  purpose?: string | null
  /** The project the session is anchored on. */
  focusProjectName?: string | null
  /** Projects named or carded on the previous turn, in the order shown. */
  shown?: Array<{ name: string }> | null
  /** Compressed per-topic summaries carried on the session row. */
  summaryLocation?: string | null
  summaryFinancial?: string | null
  summaryTimeline?: string | null
}

const crore = (n: number) => (n >= 1 ? `₹${n} Cr` : `₹${Math.round(n * 100)} L`)

/**
 * The brief, or '' when we genuinely know nothing yet.
 *
 * Empty matters: on the first turn there is no state, and printing a block of
 * "not stated" lines invites the model to open by listing what it does not
 * know, which is the form-filling behaviour the product is trying not to have.
 */
export function buildStateBrief(state: ConversationState): string {
  const facts: string[] = []

  if (state.budgetMaxCr != null && state.budgetMinCr != null) {
    facts.push(`Budget: ${crore(state.budgetMinCr)} to ${crore(state.budgetMaxCr)}`)
  } else if (state.budgetMaxCr != null) {
    facts.push(`Budget: up to ${crore(state.budgetMaxCr)}`)
  } else if (state.budgetMinCr != null) {
    facts.push(`Budget: from ${crore(state.budgetMinCr)}`)
  }

  if (state.bhk?.length) facts.push(`Configuration: ${state.bhk.map((b) => `${b} BHK`).join(' or ')}`)
  if (state.sector) facts.push(`Area they are searching: ${state.sector}`)
  if (state.workplace) {
    facts.push(`Workplace: ${state.workplace} — they commute here daily, so it is the point to measure travel time FROM. They are not buying in ${state.workplace}.`)
  }
  if (state.possession) facts.push(`Possession preference: ${state.possession}`)
  if (state.purpose) {
    facts.push(`Purpose: ${state.purpose === 'investment' ? 'investment' : state.purpose === 'endUse' ? 'self-use' : state.purpose}`)
  }
  if (state.focusProjectName) facts.push(`Project currently in focus: ${state.focusProjectName}`)
  if (state.shown?.length) {
    facts.push(`Projects shown on the previous turn, in order: ${state.shown.map((p, i) => `${i + 1}. ${p.name}`).join('; ')}`)
  }

  for (const [label, value] of [
    ['Location notes', state.summaryLocation],
    ['Financial notes', state.summaryFinancial],
    ['Timeline notes', state.summaryTimeline],
  ] as Array<[string, string | null | undefined]>) {
    if (value && value.trim()) facts.push(`${label}: ${value.trim().slice(0, 220)}`)
  }

  if (facts.length === 0) return ''

  return [
    '## WHAT YOU ALREADY KNOW ABOUT THIS BUYER',
    ...facts.map((f) => `- ${f}`),
    '',
    'Use it. Two rules follow from this block and both were being broken:',
    '- **Never ask for something listed above.** Asking a buyer which sector they prefer, after they have told you, reads as not listening and is the fastest way to lose them.',
    '- **Resolve back-references against it.** "the first one", "the second option", "these", "it" refer to the list above — answer about that project, and never treat the phrase itself as the name of something to look up.',
  ].join('\n')
}
