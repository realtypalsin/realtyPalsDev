// backend/src/lib/chat/handlers/commuteShortlist.ts
//
// The buyer named where they work. Answer with where to live.
//
// This is the turn the funnel used to die on. Measured on a 15-turn production
// run, "central noida, sector 63 noida in particular for office" produced:
//
//   "It is a business district, not a residential sector. I can't pull the cost
//    sheet or availability right now — connect with our advisory team..."
//
// A workplace is the strongest signal a buyer gives, because it converts an
// open-ended search into a ranked one. `commuteAnchor` has already moved it out
// of the search filters and handed back the residential belt; this renders the
// belt against inventory we actually hold, with cards, and asks them to pick a
// sector — which is the rung between "I want to buy" and a project card.

import { prisma } from '../../db'
import type { ChatTopicHandler } from '../handlerContext'
import { renderProjectTable } from '../../ai/marketTable'
import { loadMentionedProjectCards } from '../mentionedProjectCards'

/** Projects per sector in the belt summary, and sectors in the belt. */
const PER_SECTOR = 3
const MAX_SECTORS = 4

export const commuteShortlistHandler: ChatTopicHandler = {
  id: 'commute-shortlist',
  description: 'Buyer named their workplace — rank residential sectors by commute and shortlist inventory',

  // Only when the anchor was detected on THIS turn and no specific sector has
  // been chosen yet. Once the buyer picks a sector, the ordinary sector and
  // discovery paths own the turn — this handler exists to get them to that
  // choice, not to keep answering after it.
  matches: ctx => {
    const workplace = (ctx.intent as { workplace?: string }).workplace
    const belt = (ctx.intent as { workplace_belt?: string[] }).workplace_belt
    return Boolean(workplace) && Array.isArray(belt) && belt.length > 0 && !ctx.intent.sector
  },

  handle: async ctx => {
    const workplace = String((ctx.intent as { workplace?: string }).workplace)
    const belt = ((ctx.intent as { workplace_belt?: string[] }).workplace_belt ?? []).slice(0, MAX_SECTORS)
    const bhk = ctx.intent.bhk?.[0]
    const budgetMax = ctx.intent.budgetMax

    // Inventory in the belt, filtered by whatever the buyer has already told us.
    // Belt order is commute order, so the grouping below preserves it.
    const rows = await prisma.project.findMany({
      where: {
        sector: { in: belt, mode: 'insensitive' },
        ...(budgetMax != null ? { price_min_cr: { lte: budgetMax } } : {}),
        ...(bhk != null ? { unit_types: { some: { bhk } } } : {}),
      },
      select: {
        id: true, name: true, sector: true, status: true,
        price_min_cr: true, price_range_label: true,
        builder: { select: { name: true } },
      },
      orderBy: [{ price_min_cr: 'asc' }],
    })

    // Nothing in the belt within their constraints. Decline rather than
    // widening silently — the generic path can ask about budget, and inventing
    // a commute answer over an empty result is what this handler exists to
    // stop.
    if (rows.length === 0) {
      console.log('[CHAT:COMMUTE_SHORTLIST] no inventory in belt', { workplace, belt, bhk, budgetMax })
      return false
    }

    const bySector = new Map<string, typeof rows>()
    for (const sector of belt) {
      const inSector = rows.filter(r => (r.sector ?? '').toLowerCase() === sector.toLowerCase())
      if (inSector.length) bySector.set(sector, inSector.slice(0, PER_SECTOR))
    }

    const constraint = [
      bhk != null ? `${bhk} BHK` : null,
      budgetMax != null ? `under ₹${budgetMax} Cr` : null,
    ].filter(Boolean).join(' ')

    const lines: string[] = [
      `### Living near ${workplace}`,
      '',
      `${workplace} is a commercial sector, so the question is which residential belt gives you the shortest daily run into it. ` +
      `Ranked by commute convenience, with ${constraint || 'inventory'} we hold in each:`,
      '',
    ]

    let rank = 1
    for (const [sector, projects] of bySector) {
      const names = projects.map(p => p.name).join(', ')
      lines.push(`**${rank}. ${sector}** — ${projects.length} option${projects.length === 1 ? '' : 's'} on record: ${names}`)
      rank += 1
    }

    const absent = belt.filter(s => !bySector.has(s))
    if (absent.length) {
      lines.push('', `_We hold nothing matching in ${absent.join(', ')} — that is a gap in our records, not a statement that nothing is being built there._`)
    }

    // One table across the belt, cheapest first, so the buyer can compare
    // before committing to a sector.
    const shortlist = rows.slice(0, 6)
    const table = renderProjectTable(shortlist as never)
    if (table) lines.push('', table)

    lines.push('', `Which belt suits you — or shall I pull the full comparison for the closest one?`)

    const cards = await loadMentionedProjectCards(shortlist.map(p => ({ id: p.id, name: p.name })))
    if (cards.length > 0) {
      ctx.send('properties', {
        exactResults: cards,
        nearbyResults: [],
        expansion: null,
        renderTarget: 'both',
      })
    }

    ctx.send('token', { token: lines.join('\n') })
    ctx.emitUiState({
      stage: 'SHORTLISTED',
      thinking: `Ranked residential sectors by commute to ${workplace}`,
      chips: [...bySector.keys()].slice(0, 3).map((sector, i) => ({
        id: `chip_belt_${sector.replace(/\s+/g, '_')}_${Date.now()}`,
        actionType: 'TEXT_MESSAGE',
        label: `Show ${sector}`,
        icon: 'building',
        analyticsId: 'chip_commute_belt',
        priority: i + 1,
        payload: { text: `Show me ${ctx.intent.bhk?.[0] ?? 3} BHK projects in ${sector}` },
      })),
      missingFields: [],
      confidence: 'HIGH',
    })
    ctx.send('done', { sessionId: ctx.sessionId, intentState: 'SHORTLISTED', intent: ctx.intent, responseMode: 'chat' })
    return true
  },
}
