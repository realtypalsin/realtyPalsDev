// backend/src/lib/ai/sanitizeOutput.ts

import { oneQuestion } from './oneQuestion'

/** Emoji, pictographs, dingbats, and the variation selector that follows them. */
const EMOJI =
  /[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{2460}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{1F1E6}-\u{1F1FF}\u{200D}]/gu

/** Portals we neither cite nor name. */
const PLATFORMS =
  /\b(99acres|magicbricks|magic bricks|nobroker|no broker|housing\.com|proptiger|square ?yards|makaan|commonfloor|olx|quikr|zillow|realtor\.com)\b/gi

/**
 * A whole sentence that sends the buyer off the platform to verify something.
 *
 * Prompt rule 17 forbids this and the model did it anyway — "always verify
 * current status and RERA filings at up-rera.in" closed a Sector 150 answer —
 * because the URL guard had `up-rera.in` on its allow-list. Both are fixed, but
 * a prompt rule is a request and a guard runs after the fact; this runs on the
 * bytes, so it is the one that cannot be talked out of.
 *
 * The whole sentence goes, not just the domain: deleting the address alone
 * leaves "always verify current status and RERA filings at ." behind.
 */
/**
 * Bounded by newlines as well as sentence terminators.
 *
 * The first version used `[^.!?]*` on both sides, which crosses line breaks.
 * A ranked answer whose list items ended in newlines rather than full stops
 * therefore had the ENTIRE list swallowed: "Show me 3BHK in Sector 150 under
 * 2 crore" came back as one sentence plus the replacement, with nine projects
 * deleted from between them. Measured 31 Aug.
 *
 * A sentence never spans a line break in this output, so `\n` belongs in both
 * character classes. The cost of being wrong here is silent deletion of real
 * content, which is worse than leaving a referral in.
 */
/**
 * Anchored to a sentence boundary, so the replacement can never land mid-word.
 *
 * Measured live, in an answer about 2 BHK options in Sector 168:
 *
 *   "For under-construction propertYou can follow this project's verified RERA
 *    standing and construction timeline on its project page."
 *
 * `[^.!?\n]*` starts wherever the engine can first reach the keyword, and when
 * an upstream trim had already removed the terminator that began the sentence,
 * that position was inside a word. The reader sees a typo in the middle of our
 * own reassurance sentence, which undermines the sentence.
 *
 * The lookbehind requires the match to begin at the start of the text or just
 * after a sentence terminator or newline. A referral we therefore fail to
 * rewrite is left intact, which is the safe direction — a stray referral is a
 * rule violation, a spliced word is visible corruption.
 */
const OFFPLATFORM_REFERRAL =
  /(?<=^|[.!?\n]\s{0,3})[^.!?\n]*\b(?:up-?rera\.in|rera\.up\.gov\.in|the\s+(?:state\s+)?rera\s+(?:portal|website)|builder'?s?\s+(?:own\s+)?website|google)\b[^.!?\n]*[.!?]?\s*/gi

/**
 * What replaces it: the same reassurance, pointed at our own page.
 *
 * Leading space, and a paragraph break is added back below when the removed
 * sentence began one. Without that the replacement fused onto the previous
 * sentence — measured 31 Aug, an answer read "…in Sector 150.You can follow
 * this project's…" — because the referral was usually its own paragraph and
 * the regex consumed the newline in front of it.
 */
const ONPLATFORM_REFERRAL =
  "You can follow this project's verified RERA standing and construction timeline on its project page."

/**
 * Source labels we are willing to print, and the one everything else becomes.
 *
 * Two lanes disagreed about citations and the buyer saw the argument. Prompt
 * rule 16 in `prompts/base.ts` forbids them; `groundedAnswer.ts` SHAPE rule 2
 * asked for "the publication or site name" — so web-grounded answers printed
 * "(Web sources)", "(Reddit r/noida)" and "(Purvanchal Projects Blog)". The
 * fourth leak in the 30 Aug audit, "(market listings)", was THIS FILE: the
 * PLATFORMS pass rewrites a named portal to that phrase, and when the portal
 * was already inside a parenthetical the replacement became the citation.
 *
 * The resolution is not "no attribution" — showing where a fact came from is
 * the reasoning-shown principle CLAUDE.md asks for. It is a closed set: our own
 * rows, the statute, or the market. A blog's name tells a buyer nothing except
 * that we scraped one.
 */
const ALLOWED_CITATION_RE =
  /^\s*(?:realtypals(?:\s+data)?|our\s+data|verified(?:\s+data)?|market\s+data|rera|up-?rera)\s*$/i

/** The label an outside source collapses to. */
const MARKET_CITATION = '(market data)'

/**
 * Nouns and shapes that make a parenthetical a source attribution rather than
 * an aside.
 *
 * A list of what a citation IS, not what it is not — same reasoning as
 * `toolBlindGuard`'s PROJECT_WORD. The alternative is inferring from
 * capitalisation, and "(Ground floor units only)" is Title Case too.
 */
const CITATION_PARENTHETICAL =
  /\((?=[^()]{2,70}\))[^()]*?\b(?:web|websites?|sources?|sourced|listings?|blogs?|forums?|reddit|quora|youtube|twitter|news|newspapers?|articles?|reports?|portals?|media|press|magazines?|times|express|tribune|hindu|mint|moneycontrol|economictimes|hindustan|wikipedia|search\s+results?|internet|online|[\w-]+\.(?:com|in|org|net|co\.in))\b[^()]*\)/gi

/**
 * Sentences whose subject is the model's own provenance.
 *
 * Measured live on the yield turn: below a table computed from our own rows, the
 * reply added "Based on general knowledge (not a live search), sector-level gross
 * residential rental yields in Noida typically range 2.5% – 3.5%." Three things
 * wrong in one sentence — it narrates its own retrieval status, it asserts a
 * range we did not supply, and it contradicts the measured figures directly
 * above it. A buyer reading both has no way to tell which we stand behind.
 *
 * The whole sentence goes, not the preamble: trimming "Based on general
 * knowledge," leaves the ungrounded range standing and looking sourced. This is
 * the one case where deleting more is the safer edit.
 *
 * Narrow by design. It matches a clause ABOUT the answer's origin, never an
 * honest statement about our data — "we don't hold that", "this is not recorded"
 * and "we have not verified this" all survive, and they must.
 */
const PROVENANCE_NARRATION =
  /[^.!?\n]*\b(?:based\s+on\s+(?:my\s+)?(?:general\s+knowledge|training\s+data|internal\s+knowledge)|from\s+my\s+training(?:\s+data)?|as\s+an?\s+(?:ai|language\s+model)|not\s+a\s+live\s+(?:search|lookup)|without\s+(?:a\s+)?live\s+(?:search|data|lookup)|i\s+(?:do\s+not|don'?t)\s+have\s+(?:live|real[- ]time)\s+access)\b[^.!?\n]*[.!?]?\s*/gi

/** Attribution scaffolding left behind once the platform name is removed. */
const DANGLING_ATTRIBUTION = [
  /\((?:source|via|per|from)\s*[:\-—]?\s*\)/gi,
  /\bas (?:reported|listed) (?:on|by)\s*[,.]?/gi,
  /\baccording to\s*[,.]/gi,
  /\(\s*\)/g,
]

export interface SanitizeResult {
  text: string
  strippedEmoji: number
  strippedPlatforms: number
  /** Off-platform "go and verify" sentences rewritten to point at our own page. */
  redirectedOffPlatform: number
  /** Outside-source citations collapsed to the single market label. */
  normalizedCitations: number
  /** Sentences narrating the model's own provenance, removed whole. */
  strippedProvenance: number
  /** Guarantees we are not in a position to make, softened to what is true. */
  softenedOverPromises: number
  /** Extra asks removed so the reply closes with exactly one question. */
  trimmedQuestions: number
}

/**
 * Promises no one at RealtyPals can keep.
 *
 * Measured, on a question about Godrej Woods' registration: "This provides
 * buyers with complete regulatory transparency, statutory legal protections,
 * and guaranteed adherence to delivery timelines under UP RERA." Registration
 * guarantees no delivery timeline — it creates a disclosure obligation and a
 * complaint route. Every delayed and litigated project in our own rows is RERA
 * registered, which is the clearest possible refutation of the sentence.
 *
 * Softened rather than deleted: the surrounding sentence is built around the
 * claim and reads as broken without it, and the honest version of the claim is
 * genuinely useful to a buyer.
 */
const OVER_PROMISE: Array<[RegExp, string]> = [
  [/\bguarantee(?:s|d|ing)?\s+(?:the\s+)?(?:adherence\s+to\s+)?(?:on[- ]time\s+)?(?:delivery|possession|handover|completion)(?:\s+timelines?)?/gi,
    'creates a disclosure obligation on delivery timelines'],
  // Registration is a disclosure regime, not a warranty. Observed live:
  // "guarantees regulatory compliance and legal transparency" — a claim about
  // the builder's future conduct, made from the existence of a number.
  [/\bguarantee(?:s|d|ing)?\s+(?:you\s+)?(?:full\s+|complete\s+|total\s+)?(?:regulatory\s+)?(?:compliance|transparency|protection|accountability|oversight|security)/gi,
    'brings statutory disclosure and a complaint route'],
  [/\b(?:guarantees?|guaranteed|assures?|assured|ensures?|ensured)\s+(?:you\s+)?(?:a\s+|an\s+)?(?:\d+%\s+)?(?:returns?|appreciation|capital\s+appreciation|rental\s+yield|profits?)/gi,
    'is no guarantee of a'],
  [/\b(?:zero|no)\s+risk\b/gi, 'lower risk'],
  [/\bfully\s+(?:safe|secure|protected)\b/gi, 'covered by the statutory protections'],
  [/\bwill\s+(?:definitely|certainly|surely)\s+(?:appreciate|deliver|be\s+delivered)/gi,
    'is expected to, though we cannot promise it,'],
]

/** Softens any guarantee we cannot make, and counts what it softened. */
function softenOverPromises(input: string): { text: string; count: number } {
  let count = 0
  const text = OVER_PROMISE.reduce(
    (acc, [re, replacement]) => acc.replace(re, () => { count += 1; return replacement }),
    input,
  )
  return { text, count }
}

/**
 * Collapse every outside-source parenthetical to one label, and drop it when it
 * would repeat the label already on the line.
 *
 * Runs before the PLATFORMS pass so a portal named inside a parenthetical is
 * handled as the citation it is, rather than substituted into one.
 */
function normalizeCitations(input: string): { text: string; count: number } {
  // This deleted every source parenthetical outright, including the
  // "(market data)" and "(verified data)" labels it is supposed to collapse TO —
  // which left `ALLOWED_CITATION_RE` and `MARKET_CITATION` dead and made a
  // Noida-wide average read as though it were verified for the project in hand.
  // CLAUDE.md's market tier requires the qualifier every time; an unlabelled
  // market figure is the fact-tier failure the tiers exist to prevent.
  CITATION_PARENTHETICAL.lastIndex = 0
  let count = 0
  const text = input.replace(CITATION_PARENTHETICAL, (match) => {
    // A parenthetical naming one of our own sources keeps its label as written.
    const inner = match.slice(1, -1)
    if (ALLOWED_CITATION_RE.test(inner)) return match
    count += 1
    return MARKET_CITATION
  })
  if (count === 0) return { text: input, count: 0 }
  return {
    // Two adjacent outside citations on one line collapse to one label rather
    // than stuttering "(market data) (market data)".
    text: text
      .replace(/(\(market data\))(?:\s*\(market data\))+/gi, '$1')
      .replace(/[ \t]{2,}/g, ' '),
    count,
  }
}

/** Strips emoji, third-party platform names, and off-platform referrals. */
export function sanitizeOutput(input: string): SanitizeResult {
  if (!input) {
    return { text: input, strippedEmoji: 0, strippedPlatforms: 0, redirectedOffPlatform: 0, normalizedCitations: 0, strippedProvenance: 0, softenedOverPromises: 0, trimmedQuestions: 0 }
  }

  const strippedEmoji = (input.match(EMOJI) ?? []).length
  const strippedPlatforms = (input.match(PLATFORMS) ?? []).length
  const redirectedOffPlatform = (input.match(OFFPLATFORM_REFERRAL) ?? []).length
  // Citations are counted by the pass itself — the regex matches allowed labels
  // too, and only the pass knows which of those it left alone.
  const citations = normalizeCitations(input)
  const strippedProvenance = (input.match(PROVENANCE_NARRATION) ?? []).length
  const softened = softenOverPromises(input)
  const asks = oneQuestion(input)
  if (
    strippedEmoji === 0 &&
    strippedPlatforms === 0 &&
    redirectedOffPlatform === 0 &&
    citations.count === 0 &&
    strippedProvenance === 0 &&
    softened.count === 0
  ) {
    return { text: input, strippedEmoji: 0, strippedPlatforms: 0, redirectedOffPlatform: 0, normalizedCitations: 0, strippedProvenance: 0, softenedOverPromises: 0, trimmedQuestions: 0 }
  }

  let text = citations.text.replace(EMOJI, '')
  if (strippedProvenance > 0) text = text.replace(PROVENANCE_NARRATION, '')
  // Before the platform pass: the referral sentence may name a portal too, and
  // replacing the name first would leave "market listings" inside a sentence
  // that is about to be removed wholesale anyway.
  if (redirectedOffPlatform > 0) {
    // Keep whatever separated the removed sentence from what came before it,
    // so the replacement lands as its own sentence rather than fused to the
    // previous one.
    text = text.replace(OFFPLATFORM_REFERRAL, (match, ...rest) => {
      const offset = rest[rest.length - 2] as number
      const before = text.slice(0, offset)
      const sep = /\n\s*$/.test(before) ? '' : before && !/\s$/.test(before) ? ' ' : ''
      return `${sep}${ONPLATFORM_REFERRAL} `
    })
  }
  // "market listings" rather than deletion: a sentence built around a source
  // becomes ungrammatical if the source simply vanishes.
  text = text.replace(PLATFORMS, 'market listings')
  // Again, because the pass above CREATES citations: "(99acres)" carries no
  // source noun of its own and survives the first sweep, then becomes
  // "(market listings)" here. That was the fourth leak in the audit, and it is
  // ours. One re-run is cheaper than teaching the first sweep every portal name.
  if (softened.count > 0) text = softenOverPromises(text).text
  // Last, so it sees the text every other pass has finished with.
  if (asks.trimmed > 0) text = oneQuestion(text).text
  const secondPass = normalizeCitations(text)
  text = secondPass.text
  for (const re of DANGLING_ATTRIBUTION) text = text.replace(re, '')

  text = text
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ +([,.;:])/g, '$1')
    .replace(/^[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')

  return {
    text,
    strippedEmoji,
    strippedPlatforms,
    redirectedOffPlatform,
    softenedOverPromises: softened.count,
    trimmedQuestions: asks.trimmed,
    normalizedCitations: citations.count + secondPass.count,
    strippedProvenance,
  }
}

/** True when the text would survive sanitising unchanged. Used by tests. */
export function isClean(text: string): boolean {
  // Regexes carry lastIndex when global; reset before every use or a second
  // call on the same string answers from where the previous one stopped.
  EMOJI.lastIndex = 0; PLATFORMS.lastIndex = 0; OFFPLATFORM_REFERRAL.lastIndex = 0
  return (
    !EMOJI.test(text) &&
    !PLATFORMS.test(text) &&
    !OFFPLATFORM_REFERRAL.test(text) &&
    normalizeCitations(text).count === 0 &&
    (PROVENANCE_NARRATION.lastIndex = 0, !PROVENANCE_NARRATION.test(text))
  )
}
