// backend/src/lib/ai/prompts/blocks.ts
import type { Intent, ScoredProject, SectorContext, SectorOverview, NearbyExpansion } from '../../discovery'

// ─── CONDITIONAL FORMAT BLOCKS ────────────────────────────────────────────────
// Injected by buildAdvisorSystemPrompt() based on detected intent.
// Content is identical to the original base.ts format sections — only the
// injection point changed (conditional rather than always-on).

export function buildPropertyResultsFormatBlock(): string {
  return `

---

## RESPONSE FORMAT — SEARCH RESULTS

HARD LIMIT: 15 words. Target: 5–10 words. Must fit one screen without scrolling.

The cards already show: price, builder name, BHK, carpet area, amenity list, possession date, RERA status, sector, and AI recommendations.
NEVER put any of those facts in your text — the user can already see them.
Do not provide a textual recommendation. The recommendation will be shown in the UI cards.

---

### EXACT FORMAT

Just provide a very brief conversational introduction. For example:
"Here are the top matches for your search:" or "I found some great options fitting your criteria:"
Do not include any property names, bullets, or detailed recommendations in your text response.

---

RESPONSE FAILURE — disqualifies the response:
• Any property name, price, builder name, sector name, sqft, BHK count, possession date, RERA status, or amenity name in AI text
• Any recommendation text, pros/cons, or "Best For" sections
• "Quick Picks" section or table
• Bullets, headers, or per-project sections
• Internal field names
• Call-to-action — cards are already visible`
}

export function buildSectorAdvisoryFormatBlock(): string {
  return `

---

## RESPONSE FORMATS — SECTOR ADVISORY

HARD LIMIT: 150 words. One screen.
Answer only: Which sector fits this buyer? Why? What should they do next?
NEVER: geography lectures, metro descriptions unless commute was mentioned, amenity lists, fabricated scores.

| Sector | Best For | Availability | Metro |
|--------|----------|--------------|-------|
| [Name] ← Top Pick | [buyer type, one phrase] | [X RTM / Y UC] | [station or —] |
| [Name] | [buyer type] | [X RTM / Y UC] | [station or —] |

(Max 3 rows. Only sectors the data supports. Skip price column — cards show prices.)

**Why [Top Pick]?** — one sentence. The single deciding factor for this buyer's intent.

"Want me to search [Top Pick] first, or compare all three?"`
}

export function buildComparisonFormatBlock(): string {
  return `

---

## RESPONSE FORMATS — COMPARISON

HARD LIMIT: 150 words. One screen.
The comparison dashboard below already shows: price, possession, RERA, builder, amenities, sqft, BHK, risk ratings. Do not repeat any of it.
Answer only: Who wins and why? Who should choose each? What should the buyer do?

---

🏆 **Verdict**
[Name] — [one sentence: the single deciding reason. Not features — judgment.]

**Why [Winner] wins**

| Dimension | [Project A] | [Project B] | Edge |
|-----------|-------------|-------------|------|
| Builder trust | [signal label] | [signal label] | [name] |
| Delivery risk | Low/Med/High | Low/Med/High | [name or Tie] |
| Value | [positioning label] | [positioning label] | [name or Tie] |

(3 rows max. Omit a row if both projects are equal on that dimension.)

**Best For**
• [Winner] → [buyer type, one phrase]
• [Runner-up] → [buyer type where it is genuinely the better pick]

**Bottom Line**
[One sentence. What should the buyer do?]

*See the comparison dashboard below.*

---

RESPONSE FAILURE — any of the following disqualifies the response:
• Price, possession date, RERA, sqft, BHK, amenity list in AI text
• Paragraphs
• Internal field names
• Fabricated scores`
}

export function buildExpansionBlock(expansion: NearbyExpansion): string {
  const sectorsLabel = expansion.searchedSectors.join(', ')
  return `\n\n## CONSTRAINT EXPANSION — MANDATORY DISCLOSURE
The user requested ${expansion.requestedSector} but no matching inventory exists there.
Results below are NEARBY ALTERNATIVES from ${sectorsLabel}.
YOU MUST begin your response by clearly disclosing this to the user in a highly professional, marketing-oriented tone.
Say something like: "We are currently not serving ${expansion.requestedSector}, but we are continuously evaluating new areas and will be expanding our verified intelligence there soon! In the meantime, we have curated some exceptional premium options in nearby areas like ${sectorsLabel} that you might love."
NEVER present these results as ${expansion.requestedSector} properties.
Ensure the tone is welcoming and matches how a premium real estate marketing person would communicate.`
}

// Strip characters that could affect system prompt structure.
// Legitimate project names never contain these characters.
function sanitizeProjectName(name: string): string {
  return name.replace(/["\\`\n\r]/g, '').replace(/#{1,6}\s/g, '').slice(0, 100)
}

function serializeProjects(projects: ScoredProject[]): string {
  return projects.map((p, i) => {
    const bhkOptions = [...new Set(p.unit_types.map((u) => `${u.bhk}BHK`))].join(', ')
    const carpets = p.unit_types.filter((u) => u.carpet_area_sqft).map((u) => u.carpet_area_sqft!)
    const minC = carpets.length ? Math.min(...carpets) : null
    const maxC = carpets.length ? Math.max(...carpets) : null
    const carpetRange = minC != null ? (maxC != null && maxC > minC ? `${minC}–${maxC}` : `${minC}`) : 'N/A'
    const amenityNames = p.top_amenities.map((a) => a.name).join(', ') || 'N/A'
    const connNames = p.top_connectivity.map((c) =>
      c.distance_km ? `${c.name} (${c.distance_km}km)` : c.name
    ).join(', ') || 'N/A'

    // Derive possession status sentinel — makes provenance explicit to the AI.
    // RTM = OC already issued (fact). UC/new_launch = builder-claimed date only.
    const possessionStatus = p.status === 'ready_to_move'
      ? 'DELIVERED — occupancy certificate issued, project is handed over'
      : p.status === 'new_launch'
        ? 'SPECULATIVE — new launch, no confirmed possession date'
        : p.possession_label
          ? 'BUILDER_CLAIMED_DATE — not independently verified; check up-rera.in for RERA-registered completion date'
          : 'NOT_PROVIDED'

    console.log(`[INTELLIGENCE:SERIALIZED] ${p.name}:`, {
      has_rec_tier:    !!(p.recommendation_profile?.tier),
      has_thesis:      !!(p.decision_profile?.decision_thesis),
      has_persona:     !!(p.persona_profile?.primary_persona),
      competitor_count: (p.competitors?.length ?? 0),
    })
    return JSON.stringify({
      id: i + 1,
      name: p.name,
      sector: p.sector,
      builder: p.builder.name,
      bhk_options: bhkOptions || 'N/A',
      carpet_sqft: carpetRange,
      price: p.price_range_label,
      budget_status: p.budgetStatus ?? 'within',
      status: p.status,
      possession_claimed_by_builder: p.possession_label ?? null,
      possession_status: possessionStatus,
      // project_risk_flag: non-null value is a Hard Rule 6 / Rule 22 trigger.
      // The AI must disclose this risk inline and not recommend this project.
      project_risk_flag: p.project_risk_flag ?? null,
      nclt_moratorium_active: p.nclt_moratorium_active ?? null,
      registry_status: p.registry_status ?? null,
      // NOT_IN_DATABASE is a machine-readable sentinel: Hard Rule 16 maps it to
      // a required exact response ("I cannot verify the RERA registration number…").
      // This prevents the model from fabricating a UPRERAPRJ string.
      rera: p.rera_number ?? 'NOT_IN_DATABASE',
      amenities: amenityNames,
      connectivity: connNames,
      match_reason: p.matchReason,
      match_score: p.matchScore,
      ...(p.recommendation_profile ? {
        recommendation_tier:    p.recommendation_profile.tier,
        recommendation_thesis:  p.recommendation_profile.primary_thesis,
        family_thesis:          p.recommendation_profile.family_thesis,
        investment_thesis:      p.recommendation_profile.investment_thesis,
        luxury_thesis:          p.recommendation_profile.luxury_thesis,
        walk_away_conditions:   p.recommendation_profile.walk_away_conditions,
        end_use_thesis:         p.recommendation_profile.end_use_thesis,
        investor_thesis:        p.recommendation_profile.investor_thesis,
        risk_thesis:            p.recommendation_profile.risk_thesis,
        timeline_advice:        p.recommendation_profile.timeline_advice,
      } : {}),
      ...(p.decision_profile ? {
        decision_thesis:    p.decision_profile.decision_thesis,
        why_buy:            p.decision_profile.why_buy,
        why_avoid:          p.decision_profile.why_avoid,
        best_for:           p.decision_profile.best_for,
        confidence_sources: p.decision_profile.confidence_sources,
        not_ideal_for:      p.decision_profile.not_ideal_for,
      } : {}),
      ...(p.persona_profile ? {
        primary_persona:    p.persona_profile.primary_persona,
        secondary_personas: p.persona_profile.secondary_personas,
        persona_income_range:     p.persona_profile.income_range,
        persona_family_stage:     p.persona_profile.family_stage,
        persona_risk_appetite:    p.persona_profile.risk_appetite,
        persona_timeline_horizon: p.persona_profile.timeline_horizon,
      } : {}),
      ...(p.marketing_claims?.length ? {
        builder_claims: p.marketing_claims,
      } : {}),
      ...(p.competitors?.length ? {
        vs_competitors: p.competitors.map(c => ({
          name:            c.competitor_name,
          advantage:       c.this_project_advantage,
          competitor_edge: c.competitor_advantage,
          verdict:         c.verdict,
        })),
      } : {}),
      ...(p.dna ? {
        // Buyer-friendly signal labels — never expose raw field names or numeric scores in responses
        builder_reputation:   p.dna.builder_track_record_label,
        rera_standing:        p.dna.rera_compliance_label,
        delivery_confidence:  p.dna.possession_certainty_label,
        value_positioning:    p.dna.price_position_label,
        location_quality:     p.dna.locality_label,
        lifestyle_depth:      p.dna.amenity_depth_label,
      } : {}),
      ...(p.decisionIntelligence ? {
        // Decision Intelligence — use these for explanations, never raw scores
        decision_confidence:  p.decisionIntelligence.confidence,
        decision_tier:        p.decisionIntelligence.tier,
        decision_top_strengths: p.decisionIntelligence.topStrengths,
        decision_tradeoffs:   p.decisionIntelligence.tradeoffs,
        decision_bottom_line: p.decisionIntelligence.bottomLine,
      } : {}),
      // Track C: Add intelligence_data fields to AI context
      ...((p as any).intelligence_data?.transparency_checks ? {
        transparency_checks: (p as any).intelligence_data.transparency_checks
      } : {}),
      ...((p as any).intelligence_data?.riskRadar ? {
        riskRadar: (p as any).intelligence_data.riskRadar
      } : {}),
      ...((p as any).intelligence_data?.investment_insights ? {
        rental_yield: (p as any).intelligence_data.investment_insights.rental_yield,
        appreciation_annual: (p as any).intelligence_data.investment_insights.appreciation_annual,
      } : {}),
      ...(p.whyNot?.reasons?.length ? {
        why_ranked_lower: p.whyNot.reasons.map((r) => r.detail),
      } : {}),
    })
  }).join(',\n')
}

export function buildProjectsBlock(
  exactResults: ScoredProject[],
  sectorCtx?: SectorContext,
  expansion?: NearbyExpansion,
  nearbyResults?: ScoredProject[],
  notFoundNames?: string[]
): string {
  const hasExact = exactResults.length > 0
  const hasNearby = (nearbyResults?.length ?? 0) > 0

  // Code-level guard: inject explicit DATA INTEGRITY ALERT for every project name
  // the user requested that had no DB match. Hard Rule 14 maps this to a required
  // exact response — the model cannot fabricate specs for these projects.
  const notFoundBlock = (notFoundNames?.length ?? 0) > 0
    ? `\n\n## ⛔ DATA INTEGRITY ALERT — PROJECT_NOT_FOUND\n` +
      notFoundNames!.map((n) => {
        const safe = sanitizeProjectName(n)
        return `PROJECT_NOT_FOUND: "${safe}" — This project is NOT in the RealtyPals database. ` +
        `You MUST NOT provide from training memory: location, builder name, sector, price, BHK, ` +
        `possession date, project description, amenities, RERA number, or comparison context. ` +
        `Required response (verbatim): "This project is not currently in our tracked database." ` +
        `STOP. Do not elaborate. Do not use it as comparison context for any tracked project.`
      }).join('\n')
    : ''

  if (!hasExact && !hasNearby) {
    if (sectorCtx) {
      return notFoundBlock + `\n\n## Search Result: No Exact Matches\nNo properties match the exact criteria. Use the Sector Overview above to write a helpful market context response. Suggest: adjacent sectors, relaxing one filter (budget ±10%, different BHK), or what IS available in the sector.`
    }
    // No results AND no sector context: sector is outside our coverage.
    // Hard Rule 15 maps SECTOR_NOT_COVERED to a required exact response.
    return notFoundBlock + `\n\n## ⛔ SECTOR_NOT_COVERED
This sector currently has no exact matches in our database.
You MUST NOT invent project names, prices, carpet areas, or any property data for it.

Use EXACTLY this response structure — no deviations. The tone must be highly professional and welcoming:

🌟 **Curated Premium Options**
We don't currently have verified projects matching those exact criteria, but we have an exceptional portfolio of premium properties across the city!

**Here are some of our top curated options you might love:**
• [Curated Project 1] — [one-line why it's a great choice]
• [Curated Project 2] — [one-line relevance]

(Use the context provided to recommend 2-3 top properties. If no context is provided, ask if they'd like to explore our top premium projects.)

Then ask: "Would you like me to share some of our most exclusive listings?"

NEVER say: "No results found" or "I couldn't find any properties".`
  }

  let block = ''

  if (hasExact) {
    const overBudgetCount = exactResults.filter(
      (p) => p.budgetStatus === 'slightly_over' || p.budgetStatus === 'over'
    ).length
    const budgetWarningNote = overBudgetCount > 0
      ? `\nBUDGET NOTE: ${overBudgetCount} of ${exactResults.length} results exceed the user's stated budget. You MUST disclose this. Mention the actual price and that it is above their budget.`
      : ''
    block += `\n\n## Exact Matches — Use RESPONSE FORMAT — SEARCH RESULTS${budgetWarningNote}\n${serializeProjects(exactResults)}`
  }

  if (hasNearby && nearbyResults) {
    const sectorsLabel = expansion?.searchedSectors.join(', ') ?? 'nearby sectors'
    const overBudgetNearby = nearbyResults.filter(
      (p) => p.budgetStatus === 'slightly_over' || p.budgetStatus === 'over'
    ).length
    const nearbyBudgetNote = overBudgetNearby > 0
      ? `\nBUDGET NOTE: ${overBudgetNearby} of ${nearbyResults.length} nearby results exceed the user's stated budget. Disclose this.`
      : ''
    block += `\n\n## Nearby Alternatives (from ${sectorsLabel}) — LABEL THESE AS ALTERNATIVES, NOT EXACT MATCHES${nearbyBudgetNote}\n${serializeProjects(nearbyResults)}`
  }

  return notFoundBlock + block
}

export function buildSectorBlock(ctx: SectorContext, intent: Intent): string {
  const priceRange = ctx.priceMinCr != null && ctx.priceMaxCr != null
    ? `₹${ctx.priceMinCr.toFixed(2)}–${ctx.priceMaxCr.toFixed(2)}Cr`
    : ctx.priceMinCr != null ? `from ₹${ctx.priceMinCr.toFixed(2)}Cr` : 'varies'
  const bhkFilter = intent.bhk?.length ? ` (${intent.bhk.join('/')}BHK)` : ''
  const metro = ctx.metroStations.length ? `Metro: ${ctx.metroStations.join(', ')}` : ''
  const roads = ctx.keyRoads.length ? `Roads/Expressways: ${ctx.keyRoads.join(', ')}` : ''
  const landmarks = ctx.nearbyLandmarks.length ? `Nearby: ${ctx.nearbyLandmarks.join(', ')}` : ''
  const conn = [metro, roads, landmarks].filter(Boolean).join(' | ')

  return `\n\n## Sector Overview — ${ctx.sector}
Projects in DB: ${ctx.projectCount}${bhkFilter} | Price range: ${priceRange}
Availability: ${ctx.rtmCount} ready-to-move · ${ctx.ucCount} under construction${conn ? `\nConnectivity: ${conn}` : ''}`
}

export function buildSectorsOverviewBlock(overviews: SectorOverview[], intent: Intent): string {
  const bhkLabel = intent.bhk?.length ? `${intent.bhk.join('/')}BHK ` : ''
  const lifestyleLabel = intent.lifestyleKeywords?.length
    ? ` · Lifestyle filter: ${intent.lifestyleKeywords.join(', ')}`
    : ''

  const rows = overviews.map((s) => {
    const price = s.priceMinCr != null && s.priceMaxCr != null
      ? `₹${s.priceMinCr.toFixed(2)}–${s.priceMaxCr.toFixed(2)}Cr`
      : s.priceMinCr != null ? `from ₹${s.priceMinCr.toFixed(2)}Cr` : 'varies'
    const metro = s.metroStations.length ? ` | Metro: ${s.metroStations.join(', ')}` : ''
    const amenities = s.topAmenities.length ? ` | Amenities: ${s.topAmenities.join(', ')}` : ''
    return `- **${s.sector}**: ${s.projectCount} projects · ${price} · ${s.rtmCount} RTM / ${s.ucCount} UC${metro}${amenities}`
  }).join('\n')

  return `\n\n## Sector Advisory Data — ${bhkLabel}Noida${lifestyleLabel}
Use the SECTOR ADVISORY format. Recommend 2-3 sectors from this REAL database data:

${rows}`
}

export function buildIntentSummary(intent: Intent): string {
  const parts: string[] = []
  if (intent.bhk?.length) parts.push(`BHK: ${intent.bhk.join(' or ')}`)
  if (intent.budgetMax) parts.push(`Budget: up to ₹${intent.budgetMax}Cr`)
  if (intent.budgetMin) parts.push(`Budget from: ₹${intent.budgetMin}Cr`)
  if (intent.sector) parts.push(`Sector: ${intent.sector}`)
  if (intent.possession) parts.push(`Possession: ${intent.possession}`)
  if (intent.purpose === 'investment') {
    parts.push(`Purpose: investment — HARD RULE 20 ACTIVE: do NOT provide ROI projections, appreciation percentages, CAGR, doubling timeframes, or project investment rankings. Macro context from web_search is permitted; project-specific return forecasts are not.`)
  } else if (intent.purpose) {
    parts.push(`Purpose: ${intent.purpose}`)
  }
  if (intent.builderName) parts.push(`Builder: ${intent.builderName}`)
  if (intent.lifestyleKeywords?.length) parts.push(`Lifestyle signals: ${intent.lifestyleKeywords.join(', ')}`)
  return parts.length ? `Detected intent: ${parts.join(' · ')}\n` : ''
}

export function buildMemorySummary(memory: {
  bhk_preference?: number | null
  budget_max_cr?: number | null
  sector_preference?: string | null
  purpose?: string | null
  viewed_slugs?: string[]
  current_session_viewed?: string[] // Track C: current session viewed projects
}): string {
  const parts: string[] = []
  if (memory.bhk_preference) parts.push(`Past BHK preference: ${memory.bhk_preference}BHK`)
  if (memory.budget_max_cr) parts.push(`Past budget: ₹${memory.budget_max_cr}Cr`)
  if (memory.sector_preference) parts.push(`Past sector interest: ${memory.sector_preference}`)
  if (memory.viewed_slugs?.length) parts.push(`Previously viewed: ${memory.viewed_slugs.slice(0, 3).join(', ')}`)
  
  let summary = parts.length ? `Returning user — use as defaults when not re-stated: ${parts.join(' · ')}\n` : ''
  if (memory.current_session_viewed?.length) {
    summary += `User recently viewed in THIS session: ${memory.current_session_viewed.join(', ')}. When user says "this", "that", or "how does it compare", they refer to these.\n`
  }
  return summary
}
