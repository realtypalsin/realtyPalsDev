/** Normalize Hindi/Hinglish real estate queries to clean English before LLM processing. */

const LAKH_RE = /(\d+(?:\.\d+)?)\s*(?:lakh|lac|lakhs|लाख)/gi
const CRORE_RE = /(\d+(?:\.\d+)?)\s*(?:crore|cr|crores|करोड़|karod)/gi

const TERM_MAP: [RegExp, string][] = [
  // Transaction type
  [/\b(dikhao|dikha do|dikha|show karo|dikh[ao]+)\b/gi, 'show me'],
  [/\b(chahiye|chahie|chahiye mujhe|mujhe chahiye)\b/gi, 'I need'],
  [/\b(kitna|kitne|how much hai)\b/gi, 'how much'],
  [/\b(acha|achha|theek hai|theek)\b/gi, 'ok'],
  // Property types
  [/\b(ghar|makan|makaan|gharr)\b/gi, 'house'],
  [/\b(flat|flet)\b/gi, 'flat'],
  [/\b(kamra|kamre|room)\b/gi, 'room'],
  // Status
  [/\b(rtm|rtr|ready[\s-]to[\s-]move|rtm property)\b/gi, 'ready to move'],
  [/\b(uc|under[\s-]construction|under construction wala)\b/gi, 'under construction'],
  [/\b(naya|new launch|nayi)\b/gi, 'new launch'],
  // Purpose
  [/\b(investment ke liye|invest karna hai|investment wala)\b/gi, 'for investment'],
  [/\b(rehne ke liye|rehna hai|end use|self use)\b/gi, 'for self use'],
  // Location hints
  [/\b(sector\s*(\d+))\b/gi, 'Sector $2'],
  [/\b(noida expressway)\b/gi, 'Noida Expressway'],
  // Common filler removals
  [/\b(please|pls|plz|bhai|yaar|ji)\b/gi, ''],
]

/** Convert Indian number shorthand to crore float string. */
function normalizeNumbers(input: string): string {
  // ₹X lakh → "X lakh in crore" before crore conversion
  let out = input.replace(LAKH_RE, (_, n) => {
    const crore = (parseFloat(n) / 100).toFixed(2)
    return `${crore} crore`
  })
  // Ensure crore suffix is standardized (already crore or becomes crore)
  out = out.replace(CRORE_RE, (_, n) => `${parseFloat(n).toFixed(2)} crore`)
  // X000 → Xk → plain number (e.g., "50k sqft" not money)
  // Only convert k→000 when it looks like area, not budget
  // (leave budget k values alone since they'd be too small for crore anyway)
  return out
}

export function normalizeQuery(input: string): string {
  let out = input.trim()

  // Number normalization first (lakh/crore)
  out = normalizeNumbers(out)

  // Term substitution
  for (const [pattern, replacement] of TERM_MAP) {
    out = out.replace(pattern, replacement)
  }

  // Clean up extra whitespace
  out = out.replace(/\s{2,}/g, ' ').trim()

  return out
}
