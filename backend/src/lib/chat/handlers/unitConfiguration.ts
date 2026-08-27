import type { ChatTopicHandler } from '../handlerContext'
import { prisma } from '../../db'
import { unverified } from '../../factPresentation'

/**
 * "What sizes / layouts / how many balconies does X have?"
 *
 * The branch this replaces read `(u as any)?.balconies_count`. That column does
 * not exist — UnitType.balconies does — so the expression was always undefined
 * and the fallback beside it fired on every single request:
 *
 *     : (u.bhk >= 3 ? '3 Balconies' : '2 Balconies')
 *
 * Every balcony count this product has ever shown a buyer was derived from the
 * bedroom count, not from data. Alongside it the handler invented per-BHK prose
 * describing balconies nobody had recorded ("sit-out deck overlooking greens",
 * "wrap-around corner balcony"), fell back to literal area ranges
 * ('980–1,150 sq.ft', '1,480–1,750 sq.ft') when a unit had no measurement, and
 * closed every answer with "All floor plans strictly conform to sanctioned UP
 * RERA carpet area norms" — a compliance assertion made about every project
 * regardless of what we hold.
 *
 * Everything below reads from UnitType. A missing measurement shows a dash, and
 * the one derived figure — carpet from super area — is labelled as an estimate
 * rather than presented as a measurement.
 */

const NOT_RECORDED = '—'

/** carpet ÷ super. Only used when the real carpet figure is absent. */
const CARPET_RATIO = 0.7

function sqft(value: number | null | undefined): string {
  return value == null ? NOT_RECORDED : `${value.toLocaleString('en-IN')} sq.ft`
}

function price(min: number | null, max: number | null): string {
  if (min == null) return NOT_RECORDED
  return max != null && max > min ? `₹${min}–${max} Cr` : `₹${min} Cr`
}

export const unitConfigurationHandler: ChatTopicHandler = {
  id: 'unit_configuration',
  description: 'Unit sizes, carpet area, balconies and layout per configuration',

  // Declines a multi-topic message so the generic grounded answer can
  // cover every part of it — see singleTopic in chat-router.ts.
  matches: ctx =>
    ctx.flags.singleTopic === true &&
    ctx.flags.isConfigurationQuery === true &&
    ctx.flags.isCompareRequest !== true &&
    ctx.flags.hasSingleNamedProject === true,

  handle: async ctx => {
    const named = Array.isArray(ctx.intent.projectNames) ? String(ctx.intent.projectNames[0] ?? '') : ''
    if (!named) return false

    const project = await prisma.project.findFirst({
      where: {
        OR: [
          { name: { contains: named, mode: 'insensitive' } },
          { slug: { contains: named, mode: 'insensitive' } },
        ],
      },
      include: { unit_types: { orderBy: { bhk: 'asc' } } },
    })

    if (!project) return false // the unknown-project path handles this properly

    const units = project.unit_types
    if (units.length === 0) {
      ctx.send('token', {
        token: `### Configurations — ${project.name}\n\n${unverified('unit configurations', project.name)}`,
      })
      ctx.emitUiState({
        stage: 'RESEARCH',
        thinking: `Configurations not on record for ${project.name}:`,
        chips: [],
        missingFields: ['unit_types'],
        confidence: 'LOW',
      })
      ctx.send('done', { sessionId: ctx.sessionId, intentState: 'SHORTLISTED', intent: ctx.intent, responseMode: 'chat' })
      ctx.res.end()
      return
    }

    // If the buyer named a configuration, lead with just that one — answering
    // "what's the 3 BHK like" with every layout in the project buries it.
    const askedBhk = ctx.message.match(/(\d)\s*bhk/i)?.[1]
    const focus = askedBhk ? units.find(u => u.bhk === Number(askedBhk)) : undefined

    let lead = ''
    if (focus) {
      const carpet = focus.carpet_area_sqft
        ? sqft(focus.carpet_area_sqft)
        : focus.super_area_sqft
          ? `${Math.round(focus.super_area_sqft * CARPET_RATIO).toLocaleString('en-IN')} sq.ft (estimated from super area)`
          : NOT_RECORDED
      const detail: string[] = [
        `- **Super area:** ${sqft(focus.super_area_sqft)}`,
        `- **Carpet area:** ${carpet}`,
        `- **Balconies:** ${focus.balconies != null ? focus.balconies : NOT_RECORDED}`,
        `- **Bathrooms:** ${focus.bathrooms != null ? focus.bathrooms : NOT_RECORDED}`,
        `- **Price:** ${price(focus.price_min_cr, focus.price_max_cr)}`,
      ]
      if (focus.has_study) detail.push('- Includes a study')
      if (focus.has_servant_room) detail.push('- Includes a servant room')
      if (focus.utility_room) detail.push('- Includes a utility room')
      if (focus.unit_orientations?.length) {
        detail.push(`- **Orientations available:** ${focus.unit_orientations.join(', ')}`)
      }
      lead = `**${focus.name || `${focus.bhk} BHK`}**\n\n${detail.join('\n')}\n\n`
    }

    const rows = units.map(u => {
      const carpet = u.carpet_area_sqft
        ? sqft(u.carpet_area_sqft)
        : u.super_area_sqft
          ? `${Math.round(u.super_area_sqft * CARPET_RATIO).toLocaleString('en-IN')} sq.ft (est.)`
          : NOT_RECORDED
      const balconies = u.balconies != null ? String(u.balconies) : NOT_RECORDED
      return `| **${u.name || `${u.bhk} BHK`}** | ${u.bhk} | ${sqft(u.super_area_sqft)} | ${carpet} | ${balconies} | ${price(u.price_min_cr, u.price_max_cr)} |`
    }).join('\n')

    const anyEstimated = units.some(u => !u.carpet_area_sqft && u.super_area_sqft)
    const anyMissing = units.some(u => u.balconies == null || u.super_area_sqft == null)

    const text = `### Configurations — ${project.name}

${lead}| Configuration | BHK | Super area | Carpet area | Balconies | Price |
| :--- | :--- | :--- | :--- | :--- | :--- |
${rows}
${anyEstimated ? '\nCarpet areas marked (est.) are derived from super area, not measured — confirm against the sanctioned floor plan.' : ''}${anyMissing ? '\nA dash means we have not captured that measurement for the configuration.' : ''}`

    ctx.send('token', { token: text })
    ctx.emitUiState({
      stage: 'RESEARCH',
      thinking: `Configurations for ${project.name}:`,
      chips: [
        { id: `chip_fp_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'View floor plans', icon: 'layers', analyticsId: 'chip_fp', priority: 1, payload: { text: `Show floor plans for ${project.name}` } },
        { id: `chip_cost_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'Cost & EMI', icon: 'calculator', analyticsId: 'chip_cost', priority: 2, payload: { text: `Show cost sheet and EMI for ${project.name}` } },
        { id: `chip_am_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'Amenities', icon: 'shield-check', analyticsId: 'chip_am', priority: 3, payload: { text: `What amenities are in ${project.name}?` } },
      ],
      missingFields: anyMissing ? ['unit_measurements'] : [],
      // An estimated carpet area is not a measurement.
      confidence: anyEstimated || anyMissing ? 'MEDIUM' : 'HIGH',
    })
    ctx.send('done', { sessionId: ctx.sessionId, intentState: 'SHORTLISTED', intent: ctx.intent, responseMode: 'chat' })
    ctx.res.end()
  },
}
