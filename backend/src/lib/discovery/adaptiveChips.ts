// backend/src/lib/discovery/adaptiveChips.ts

import { chip, type ChipAction } from './conversationEngine'

/** What the turn put in front of the buyer. */
export interface AnsweredContext {
  /** Projects in the rendered table or cards, in display order. */
  projects: Array<{ id?: string; name: string }>
  /** Sectors the answer was about — compared, searched or named. */
  sectors: string[]
  /** Which table we rendered, if any. Drives the "go deeper" chips. */
  rendered: 'projects' | 'micro-market' | 'sector-comparison' | 'payment' | 'cost' | null
  /** Intent fields still unset, from the conversation engine. */
  missingFields: string[]
  /** True when the answer was about one specific project. */
  focusedProject?: { id?: string; name: string } | null
}

const MAX_CHIPS = 3

/**
 * What a chip is *about*, as opposed to what it names.
 *
 * The first version of this file ranked chips by usefulness and took the top
 * three, which is how a buyer looking at six projects was offered "Compare A
 * and B", "Full cost of A" and "Payment plans for A" — three taps, one
 * project, one subject. Ranking cannot see that, because each chip is
 * individually reasonable.
 *
 * So the set is built one chip per axis instead. Whatever else changes, three
 * chips are now three different questions.
 */
type Axis = NonNullable<ChipAction['tone']>

/** Axes in the order a buyer usually wants them. */
const AXIS_ORDER: Axis[] = ['compare', 'money', 'trust', 'place', 'ask']

const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30)

export function buildAdaptiveChips(ctx: AnsweredContext): ChipAction[] {
  /** Candidates per axis, best first. Only the first of each is ever used. */
  const byAxis = new Map<Axis, ChipAction[]>()
  const offer = (axis: Axis, c: ChipAction) => {
    const list = byAxis.get(axis) ?? []
    // The axis travels with the chip: the UI colours and ices it by kind, so a
    // row of three reads as three different choices at a glance.
    list.push({ ...c, tone: axis })
    byAxis.set(axis, list)
  }

  const focus = ctx.focusedProject?.name
  const sector = ctx.sectors[0]

  // ── One project in view ────────────────────────────────────────────────────
  // Three questions about it, not three of the same question: what it costs,
  // whether it is clean, and what else it is up against.
  if (focus) {
    offer('money', chip(
      `deep_cost_${slug(focus)}`, 'TEXT_MESSAGE', `Full cost of ${focus}`,
      { text: `Show the complete cost breakdown for ${focus}, including charges and taxes.` }, 1,
    ))
    offer('trust', chip(
      `deep_rera_${slug(focus)}`, 'TEXT_MESSAGE', `Is ${focus} RERA clean?`,
      { text: `Show the RERA registration and legal status for ${focus}.` }, 1,
    ))
    offer('compare', chip(
      `deep_alt_${slug(focus)}`, 'TEXT_MESSAGE',
      sector ? `Alternatives in ${sector}` : `What competes with ${focus}?`,
      {
        text: sector
          ? `What other projects in ${sector} compete with ${focus}, and how do they differ?`
          : `Which projects compete with ${focus}, and how do they differ?`,
      }, 1,
    ))
  }

  // ── A shortlist on screen ──────────────────────────────────────────────────
  if (ctx.projects.length >= 2) {
    const [a, b] = ctx.projects
    offer('compare', chip(
      'adaptive_compare', 'TEXT_MESSAGE', `Compare ${a.name} and ${b.name}`,
      { text: `Compare ${a.name} and ${b.name} — price, possession, builder and the trade-offs.` }, 2,
    ))
    offer('money', chip(
      `deep_cost_${slug(a.name)}`, 'TEXT_MESSAGE', `Full cost of ${a.name}`,
      { text: `Show the complete cost breakdown for ${a.name}, including charges and taxes.` }, 2,
    ))
    offer('trust', chip(
      'adaptive_shortlist_risk', 'TEXT_MESSAGE', 'Which of these is the safest bet?',
      { text: 'Of the projects you just showed me, which builder has the most reliable delivery record, and what should worry me about the others?' }, 2,
    ))
  }

  // ── A sector comparison ────────────────────────────────────────────────────
  // The natural follow-up is what is actually for sale in the one they were
  // pointed at.
  if (ctx.rendered === 'sector-comparison' && ctx.sectors.length >= 2) {
    const s = ctx.sectors[0]
    offer('place', chip(
      `adaptive_sector_${slug(s)}`, 'TEXT_MESSAGE', `What's for sale in ${s}`,
      { text: `Show me projects available in ${s} with prices and possession dates.` }, 3,
    ))
  } else if (sector && ctx.projects.length > 0) {
    offer('place', chip(
      `adaptive_area_${slug(sector)}`, 'TEXT_MESSAGE', `What's ${sector} like to live in?`,
      { text: `What is ${sector} like to live in — metro access, schools, hospitals, and the local downsides?` }, 3,
    ))
  }

  // ── A table we rendered, followed up on its own terms ───────────────────────
  if (ctx.rendered === 'payment') {
    offer('money', chip('adaptive_emi', 'TEXT_MESSAGE', 'What would my EMI be?',
      { text: 'Calculate the monthly EMI for this property.' }, 1))
  }
  if (ctx.rendered === 'cost') {
    offer('money', chip('adaptive_statutory', 'TEXT_MESSAGE', 'Stamp duty and GST on this',
      { text: 'Break down the stamp duty, registration and GST I would pay on this purchase.' }, 1))
  }
  if (ctx.rendered === 'micro-market' && ctx.projects.length === 0) {
    offer('place', chip('adaptive_narrow', 'TEXT_MESSAGE', 'Show me what fits my budget',
      { text: 'Show me projects that fit my budget, with prices and possession.' }, 3))
  }

  // ── Still unknown about the buyer ──────────────────────────────────────────
  // Budget first: it constrains everything else. Then configuration, then place.
  const asks: Array<[string, string, string]> = [
    ['budgetMax', 'Set my budget', 'My budget is around 1.5 crore.'],
    ['bhk', 'I need a 3 BHK', 'I am looking for a 3 BHK.'],
    ['sector', 'Which sector suits me?', 'Which Noida sector suits my needs best?'],
  ]
  for (const [field, label, text] of asks) {
    if (!ctx.missingFields.includes(field)) continue
    offer('ask', chip(`adaptive_ask_${field}`, 'TEXT_MESSAGE', label, { text }, 4))
  }

  // One per axis, in order, until full. A repeated label is dropped rather than
  // shown twice under different ids.
  const out: ChipAction[] = []
  const seen = new Set<string>()
  const push = (c: ChipAction): boolean => {
    const key = c.label.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    out.push(c)
    return true
  }

  for (const axis of AXIS_ORDER) {
    if (out.length >= MAX_CHIPS) break
    for (const c of byAxis.get(axis) ?? []) if (push(c)) break
  }

  /**
   * A single chip is worse than none.
   *
   * When nothing was on screen to talk about, only the "ask" axis fires, and it
   * contributes one chip — measured over 120 turns, **39 of them offered "I
   * need a 3 BHK" and nothing else**. A lone filter reads as the product having
   * run out of ideas, and it is nonsense after "what is the RERA number". So
   * when the ask axis is all we have, let it give the buyer a real choice
   * between the things we still do not know about them.
   */
  if (out.length === 1) {
    for (const c of byAxis.get('ask') ?? []) {
      if (out.length >= MAX_CHIPS) break
      push(c)
    }
  }

  // Still alone, and no second question worth asking: offer nothing. An empty
  // row is honest; one orphan chip is not.
  return out.length === 1 && out[0].tone === 'ask' ? [] : out
}
