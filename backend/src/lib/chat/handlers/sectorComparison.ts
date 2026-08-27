import { prisma } from '../../db'
import { executeWithFallbackChain } from '../../ai/fallbackChain'
import type { ChatTopicHandler } from '../handlerContext'

/**
 * sector-comparison
 *
 * Lifted verbatim from the inline branch in chat-router.ts; only the router
 * locals were rebound to the handler context. The logic is untouched so the
 * extraction can be verified by comparing output against the previous build.
 */
export const sectorComparisonHandler: ChatTopicHandler = {
  id: 'sector-comparison',
  description: 'Sector versus sector on inventory, price and connectivity',

  matches: ctx =>
    ctx.flags.isSectorCompare === true && ctx.sectorMatches.length >= 2,

  handle: async ctx => {
    // ─── SECTOR VS SECTOR COMPARISON ──────────────────────────────────────────
    const s1 = ctx.sectorMatches[0]
    const s2 = ctx.sectorMatches[1]

    // Query deep relations for the two sectors specifically
    const [s1DetailedProjs, s2DetailedProjs] = await Promise.all([
      prisma.project.findMany({
        where: { sector: { contains: s1.replace(/Sector\s*/i, ''), mode: 'insensitive' } },
        include: { unit_types: true, builder: true }
      }),
      prisma.project.findMany({
        where: { sector: { contains: s2.replace(/Sector\s*/i, ''), mode: 'insensitive' } },
        include: { unit_types: true, builder: true }
      })
    ])

    const getStats = (projs: typeof s1DetailedProjs, sName: string) => {
      const prices = projs.flatMap(p => p.unit_types.map(u => u.price_min_cr)).filter(Boolean) as number[]
      const minP = prices.length ? Math.min(...prices) : null
      const maxP = prices.length ? Math.max(...prices) : null
      const readyCount = projs.filter(p => p.status === 'ready_to_move').length
      const topNames = projs.slice(0, 4).map(p => p.name).join(', ')
      return {
        sector: sName,
        totalProjects: projs.length,
        // These stats are fed to the model as "verified facts", so an
        // invented band here is laundered into a confident sentence about a
        // sector comparison. Absent means absent.
        priceRange: minP && maxP ? `₹${minP}–${maxP} Cr` : 'Not recorded',
        readyCount,
        topProjects: topNames || 'Not recorded'
      }
    }

    const s1Stats = getStats(s1DetailedProjs, s1)
    const s2Stats = getStats(s2DetailedProjs, s2)
    const sectorFactsJson = JSON.stringify({ [s1]: s1Stats, [s2]: s2Stats }, null, 2)

    const systemPrompt = `You are RealtyPal, a professional real estate advisor for Noida and Greater Noida.
Verified Sector Database Facts: ${sectorFactsJson}

CRITICAL FORMATTING MANDATE:
- Maintain a clean, executive, professional tone. Do NOT include decorative emojis or icons in headings or text.
- Present the comparison primarily in a clean, high-contrast Markdown Comparison Table.
- Keep every data point super-summarized, concise, and scannable.

OUTPUT STRUCTURE:

### Verdict
1-2 direct sentences stating the overall winner and key distinction between ${s1} and ${s2}.

| Comparison Parameter | ${s1} | ${s2} |
| :--- | :--- | :--- |
| **Average Price / sq.ft** | [Price per sqft range] | [Price per sqft range] |
| **Budget Range** | ${s1Stats.priceRange} | ${s2Stats.priceRange} |
| **Metro & Transit** | [Nearest metro station & road connectivity] | [Nearest metro station & road connectivity] |
| **Livability & Atmosphere** | [Commercial vitality vs. quiet residential, density] | [Commercial vitality vs. quiet residential, density] |
| **Social Infrastructure** | [Malls, schools, parks, convenience] | [Malls, schools, parks, convenience] |
| **Top Landmark Societies** | ${s1Stats.topProjects} | ${s2Stats.topProjects} |
| **Best Suited For** | [Ideal buyer profile] | [Ideal buyer profile] |

### Recommendation
1 actionable decision sentence: "Choose **${s1}** if [profile]; choose **${s2}** if [profile]."`

    const systemMsgHistory = [{ role: 'user' as const, content: ctx.message }]
    const fallbackResult = await executeWithFallbackChain({
      systemPrompt,
      messages: systemMsgHistory,
      send: ctx.send,
      onToolCall: async () => ({}),
      groqFallbackSuffix: '',
      userMessage: ctx.message,
    })

    const sectorChips = [
      { id: `chip_s1_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: `Flats in ${s1}`, icon: 'building', analyticsId: 'chip_s1_search', priority: 1, payload: { text: `Show me 2 BHK and 3 BHK flats in ${s1}` } },
      { id: `chip_s2_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: `Flats in ${s2}`, icon: 'building', analyticsId: 'chip_s2_search', priority: 2, payload: { text: `Show me 2 BHK and 3 BHK flats in ${s2}` } },
      { id: `chip_emi_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'Calculate Monthly EMI', icon: 'calculator', analyticsId: 'chip_emi', priority: 3, payload: { text: 'Calculate EMI' } },
    ]

    ctx.emitUiState({
      stage: 'RESEARCH',
      thinking: `Comparing ${s1} vs ${s2}:`,
      chips: sectorChips,
      missingFields: [],
      confidence: 'HIGH'
    })

    ctx.send('done', {
      sessionId: ctx.sessionId,
      intentState: 'SHORTLISTED',
      intent: ctx.intent,
      responseMode: 'sector_comparison',
    })
    ctx.res.end()
    return true
  },
}
