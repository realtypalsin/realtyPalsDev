// backend/src/lib/ai/inferenceProfile.ts
//
// What each turn is allowed to spend, chosen from the shape of the question.
//
// The cost model here is not the obvious one. At verified Gemini pricing
// (gemini-3.6-flash: $0.75 in / $3.75 out per 1M) a typical turn looks like:
//
//   input  10,346 tokens, 78% served from the implicit cache at 10% of rate
//          → (2,251 × 0.75 + 8,095 × 0.075) / 1e6  =  $0.0023
//   output  ~1,300 tokens including thinking, all at full rate
//          → 1,300 × 3.75 / 1e6                    =  $0.0049
//
// Output is roughly two thirds of the bill, and the single largest line inside
// it is thinking — a 1,024-token budget is $0.0038 a turn on its own, more than
// the entire input side. Shrinking the prompt was optimising the smaller half.
//
// So the levers, in order of what they actually save:
//
//   1. Thinking budget. Free for a lookup, decisive for a four-sector compare.
//   2. Model tier. Flash-Lite is 2.5x cheaper in and 1.5x cheaper out, and is
//      indistinguishable on questions that are really retrieval.
//   3. Reply length. A ceiling, never a target — see the prompt's own rule.
//   4. Input tokens. Real, but already 70% mitigated by the implicit cache.
//
// Nothing here changes an answer that needed the reasoning. The profiles that
// cut thinking to zero are the ones where thinking was never doing anything:
// a head term, a typo, a brand we do not stock.

import { MODELS } from '../config'
import type { InferenceConfig } from './openai'

/**
 * The shapes measured across the 321-query corpus, which is what real Noida
 * demand looks like. See the ## HOW BUYERS ACTUALLY ASK section of the prompt —
 * the two lists describe the same thing and should move together.
 */
export type QueryShape =
  | 'lookup' // head term, typo, brand probe: retrieval, no judgement
  | 'factual' // "which sectors have metro" — a fact plus a little context
  | 'advisory' // "is sector 150 good for investment" — judgement required
  | 'reasoning' // comparisons, multi-constraint budgets: the expensive ones

export interface InferenceProfile extends InferenceConfig {
  shape: QueryShape
  /** Tokens the model may spend thinking. 0 disables thinking entirely. */
  thinkingBudget: number
}

/**
 * Deliberately coarse. Four tiers, and the default is the second-cheapest —
 * a misread costs a slightly thinner answer, never a wrong one, because the
 * prompt's rules about honesty and trade-offs are unaffected by any of this.
 */
const PROFILES: Record<QueryShape, Omit<InferenceProfile, 'shape'>> = {
  // No thinking at all. "2 bhk in noida" and "propertiesinnoida_extaion" are
  // resolved by retrieval; a reasoning budget here buys nothing and costs more
  // than the rest of the turn combined.
  lookup: { model: MODELS.GEMINI_LITE, thinkingBudget: 0, maxTokens: 700 },

  // Enough to organise three facts and a trade-off, on the cheap tier.
  factual: { model: MODELS.GEMINI_LITE, thinkingBudget: 256, maxTokens: 1000 },

  // Judgement questions get the smart model but a modest reasoning budget:
  // "is X good for Y" needs a position, not a plan.
  advisory: { model: MODELS.GEMINI_MAIN, thinkingBudget: 512, maxTokens: 1200 },

  // The queries the product exists for. Four sectors, six constraints, a
  // five-year horizon. Spend here; this is what a buyer came for.
  reasoning: { model: MODELS.GEMINI_MAIN, thinkingBudget: 1024, maxTokens: 1800 },
}

/** Anything that turns a question into a comparison or a multi-constraint brief. */
const REASONING_RE =
  /\bvs\b|\bversus\b|\bcompare\b|\bbetter (than|for)\b|\bwhich (one|is better)\b|\btrade[- ]?offs?\b|\brank\b|\bshortlist\b/i

/** A stated life situation: every clause is a constraint to be answered. */
const SITUATION_RE = /\bi (have|earn|want|need|work|am|would)\b|\bmy (wife|husband|family|budget|office|child)\b/i

/** Judgement vocabulary — asks for a position, not a fact. */
const ADVISORY_RE =
  /^(is|are|should|would|do you|does it|can i|will)\b|\bworth (it|buying)\b|\bgood (for|place|idea)\b|\brisk|\bavoid\b|\brecommend/i

/** A question word, or a superlative. Wants a fact and a little framing. */
const FACTUAL_RE = /^(what|which|where|when|who|how)\b|\bbest\b|\btop\b|\bcheapest\b|\bhighest\b|\baverage\b/i

/**
 * The shape of one message.
 *
 * Order matters and runs most-expensive-first: a comparison that also contains
 * a question word is a comparison. The last rule is the floor, not a guess —
 * anything with no verb and no question word is a search-box phrase.
 */
export function classifyShape(message: string): QueryShape {
  const m = (message || '').trim()
  if (!m) return 'lookup'

  // A long message is doing something a short one is not, whatever its words.
  const words = m.split(/\s+/).length
  if (REASONING_RE.test(m) || SITUATION_RE.test(m) || words > 25) return 'reasoning'
  if (ADVISORY_RE.test(m)) return 'advisory'
  if (FACTUAL_RE.test(m)) return 'factual'
  return 'lookup'
}

/**
 * The inference settings for a message.
 *
 * `force` lets a caller that already knows better — a handler answering from a
 * fixed template, a comparison handler that always reasons — skip the guess.
 */
export function profileFor(message: string, force?: QueryShape): InferenceProfile {
  const shape = force ?? classifyShape(message)
  return { shape, ...PROFILES[shape] }
}

/**
 * What this profile costs per turn at current Gemini pricing, in USD.
 *
 * Exported so the saving is checkable rather than asserted — the test beside
 * this file uses it to prove `lookup` really is cheaper than `reasoning`, and
 * it is the number to re-derive when Gemini's promotional pricing ends on
 * 1 January 2027 and Flash doubles.
 */
export function estimateTurnCostUsd(
  profile: InferenceProfile,
  promptTokens: number,
  cachedTokens: number,
): number {
  const lite = /lite/.test(profile.model ?? '')
  const inRate = lite ? 0.3 : 0.75
  const outRate = lite ? 2.5 : 3.75
  const uncached = Math.max(0, promptTokens - cachedTokens)
  // Assume the reply uses its whole budget: the honest worst case, and the one
  // a capacity plan should be built on.
  const out = profile.thinkingBudget + (profile.maxTokens ?? 0)
  return (uncached * inRate + cachedTokens * inRate * 0.1 + out * outRate) / 1_000_000
}
