import { prisma } from '../../db'
import { findProjectsMentioned, linkProjectNames } from '../../discovery/proseEntities'
import { DEFAULT_CITY } from '../../config/cities'
import type { ChatTopicHandler } from '../handlerContext'

/**
 * Sector orientation for a buyer who does not know the city yet.
 *
 * Answers the question a first-time buyer asks before they have any project in
 * mind — which sector should I even be looking at — and the one a listings
 * portal answers worst, because it has nothing to say until you already know
 * what to search for.
 *
 * It reads SectorIntelligence alongside the projects in those sectors, so the
 * guidance is grounded in inventory we actually hold rather than in general
 * impressions of an area.
 *
 * Lifted verbatim from the inline branch in chat-router.ts; only the router
 * locals were rebound to the handler context. The logic is untouched so the
 * extraction can be verified by comparing output against the previous build.
 */
export const newcomerOrientationHandler: ChatTopicHandler = {
  id: 'newcomer-orientation',
  description: 'Sector orientation for a buyer new to the city',

  matches: ctx => ctx.flags.isNewcomerOrientation === true,

  handle: async ctx => {
    const [sectorsIntel, activeProjects] = await Promise.all([
      prisma.sectorIntelligence.findMany({
        where: { city: { in: ['Noida', 'Greater Noida'] } },
        take: 8,
        orderBy: { avg_price_per_sqft: 'desc' }
      }),
      prisma.project.findMany({
        select: { name: true, sector: true, price_range_label: true, price_min_cr: true },
        take: 30
      })
    ])

    const projsBySector: Record<string, string[]> = {}
    const pricesBySector: Record<string, number[]> = {}
    activeProjects.forEach(p => {
      if (!projsBySector[p.sector]) projsBySector[p.sector] = []
      if (projsBySector[p.sector].length < 3) projsBySector[p.sector].push(p.name)
      if (typeof p.price_min_cr === 'number') {
        (pricesBySector[p.sector] ??= []).push(p.price_min_cr)
      }
    })

    // Real entry price for the sector, from the projects we hold. The fallback
    // used to print an identical "₹0.95–2.50 Cr" band and an identical
    // "Metro access & settled family enclaves" strength for every sector in
    // the table, which told the buyer nothing true about any of them.
    const sectorBand = (sec: string): string => {
      const prices = pricesBySector[sec]
      if (!prices?.length) return 'Not recorded'
      const lo = Math.min(...prices)
      const hi = Math.max(...prices)
      return lo === hi ? `from ₹${lo.toFixed(2)} Cr` : `₹${lo.toFixed(2)}–${hi.toFixed(2)} Cr`
    }
    const sectorProjects = (sec: string): string => projsBySector[sec]?.join(', ') || 'Not recorded'

    let rows = ''
    if (sectorsIntel.length > 0) {
      rows = sectorsIntel.slice(0, 5).map(s => {
        const priceBand = s.avg_price_per_sqft
          ? `₹${Math.round(s.avg_price_per_sqft).toLocaleString('en-IN')}/sq.ft`
          : sectorBand(s.sector)
        const strength = s.sector_strengths?.[0] || s.sector_overview?.slice(0, 70) || 'Not recorded'
        return `| **${s.sector}** (${s.city || 'Noida'}) | ${priceBand} | ${strength} | ${sectorProjects(s.sector)} |`
      }).join('\n')
    } else {
      const uniqueSectors = Array.from(new Set(activeProjects.map(p => p.sector))).slice(0, 5)
      rows = uniqueSectors.map(sec =>
        `| **${sec}** | ${sectorBand(sec)} | Not recorded | ${sectorProjects(sec)} |`
      ).join('\n')
    }

    const rawOrientationText = `### Noida & Greater Noida Locality Guide for Families & Investors\n\n| Micro-Market / Sector | Price Spectrum | Locality Highlights | Top Listed Projects |\n| :--- | :--- | :--- | :--- |\n${rows}\n\n### Recommendation\nFor **metro connectivity and immediate family infrastructure**, prioritize **Sector 75 / 76**. For **expressway corporate commute and modern high-rises**, explore **Sector 137 / 150**.`

    // The "Top Listed Projects" column is real project names read straight from
    // the database. Leaving them as plain text makes the most card-ready moment
    // in the whole guide unclickable.
    let orientationText = rawOrientationText
    try {
      const orientationMentions = await findProjectsMentioned(rawOrientationText, DEFAULT_CITY, 8)
      orientationText = linkProjectNames(rawOrientationText, orientationMentions)
    } catch (e) {
      console.warn('[CHAT:ORIENTATION:LINK_ERROR]', e)
    }

    const orientationChips = [
      { id: `chip_s76_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'Flats in Sector 76', icon: 'building', analyticsId: 'chip_s76', priority: 1, payload: { text: 'Show 2 BHK and 3 BHK flats in Sector 76' } },
      { id: `chip_s137_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'Flats in Sector 137', icon: 'building', analyticsId: 'chip_s137', priority: 2, payload: { text: 'Show 2 BHK and 3 BHK flats in Sector 137' } },
      { id: `chip_compare_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'Compare Sector 76 vs 137', icon: 'arrow-right-left', analyticsId: 'chip_compare_76_137', priority: 3, payload: { text: 'Compare Sector 76 with Sector 137' } },
    ]

    ctx.send('token', { token: orientationText })
    ctx.emitUiState({
      stage: 'RESEARCH',
      thinking: 'Curated sector orientation guide from database:',
      chips: orientationChips,
      missingFields: [],
      confidence: 'HIGH'
    })
    ctx.setCachedResponse(ctx.message, { token: orientationText, chips: orientationChips })
    ctx.send('done', {
      sessionId: ctx.sessionId,
      intentState: 'SHORTLISTED',
      intent: ctx.intent,
      responseMode: 'chat',
    })
    ctx.res.end()
    return true
  },
}
