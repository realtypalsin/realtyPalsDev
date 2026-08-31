// backend/src/lib/discovery/adaptiveChips.ts

import { chip, type ChipAction } from './conversationEngine'
import { buildTopicChips } from './topicChips'

/** What the turn put in front of the buyer. */
export interface AnsweredContext {
  /** Projects in the rendered table or cards, in display order. */
  projects: Array<{ id?: string; name: string }>
  /** Sectors the answer was about — compared, searched or named. */
  sectors: string[]
  /** Which table we rendered, if any. Drives the "go deeper" chips. */
  rendered: 'projects' | 'micro-market' | 'sector-comparison' | 'payment' | 'cost' | 'city-shelf' | 'yield' | null
  /** Intent fields still unset, from the conversation engine. */
  missingFields: string[]
  /** True when the answer was about one specific project. */
  focusedProject?: { id?: string; name: string } | null
  /**
   * What the buyer actually asked. The topic fallback needs it, and without it
   * this file can only ever describe what it drew — which is why five of ten
   * audited turns had no usable chips at all.
   */
  userMessage?: string
  /** For the topic fallback's wording. Defaults are safe for Noida-only V1. */
  city?: string
  hasBudget?: boolean
}

const MAX_CHIPS = 3

/**
 * The floor. Two, not three: three chips filled out of a topic table on a turn
 * that rendered nothing would be padding, and padding is the thing that reads as
 * a bot. Two real follow-ups is a choice.
 */
const MIN_CHIPS = 2

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
  const sector = (ctx.sectors ?? [])[0]
  const projects = ctx.projects ?? []
  const missingFields = ctx.missingFields ?? []

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
  //
  // Two things were wrong here and both came from naming projects[0].
  //
  // "Full cost of <first card>" is a guess about which of eight the buyer cares
  // about, and it is wrong seven times out of eight. The UI has had a dropdown
  // chip for this the whole time — MessageBubble renders any chip whose payload
  // carries more than one project as a picker — and nothing ever populated it.
  //
  // "Compare A and B" duplicated the compare control already on the card
  // ribbon, and picked the two projects for the buyer as well. Removed: a chip
  // that repeats a button next to it spends one of only three slots.
  if (projects.length >= 2) {
    const pickable = projects.filter((p) => p.id).slice(0, 8).map((p) => ({ id: p.id!, name: p.name }))

    if (pickable.length >= 2) {
      offer('money', chip(
        'adaptive_pick_cost', 'TEXT_MESSAGE', `Cost breakdown for ${pickable[0]?.name || 'projects'}`,
        {
          text: `Show the complete cost breakdown, including charges and taxes, for ${pickable[0]?.name || 'the shortlisted projects'}.`,
          projects: pickable,
          actionPrefix: 'Show the complete cost breakdown, including charges and taxes, for',
          actionSuffix: '.',
        }, 2,
      ))
      offer('place', chip(
        'adaptive_pick_plan', 'TEXT_MESSAGE', `Payment plan for ${pickable[0]?.name || 'projects'}`,
        {
          text: `Show the full payment schedule and offers for ${pickable[0]?.name || 'the shortlisted projects'}.`,
          projects: pickable,
          actionPrefix: 'Show the full payment schedule for',
          actionSuffix: '.',
        }, 2,
      ))
    } else {
      // One identified project among them: name it rather than offer a
      // dropdown with a single entry.
      const a = projects[0]
      if (a?.name) {
        offer('money', chip(
          `deep_cost_${slug(a.name)}`, 'TEXT_MESSAGE', `Full cost of ${a.name}`,
          { text: `Show the complete cost breakdown for ${a.name}, including charges and taxes.` }, 2,
        ))
      }
    }

    // About the SET, not about one card — the one question a picker cannot ask.
    offer('trust', chip(
      'adaptive_shortlist_risk', 'TEXT_MESSAGE', 'Which of these is the safest bet?',
      { text: 'Of the projects you just showed me, which builder has the most reliable delivery record, and what should worry me about the others?' }, 2,
    ))
  }

  /**
   * The citywide band shelf.
   *
   * The shelf deliberately refuses to crown one project, so the follow-up it
   * owes the buyer is the narrowing it declined to guess at. Three bands, three
   * chips — this is the one turn where the chips ARE the answer's second half,
   * and offering "full cost of <first card>" instead would be answering a
   * question the shelf just explained nobody can answer yet.
   */
  if (ctx.rendered === 'city-shelf') {
    offer('money', chip('shelf_band_under1', 'TEXT_MESSAGE', 'Under ₹1 Cr',
      { text: 'Show me the best projects under 1 crore, with the reason for each and its main trade-off.' }, 1))
    offer('compare', chip('shelf_band_mid', 'TEXT_MESSAGE', '₹1–2 Cr',
      { text: 'Show me the best projects between 1 and 2 crore, with the reason for each and its main trade-off.' }, 1))
    offer('place', chip('shelf_band_premium', 'TEXT_MESSAGE', 'Above ₹2 Cr',
      { text: 'Show me the best projects above 2 crore, with the reason for each and its main trade-off.' }, 1))
  }

  // ── A sector comparison ────────────────────────────────────────────────────
  // The natural follow-up is what is actually for sale in the one they were
  // pointed at.
  if (ctx.rendered === 'sector-comparison' && (ctx.sectors ?? []).length >= 2) {
    const s = (ctx.sectors ?? [])[0]
    offer('place', chip(
      `adaptive_sector_${slug(s)}`, 'TEXT_MESSAGE', `What's for sale in ${s}`,
      { text: `Show me projects available in ${s} with prices and possession dates.` }, 3,
    ))
  } else if (sector && projects.length > 0) {
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
  if (ctx.rendered === 'micro-market' && projects.length === 0) {
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
    if (!missingFields.includes(field)) continue
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

  /**
   * The floor: never fewer than MIN_CHIPS, and never a row of pure filters.
   *
   * The old ending returned `[]` here, which was the right call given what this
   * file could see — one orphan "I need a 3 BHK" after a flood-risk answer is
   * worse than silence. But an empty row is what scored 1/5 and 2/5 across half
   * the audited shapes, and the reason was never that there was nothing worth
   * offering. It was that this file cannot see the question. `topicChips` can.
   *
   * The ask axis no longer counts toward the floor on its own: a filter is a
   * request for input, not a follow-up, and three of them in a row is the form
   * the chat is supposed to replace.
   */
  const substantive = out.filter((c) => c.tone !== 'ask').length
  if (out.length < MIN_CHIPS || substantive === 0) {
    const topical = buildTopicChips(
      ctx.userMessage ?? '',
      {
        sector,
        projectName: ctx.focusedProject?.name ?? ctx.projects[0]?.name ?? null,
        hasBudget: Boolean(ctx.hasBudget),
        city: ctx.city ?? 'Noida',
      },
      MAX_CHIPS - out.length,
      seen,
    )
    for (const c of topical) {
      if (out.length >= MAX_CHIPS) break
      push(c)
    }
  }

  return out
}
