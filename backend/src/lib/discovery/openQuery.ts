/**
 * Open-query detection.
 *
 * The rest of the taxonomy in queryClassifier.ts assumes the user is shopping for
 * a property. A large class of real questions is not: "which sector do the richest
 * people live in", "tell me about Investors Clinic", "who founded Elite Group".
 * Those used to fail open to DISCOVERY and came back as property cards.
 *
 * This module recognises them and says what kind of grounding they need. It never
 * answers anything itself — groundedAnswer.ts does that.
 */

export type OpenTopic =
  | 'SECTOR_PROFILE' // who lives where / which area suits which buyer class
  | 'ENTITY'         // a company, builder, brokerage or person we may not hold
  | 'GENERAL'        // real-estate question with no property-search shape

export interface OpenQueryDetection {
  topic: OpenTopic
  /** Subject of an ENTITY lookup, cleaned. Absent for the other topics. */
  entity?: string
  reason: string
}

/** Buyer-class / demographic vocabulary — the "who lives here" family of questions. */
const DEMOGRAPHIC_RE =
  /\b(rich|richest|wealthy|wealthiest|affluent|posh|poshest|elite|upscale|hnw|high[- ]net[- ]worth|millionaires?|middle[- ]class|lower[- ]middle|upper[- ]class|working[- ]class|budget[- ]conscious|celebrities|politicians|bureaucrats|expats?|nris?)\b/i

/** Verbs that turn a demographic noun into a "where do they live" question. */
const RESIDENCE_RE =
  /\b(live|lives|living|reside|resides|residing|settle|settled|stay|prefer|prefers|preferred|buy|buys|buying|move|moving|located|concentrated)\b/i

const AREA_NOUN_RE = /\b(sector|sectors|area|areas|locality|localities|neighbourhood|neighborhood|micro[- ]market|part of|pocket)\b/i

/** Strongly entity-shaped phrasings. Ordered most specific first. */
const ENTITY_PATTERNS: Array<{ re: RegExp; reason: string }> = [
  {
    re: /(?:who\s+(?:are|is|was|were)\s+(?:the\s+)?(?:founders?|co[- ]founders?|owners?|ceo|promoters?|directors?|md|managing\s+director|chairman|chairperson)\s+of\s+)([^?.,\n]+)/i,
    reason: 'Leadership/ownership lookup',
  },
  {
    re: /\b(?:history|track\s+record|background|credibility|legitimacy|reviews?|complaints?)\s+of\s+([^?.,\n]+)/i,
    reason: 'Company background lookup',
  },
  {
    re: /(?:tell\s+me|know|give\s+me|need|want)\s+(?:more\s+)?(?:about|on)\s+([^?.,\n]+)/i,
    reason: 'Open "tell me about X" lookup',
  },
  {
    re: /^\s*(?:who|what)\s+(?:is|are|was|were)\s+([^?.,\n]+)/i,
    reason: 'Definitional "who/what is X" lookup',
  },
  {
    re: /\bis\s+([^?.,\n]+?)\s+(?:legit|genuine|trustworthy|reliable|a\s+scam|safe\s+to\s+deal\s+with)\b/i,
    reason: 'Trust check on a named party',
  },
]

/** Trailing noise that survives the capture group but is not part of the name. */
const ENTITY_TAIL_RE =
  /\s+(?:in|at|from|for|of)\s+(?:noida|greater\s+noida|noida\s+extension|delhi|ncr|india)\b.*$/i

function cleanEntity(raw: string): string {
  return raw
    .replace(ENTITY_TAIL_RE, '')
    .replace(/^(?:the|a|an)\s+/i, '')
    .replace(/\s+(?:please|exactly|briefly)$/i, '')
    .replace(/["'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60)
}

/** A "name" that is really us, or the user, or nothing at all. */
const OWN_RECORD_RE = /^(?:noida|greater\s+noida|noida\s+extension|realtypals|you|this\s+project|the\s+project|this|that|it)$/i

/**
 * Property attributes that survive the "what is X" capture but are not names.
 * "What is the payment plan" is a DRILLDOWN about the project in context, not a
 * question about a company called Payment Plan.
 */
const ATTRIBUTE_NOUN_RE =
  /\b(payment\s+plan|cost\s+sheet|carpet\s+area|super\s+area|price|pricing|rate|emi|stamp\s+duty|gst|amenit|possession|rera|floor\s+plan|layout|maintenance|parking|brochure|loan|down\s+payment|booking\s+amount|circle\s+rate|budget|status)\b/i

/**
 * Inventory vocabulary. "Tell me about 3BHK properties" is a search phrased as a
 * question — the discovery pipeline owns it, and answering it here would trade
 * real listings for prose.
 */
const INVENTORY_NOUN_RE =
  /\b(\d\s*bhk|bhk|propert(?:y|ies)|flats?|apartments?|homes?|houses?|villas?|plots?|units?|listings?|societ(?:y|ies)|projects?|builders?|developers?|group)\b/gi

const FILLER_WORD_RE = /\b(the|a|an|and|of|in|for|some|any|good|best|new|top)\b/gi

/**
 * Price, size and superlative terms. Their presence means the user is shopping,
 * whatever the sentence shape — the discovery and ranking paths own those.
 * Checked after the demographic branch, which is a question about people rather
 * than a filter and legitimately says things like "affordable".
 */
const SHOPPING_VOCAB_RE =
  /\b(best|top|cheapest|costliest|affordable|budget|under|below|within|over|above|between|crore|cr|lakh|lac|\d\s*bhk|bhk|sq\.?\s?ft|per\s+sqft)\b/i

/**
 * True when nothing survives after removing generic vocabulary — i.e. the capture
 * was a category, not a name.
 *
 * Word-level rather than a plain keyword test on purpose: half the developers in
 * NCR are named "<Something> Properties", "<Something> Homes" or "<Something>
 * Group", and rejecting on the generic half alone would drop every one of them.
 */
function isGenericPhrase(entity: string): boolean {
  const residue = entity
    .replace(INVENTORY_NOUN_RE, ' ')
    .replace(FILLER_WORD_RE, ' ')
    .replace(/[\d.,%₹-]/g, ' ')
    .trim()
  return residue.length < 3
}

/** Sector references answer from sector_intelligence, not from a company lookup. */
const SECTOR_NAME_RE = /^sector\s*\d+/i

/**
 * Classify a message as an open question, or return null to leave it to the
 * property taxonomy.
 *
 * `hasProjectNames` comes from intent extraction: if the extractor already tied
 * the message to a project in our database, the existing DRILLDOWN path is the
 * right owner and we stay out of the way.
 */
export function detectOpenQuery(
  userMessage: string,
  hasProjectNames: boolean,
): OpenQueryDetection | null {
  const msg = (userMessage || '').trim()
  if (msg.length < 3) return null

  // 1. "Where do the rich / middle class live" — answerable from sector_intelligence.
  if (DEMOGRAPHIC_RE.test(msg) && (RESIDENCE_RE.test(msg) || AREA_NOUN_RE.test(msg))) {
    return { topic: 'SECTOR_PROFILE', reason: 'Demographic + residence/area question' }
  }

  if (hasProjectNames) return null

  // Shopping vocabulary anywhere in the message disqualifies the entity patterns.
  // "What are the best projects under 1.5 crore in Sector 62?" matches the
  // "what is X" shape and would otherwise be looked up as a company named
  // "best projects under 1.5 crore".
  if (SHOPPING_VOCAB_RE.test(msg)) return null

  // 2. Named third party we may not hold — brokerage, builder, person.
  for (const { re, reason } of ENTITY_PATTERNS) {
    const match = msg.match(re)
    if (!match?.[1]) continue
    const entity = cleanEntity(match[1])
    if (entity.length < 3) continue
    // "tell me about sector 150" is a sector question, not a company one.
    if (SECTOR_NAME_RE.test(entity)) {
      return { topic: 'SECTOR_PROFILE', reason: 'Sector profile via "about" phrasing' }
    }
    if (OWN_RECORD_RE.test(entity) || ATTRIBUTE_NOUN_RE.test(entity) || isGenericPhrase(entity)) continue
    return { topic: 'ENTITY', entity, reason }
  }

  return null
}

/** Signals that the user is shopping, not asking. Used to decide the fail-open lane. */
export function hasPropertySearchSignal(intent: Record<string, unknown>): boolean {
  const bhk = intent.bhk
  return Boolean(
    (Array.isArray(bhk) && bhk.length > 0) ||
      intent.budgetMin ||
      intent.budgetMax ||
      intent.sector ||
      intent.possession ||
      (Array.isArray(intent.projectNames) && intent.projectNames.length > 0),
  )
}
