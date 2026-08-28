// backend/src/lib/discovery/adaptiveChips.ts
//
// Follow-up chips derived from what the answer actually contained, in code.
//
// Chips used to be a second model call: the conversation was handed back to an
// LLM with "predict the buyer's next question". That is the expensive way and
// the lossy way at once. It was the last remaining per-turn model call on a
// lookup turn and roughly a quarter of that turn's cost, spent on three
// suggestion buttons — and the model was guessing at what its own answer had
// said, from a transcript, having already forgotten the structure.
//
// We do not have to guess. By the time chips are built we know exactly what the
// buyer is looking at: which projects were in the table we rendered, which
// sectors were compared, whether a payment schedule or a cost sheet was shown,
// and which intent fields are still empty. Chips built from that are cheaper,
// instant, deterministic, and more accurate than a model re-reading its own
// output — a chip can name a project that is genuinely on screen, because we
// put it there.
//
// The rule this encodes: a chip is only worth a tap if it goes somewhere the
// buyer can see they want to go. "Payment plans for ACE Parkway" is a next step.
// "Tell me more" is a shrug.

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
 * Deep-dive actions for a named project, in the order a buyer actually asks
 * them: what does it cost in full, how do I pay for it, is it legally clean.
 */
function projectChips(name: string, startPriority: number): ChipAction[] {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30)
  return [
    chip(
      `deep_cost_${slug}`,
      'TEXT_MESSAGE',
      `Full cost of ${name}`,
      { text: `Show the complete cost breakdown for ${name}, including charges and taxes.` },
      startPriority,
    ),
    chip(
      `deep_plan_${slug}`,
      'TEXT_MESSAGE',
      `Payment plans for ${name}`,
      { text: `What payment plans does ${name} offer?` },
      startPriority + 1,
    ),
    chip(
      `deep_rera_${slug}`,
      'TEXT_MESSAGE',
      `Is ${name} RERA clean?`,
      { text: `Show the RERA registration and legal status for ${name}.` },
      startPriority + 2,
    ),
  ]
}

/**
 * The chips for this turn.
 *
 * Ordered most-specific first: a project the buyer is looking at beats a sector,
 * which beats a generic prompt to narrow the search. Truncated to three, because
 * a row of chips the buyer has to read is not a shortcut.
 */
export function buildAdaptiveChips(ctx: AnsweredContext): ChipAction[] {
  const out: ChipAction[] = []
  const seen = new Set<string>()
  const push = (c: ChipAction) => {
    if (seen.has(c.label.toLowerCase())) return
    seen.add(c.label.toLowerCase())
    out.push(c)
  }

  // One project in focus: everything the buyer can ask about it next.
  if (ctx.focusedProject?.name) {
    for (const c of projectChips(ctx.focusedProject.name, 1)) push(c)
  }

  // A shortlist on screen: the first move is comparing two of them, then
  // opening the one at the top.
  if (out.length < MAX_CHIPS && ctx.projects.length >= 2) {
    const [a, b] = ctx.projects
    push(
      chip(
        'adaptive_compare',
        'TEXT_MESSAGE',
        `Compare ${a.name} and ${b.name}`,
        { text: `Compare ${a.name} and ${b.name} — price, possession, builder and the trade-offs.` },
        1,
      ),
    )
    push(projectChips(a.name, 2)[0])
  }

  // A sector comparison: the natural next question is what is actually for sale
  // in the one they were pointed at.
  if (out.length < MAX_CHIPS && ctx.rendered === 'sector-comparison' && ctx.sectors.length >= 2) {
    for (const s of ctx.sectors.slice(0, 2)) {
      push(
        chip(
          `adaptive_sector_${s.toLowerCase().replace(/\W+/g, '_')}`,
          'TEXT_MESSAGE',
          `What's for sale in ${s}`,
          { text: `Show me projects available in ${s} with prices and possession dates.` },
          3,
        ),
      )
    }
  }

  // A payment schedule was shown: the money question that follows it.
  if (out.length < MAX_CHIPS && ctx.rendered === 'payment') {
    push(
      chip('adaptive_emi', 'TEXT_MESSAGE', 'What would my EMI be?', {
        text: 'Calculate the monthly EMI for this property.',
      }, 4),
    )
  }

  // A cost sheet was shown: the part of it buyers most often miss.
  if (out.length < MAX_CHIPS && ctx.rendered === 'cost') {
    push(
      chip('adaptive_statutory', 'TEXT_MESSAGE', 'Stamp duty and GST on this', {
        text: 'Break down the stamp duty, registration and GST I would pay on this purchase.',
      }, 4),
    )
  }

  // A market table with nothing chosen yet: help them narrow it.
  if (out.length < MAX_CHIPS && ctx.rendered === 'micro-market' && ctx.projects.length === 0) {
    push(
      chip('adaptive_narrow', 'TEXT_MESSAGE', 'Show me what fits my budget', {
        text: 'Show me projects that fit my budget, with prices and possession.',
      }, 5),
    )
  }

  // Still short: ask for the one missing field that unlocks the most. Budget
  // first — it constrains everything else — then configuration, then place.
  if (out.length < MAX_CHIPS) {
    const asks: Array<[string, string, string]> = [
      ['budgetMax', 'Set my budget', 'My budget is around 1.5 crore.'],
      ['bhk', 'I need a 3 BHK', 'I am looking for a 3 BHK.'],
      ['sector', 'Which sector suits me?', 'Which Noida sector suits my needs best?'],
    ]
    for (const [field, label, text] of asks) {
      if (out.length >= MAX_CHIPS) break
      if (!ctx.missingFields.includes(field)) continue
      push(chip(`adaptive_ask_${field}`, 'TEXT_MESSAGE', label, { text }, 6))
    }
  }

  return out.slice(0, MAX_CHIPS)
}
