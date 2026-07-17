// backend/src/lib/discovery/conversationEngine.ts
//
// Pure deterministic Conversation Engine.
// No React. No DB. No LLM.
//
// Input:  intent, discovery results, turn metadata
// Output: ConversationState (stage + chips + thinking + missingFields + confidence)
//
// This is the SINGLE place that decides conversation intelligence.

import type { Intent, IntentState, ScoredProject } from './types'
import type { ChipInventory } from './chipInventory'

// ─── Shared types (mirrored in frontend/components/chat/types.ts) ─────────────

export type ConversationStage =
  | 'DISCOVERY'
  | 'CLARIFYING'
  | 'SEARCHING'
  | 'RESEARCH'
  | 'COMPARING'
  | 'DECIDING'
  | 'CONVERTING'

export type ConversationActionType =
  | 'TEXT_MESSAGE'
  | 'INTENT_PATCH'
  | 'COMPARE_PROPERTIES'
  | 'CALCULATE_EMI'
  | 'BOOK_VISIT'
  | 'REMOVE_FILTER'
  | 'OPEN_TOOL'

// Optional grouping metadata — lets a stage present chips as multiple labeled
// sections instead of one flat row. The engine decides how many groups exist
// and how many chips belong to each; the frontend only renders what it's given.
export interface ChipGroup {
  id:       string                              // stable group identifier
  label:    string                              // section heading
  order:    number                              // group display order, ascending
  emphasis: 'primary' | 'secondary' | 'tertiary' // visual weight
}

export interface ChipAction {
  id: string
  actionType: ConversationActionType
  label: string
  icon: string
  analyticsId: string
  priority: number
  payload: Record<string, unknown>
  group?: ChipGroup
}

export interface ConversationState {
  stage: ConversationStage
  thinking: string
  chips: ChipAction[]
  missingFields: string[]
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
}

// ─── Stage computation ────────────────────────────────────────────────────────

function computeStage(
  intent: Intent,
  intentState: IntentState,
  results: ScoredProject[],
  isComparison: boolean,
  hasHistory: boolean = false,
  isUserMessage: boolean = false
): ConversationStage {
  if (isComparison) return 'COMPARING'
  if (results.length > 0 && intentState === 'SHORTLISTED') return 'DECIDING'
  if (results.length > 0) return 'RESEARCH'
  if (intentState === 'READY_TO_SEARCH') return 'SEARCHING'
  
  // If the user has sent a message or there is history, we are actively conversing.
  // DISCOVERY stage should ONLY appear on an empty chat's initial load.
  if (intentState === 'GATHERING' || (intentState === 'COLD' && (hasHistory || isUserMessage))) {
    return 'CLARIFYING'
  }
  
  return 'DISCOVERY'
}

// ─── Missing field computation ────────────────────────────────────────────────

function getMissingFields(intent: Intent, intentState: IntentState): string[] {
  if (intentState === 'COLD') return ['location', 'bhk', 'budget']
  const missing: string[] = []
  if (!intent.sector) missing.push('sector')
  if (!intent.bhk?.length) missing.push('bhk')
  if (!intent.budgetMax && !intent.budgetMin) missing.push('budget')
  if (!intent.purpose) missing.push('purpose')
  return missing
}

// ─── Confidence ───────────────────────────────────────────────────────────────

function computeConfidenceLevel(intent: Intent): 'HIGH' | 'MEDIUM' | 'LOW' {
  const signals = [
    !!intent.sector, (intent.bhk?.length ?? 0) > 0,
    !!intent.budgetMax || !!intent.budgetMin, !!intent.purpose,
  ].filter(Boolean).length
  if (signals >= 3) return 'HIGH'
  if (signals >= 1) return 'MEDIUM'
  return 'LOW'
}

// ─── Thinking message ─────────────────────────────────────────────────────────

export function getThinkingMessage(stage: ConversationStage, intent: Intent): string {
  switch (stage) {
    case 'SEARCHING':
      return intent.sector
        ? `Curating premium projects in ${intent.sector}…`
        : 'Curating a tailored selection of properties…'
    case 'RESEARCH':
      return 'Evaluating portfolio fit and optimal value…'
    case 'COMPARING':
      return 'Preparing a comprehensive diligence comparison…'
    case 'DECIDING':
      return 'Evaluating your shortlisted projects for the best fit…'
    case 'CONVERTING':
      return 'Finalising strategic next steps…'
    default:
      return 'Analysing your investment and lifestyle requirements…'
  }
}

// ─── Chip generation ──────────────────────────────────────────────────────────

export function chip(
  id: string,
  actionType: ConversationActionType,
  label: string,
  icon: string,
  payload: Record<string, unknown>,
  priority: number,
  group?: ChipGroup,
): ChipAction {
  return { id, actionType, label, icon, analyticsId: id, priority, payload, group }
}

// ─── Homepage suggestion groups ────────────────────────────────────────────────
// The engine owns grouping entirely: which groups exist, their order, their
// visual weight, and how many chips land in each. The frontend just renders
// whatever groups arrive, in the order given — it has no opinion on counts.
/**
 * Discovery chips: offered proactively when entering chat to suggest typical starting queries.
 * Builds dynamically from live chip inventory (sectors, budget buckets, BHK options).
 */
function getDiscoveryChips(inventory: ChipInventory | null): ChipAction[] {
  if (!inventory) return []

  const chips: ChipAction[] = []
  const sectorGroup: ChipGroup = { id: 'popular_sectors', label: `Popular sectors in ${inventory.city}`, order: 0, emphasis: 'primary' }

  // Top sectors by project count (Max 2)
  for (const { sector, projectCount } of inventory.sectors.slice(0, 2)) {
    chips.push(chip(
      `INTENT_PATCH:sector:${sector.replace(/\s+/g, '_').toLowerCase()}`,
      'INTENT_PATCH',
      `${sector} (${projectCount} projects)`,
      '📍',
      { patch: { sector }, label: sector },
      chips.length + 1,
      sectorGroup
    ))
  }

  // Budget buckets (Max 1)
  const budgetGroup: ChipGroup = { id: 'budget_buckets', label: 'Budget ranges', order: 1, emphasis: 'secondary' }
  for (let i = 0; i < Math.min(1, inventory.budgetBuckets.length); i++) {
    const bucket = inventory.budgetBuckets[i]
    const budgetMax = bucket.max || 10
    chips.push(chip(
      `INTENT_PATCH:budget:${bucket.label.replace(/\W+/g, '_').toLowerCase()}`,
      'INTENT_PATCH',
      bucket.label,
      '💰',
      { patch: { budgetMax }, label: bucket.label },
      chips.length + 1,
      budgetGroup
    ))
  }

  // BHK options (Max 1)
  const bhkGroup: ChipGroup = { id: 'bhk_options', label: 'BHK', order: 2, emphasis: 'tertiary' }
  for (const bhk of inventory.bhkOptions.slice(0, 1)) {
    chips.push(chip(
      `INTENT_PATCH:bhk:${bhk}`,
      'INTENT_PATCH',
      `${bhk} BHK`,
      '🏠',
      { patch: { bhk: [bhk] }, label: `${bhk} BHK` },
      chips.length + 1,
      bhkGroup
    ))
  }

  return chips
}

function getClarifyingChips(
  intent: Intent,
  missingFields: string[],
  results: ScoredProject[],
  chatHistory: { role: string; content: string }[],
  inventory: ChipInventory | null
): ChipAction[] {
  const chips: ChipAction[] = []
  let priority = 1

  // Extract previously suggested or rejected text from history to avoid repeats
  const historyText = chatHistory.map(m => m.content.toLowerCase()).join(' ')

  // Missing sector — offer sectors based on actual returned projects, fallback to inventory
  if (missingFields.includes('sector') && !intent.sector) {
    let candidateSectors = Array.from(new Set(results.map(r => r.sector)))
      .filter(sector => sector && !historyText.includes(sector.toLowerCase()))

    if (candidateSectors.length === 0 && inventory?.sectors) {
      candidateSectors = inventory.sectors.map(s => s.sector)
        .filter(sector => sector && !historyText.includes(sector.toLowerCase()))
    }

    // Take top 3 sectors
    const sectors = candidateSectors.slice(0, 3)

    for (const sector of sectors) {
      chips.push(chip(
        `INTENT_PATCH:sector_clarify:${sector.replace(/\s/g, '_').toLowerCase()}`,
        'INTENT_PATCH', sector, '',
        { patch: { sector }, label: sector },
        priority++,
      ))
    }
    if (chips.length > 0) return chips
  }

  // Missing BHK — offer from inventory
  if (missingFields.includes('bhk') && !intent.bhk?.length && inventory?.bhkOptions) {
    for (const bhk of inventory.bhkOptions) {
      chips.push(chip(
        `INTENT_PATCH:bhk_clarify:${bhk}`,
        'INTENT_PATCH', `${bhk} BHK`, '',
        { patch: { bhk: [bhk] }, label: `${bhk} BHK` },
        priority++,
      ))
    }
    return chips
  }

  // Missing budget — offer from inventory
  if (missingFields.includes('budget') && !intent.budgetMax && !intent.budgetMin && inventory?.budgetBuckets) {
    for (const bucket of inventory.budgetBuckets.slice(0, 3)) {
      const budgetMax = bucket.max || 10
      chips.push(chip(
        `INTENT_PATCH:budget_clarify:${bucket.label.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`,
        'INTENT_PATCH', bucket.label, '',
        { patch: { budgetMax }, label: bucket.label },
        priority++,
      ))
    }
    return chips
  }

  return chips // Do not fallback to getDiscoveryChips, return whatever we built or empty
}

/**
 * Search refinement chips: while in SEARCHING stage, offer context-aware options
 * to refine the current search, NOT discovery homepage chips.
 */
function getSearchRefinementChips(
  intent: Intent,
  results: ScoredProject[],
  chatHistory: { role: string; content: string }[],
  inventory: ChipInventory | null,
): ChipAction[] {
  const chips: ChipAction[] = []
  let priority = 1

  // If sector specified but BHK missing, offer BHK refinement
  if (intent.sector && !intent.bhk?.length && inventory?.bhkOptions) {
    for (const bhk of inventory.bhkOptions) {
      chips.push(chip(
        `INTENT_PATCH:refine_bhk:${bhk}`,
        'INTENT_PATCH', `${bhk} BHK`, '🏠',
        { patch: { bhk: [bhk] }, label: `${bhk} BHK` },
        priority++,
      ))
    }
    if (chips.length >= 3) return chips.slice(0, 3)
  }

  // If sector and BHK specified but budget missing, offer budget refinement
  if (intent.sector && intent.bhk?.length && !intent.budgetMax && !intent.budgetMin && inventory?.budgetBuckets) {
    for (const bucket of inventory.budgetBuckets.slice(0, 3)) {
      chips.push(chip(
        `INTENT_PATCH:refine_budget:${bucket.label.replace(/[₹\s,–-]/g, '_')}`,
        'INTENT_PATCH', bucket.label, '💰',
        { patch: { budgetMin: bucket.min, budgetMax: bucket.max }, label: bucket.label },
        priority++,
      ))
    }
    if (chips.length >= 3) return chips.slice(0, 3)
  }

  // Default: offer lifestyle filters from actual results (never empty offerings)
  if (intent.sector && chips.length === 0 && results.length > 0) {
    const amenities = new Map<string, number>()
    for (const result of results) {
      for (const amenity of result.top_amenities ?? []) {
        amenities.set(amenity.name, (amenities.get(amenity.name) ?? 0) + 1)
      }
    }
    // Sort by frequency (most common amenities first)
    const sortedAmenities = Array.from(amenities.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name)
      .slice(0, 3)

    for (const lifestyle of sortedAmenities) {
      chips.push(chip(
        `INTENT_PATCH:refine_lifestyle:${lifestyle.replace(/\s/g, '_').toLowerCase()}`,
        'INTENT_PATCH', lifestyle, '⭐',
        { patch: { lifestyleKeywords: [...(intent.lifestyleKeywords ?? []), lifestyle] }, label: lifestyle },
        priority++,
      ))
    }
  }

  return chips.slice(0, 3)
}

function filterByHistory(pool: ChipAction[], chatHistory: any[]): ChipAction[] {
  const historyText = chatHistory.map(m => m.content.toLowerCase()).join(' ')
  return pool.filter(c => {
    const labelLower = c.label.toLowerCase()
    const isDiscussed = historyText.includes(labelLower) || 
      ((c.payload?.text as string)?.toLowerCase() && historyText.includes((c.payload.text as string).toLowerCase()))
    return !isDiscussed
  })
}

function getFallbackChips(pool: ChipAction[], chips: ChipAction[], maxCount: number, chatHistory: any[]): ChipAction[] {
  const needed = maxCount - chips.length
  if (needed <= 0) return chips
  
  const turn = Math.floor(chatHistory.length / 2)
  const maxStartIndex = Math.max(0, pool.length - needed)
  const startIndex = maxStartIndex > 0 ? (turn % maxStartIndex) : 0
  
  chips.push(...pool.slice(startIndex, startIndex + needed))
  return chips
}

function getResearchChips(intent: Intent, results: ScoredProject[], chatHistory: any[]): ChipAction[] {
  const chips: ChipAction[] = []
  const hasMultiple = results.length >= 2
  const hasUnderConstruction = results.some(
    r => r.status === 'under_construction' || r.status === 'new_launch'
  )
  const topProjectName = results[0]?.name || 'these properties'

  if (hasMultiple) {
    const directCompare = results.length <= 3
    const shortName = topProjectName.split(' ')[0] || topProjectName
    const pIds = results.slice(0, 3).map(r => r.id).join(':')
    chips.push(chip(`COMPARE_PROPERTIES:research:${pIds}`, 'COMPARE_PROPERTIES', `Compare ${shortName} vs others`, '',
      directCompare ? { mode: 'direct', selected: results.slice(0, 3).map(r => r.slug) } : { mode: 'multi' }, 1))
  }

  const projectsList = results.map(r => ({ id: String(r.id), name: r.name }))

  const pIds = projectsList.map(p => p.id).join(':')
  const pool = [
    chip(`TEXT_MESSAGE:price_trends:${pIds}`, 'TEXT_MESSAGE', 'Price Trends', '',
      { actionPrefix: 'How have property prices trended for', actionSuffix: 'recently?', projects: projectsList }, 2),
    hasUnderConstruction ? chip(`TEXT_MESSAGE:builder_risk:${pIds}`, 'TEXT_MESSAGE', 'Builder delivery risk', '',
      { actionPrefix: 'What are the builder delivery risks for', actionSuffix: '?', projects: projectsList }, 3) 
      : chip(`TEXT_MESSAGE:builder_track:${pIds}`, 'TEXT_MESSAGE', 'Builder track record', '',
      { actionPrefix: 'Tell me about the builder for', actionSuffix: '— delivery history and reputation', projects: projectsList }, 3),
    intent.purpose === 'investment' || !intent.purpose ? chip(`TEXT_MESSAGE:roi:${pIds}`, 'TEXT_MESSAGE', 'Investment ROI', '',
      { actionPrefix: 'What is the rental yield and appreciation potential for', actionSuffix: '?', projects: projectsList }, 4) 
      : chip(`TEXT_MESSAGE:nearby:${pIds}`, 'TEXT_MESSAGE', 'Nearby amenities', '',
      { actionPrefix: 'What schools, hospitals, and metro stations are near', actionSuffix: '?', projects: projectsList }, 4),
    chip(`TEXT_MESSAGE:payment_plan:${pIds}`, 'TEXT_MESSAGE', 'Payment plans', '',
      { actionPrefix: 'What are the payment plans and milestones for', actionSuffix: '?', projects: projectsList }, 5),
    chip(`TEXT_MESSAGE:cost_sheet:${pIds}`, 'TEXT_MESSAGE', 'Cost breakdown', '',
      { actionPrefix: 'Can you break down the complete costs including PLC and taxes for', actionSuffix: '?', projects: projectsList }, 6),
    chip(`TEXT_MESSAGE:legal_check:${pIds}`, 'TEXT_MESSAGE', 'Legal check', '',
      { actionPrefix: 'Are there any legal or RERA red flags for', actionSuffix: '?', projects: projectsList }, 7),
    chip(`TEXT_MESSAGE:amenities:${pIds}`, 'TEXT_MESSAGE', 'Amenities', '',
      { actionPrefix: 'What are the key amenities for', actionSuffix: '?', projects: projectsList }, 8)
  ]

  const filteredPool = filterByHistory(pool, chatHistory)
  return getFallbackChips(filteredPool, chips, 4, chatHistory)
}

function getComparingChips(results: ScoredProject[], chatHistory: any[]): ChipAction[] {
  const topNames = results.slice(0, 2).map(r => r.name).join(' and ') || 'these properties'
  const pIds = results.slice(0, 2).map(r => r.id).join(':')
  const pool = [
    chip(`TEXT_MESSAGE:roi_compare:${pIds}`, 'TEXT_MESSAGE', 'Analyze ROI differences', '',
      { text: `Between ${topNames}, which offers the best return on investment?` }, 1),
    chip(`TEXT_MESSAGE:hidden_costs:${pIds}`, 'TEXT_MESSAGE', 'Cost & Tax breakdown', '',
      { text: `Provide a complete breakdown of maintenance, GST, and stamp duty for ${topNames}.` }, 2),
    chip(`TEXT_MESSAGE:family_fit:${pIds}`, 'TEXT_MESSAGE', 'Lifestyle & Family fit', '',
      { text: `Which between ${topNames} offers the best ecosystem and lifestyle amenities for a family?` }, 3),
    chip(`TEXT_MESSAGE:payment_plan:${pIds}`, 'TEXT_MESSAGE', 'Compare payment plans', '',
      { text: `Compare the payment plans and construction-linked structures for ${topNames}.` }, 4),
    chip(`TEXT_MESSAGE:legal_compare:${pIds}`, 'TEXT_MESSAGE', 'Compare RERA & Legal', '',
      { text: `How do ${topNames} compare in terms of RERA standing and legal safety?` }, 5),
    chip(`TEXT_MESSAGE:location_compare:${pIds}`, 'TEXT_MESSAGE', 'Compare connectivity', '',
      { text: `Which of ${topNames} has better access to metro and highways?` }, 6)
  ]
  const filteredPool = filterByHistory(pool, chatHistory)
  return getFallbackChips(filteredPool, [], 4, chatHistory)
}

function getDecidingChips(results: ScoredProject[], chatHistory: any[]): ChipAction[] {
  const topProjectName = results[0]?.name || 'my shortlist'
  const chips: ChipAction[] = []

  if (results.length >= 2) {
    const pIds = results.slice(0, 3).map(r => r.id).join(':')
    chips.push(chip(`COMPARE_PROPERTIES:final_compare:${pIds}`, 'COMPARE_PROPERTIES', 'Final comparison', '',
      { mode: 'multi' }, 0))
  }

  const projectsList = results.map(r => ({ id: String(r.id), name: r.name }))

  const pIds = projectsList.map(p => p.id).join(':')
  const pool = [
    chip(`TEXT_MESSAGE:hidden_risks:${pIds}`, 'TEXT_MESSAGE', 'Risk & Diligence check', '',
      { actionPrefix: 'Are there any hidden risks, legal issues, or delivery concerns for', actionSuffix: '?', projects: projectsList }, 1),
    chip(`TEXT_MESSAGE:negotiation:${pIds}`, 'TEXT_MESSAGE', 'Negotiation strategy', '',
      { actionPrefix: 'What is a realistic negotiation margin and acquisition strategy for', actionSuffix: '?', projects: projectsList }, 2),
    chip(`TEXT_MESSAGE:legal_check:${pIds}`, 'TEXT_MESSAGE', 'Check RERA & Legal status', '',
      { actionPrefix: 'Check RERA compliance and legal clearances for', actionSuffix: '.', projects: projectsList }, 3),
    chip(`TEXT_MESSAGE:booking_process:${pIds}`, 'TEXT_MESSAGE', 'Explain the booking steps', '',
      { actionPrefix: 'Explain typical initial booking amounts and next steps for', actionSuffix: '.', projects: projectsList }, 4),
    chip(`TEXT_MESSAGE:exit_strategy:${pIds}`, 'TEXT_MESSAGE', 'Analyze 5-year exit strategy', '',
      { actionPrefix: 'Analyze market liquidity if I want to sell', actionSuffix: 'in 5 years.', projects: projectsList }, 5),
  ]

  const filteredPool = filterByHistory(pool, chatHistory)
  return getFallbackChips(filteredPool, chips, 4, chatHistory)
}

/** Unified chip pipeline: candidates → dedupe → rank → cap-4 */
function capChips(candidates: ChipAction[]): ChipAction[] {
  const hasGroups = candidates.some(c => c.group)
  if (!hasGroups && candidates.length > 4) {
    const critical = candidates.filter(c => c.priority <= 2).slice(0, 2)
    const secondary = candidates.filter(c => c.priority > 2 && c.priority <= 3).slice(0, 2)
    return [...critical, ...secondary].slice(0, 4)
  }
  return candidates.slice(0, 4)
}

import { generateDynamicChips } from '../db/chipProvider'
import { generateContextualLLMChips } from '../ai/prompts/chips'

// ─── Main export ──────────────────────────────────────────────────────────────

export async function computeConversationState(
  intent: Intent,
  intentState: IntentState,
  results: ScoredProject[],
  isComparison: boolean = false,
  chatHistory: { role: string; content: string }[] = [],
  disambiguation?: { query: string; candidates: Array<{ name: string; sector: string; builder: string }> },
  sectorDisambiguation?: { query: string; candidates: string[] },
  cityDisambiguation?: { query: string; candidates: Array<{ city: string; label: string }> },
  chipInventory: ChipInventory | null = null,
  isUserMessage: boolean = false
): Promise<ConversationState> {
  const stage = computeStage(intent, intentState, results, isComparison, chatHistory.length > 0, isUserMessage)
  const missingFields = getMissingFields(intent, intentState)
  const confidence = computeConfidenceLevel(intent)
  const thinking = getThinkingMessage(stage, intent)

  let chips: ChipAction[] = []

  if (disambiguation) {
    chips = disambiguation.candidates.map((c, idx) => {
      const label = `${c.name} (${c.sector})`
      const shortLabel = label.length > 24 ? label.substring(0, 21) + '…' : label
      return chip(
        `TEXT_MESSAGE:disambig:${c.name.replace(/\s+/g, '_')}`,
        'TEXT_MESSAGE',
        shortLabel,
        '',
        { text: `Show me ${c.name} in ${c.sector}` },
        idx + 1
      )
    })
  } else if (sectorDisambiguation) {
    chips = sectorDisambiguation.candidates.map((s, idx) => chip(
      `INTENT_PATCH:disambig_sec:${s.replace(/\s+/g, '_')}`,
      'INTENT_PATCH',
      s,
      '',
      { patch: { sector: s }, label: s },
      idx + 1
    ))
  } else if (cityDisambiguation) {
    // Progressive clarification: city selection chips (max 3-4, NotebookLM style)
    chips = cityDisambiguation.candidates.slice(0, 4).map((c, idx) => chip(
      `INTENT_PATCH:disambig_city:${c.city}`,
      'INTENT_PATCH',
      c.label,
      '',
      { patch: { sector: cityDisambiguation.query, city: c.city }, label: c.label },
      idx + 1
    ))
  } else {
    // Populate chips dynamically based on the conversation stage
    switch (stage) {
      case 'CLARIFYING':
        chips = getClarifyingChips(intent, missingFields, results, chatHistory, chipInventory)
        break
      case 'DISCOVERY':
        chips = getDiscoveryChips(chipInventory)
        break
      case 'SEARCHING':
        // While searching, offer context-aware refinement chips (not discovery chips)
        chips = getSearchRefinementChips(intent, results, chatHistory, chipInventory)
        break
      case 'RESEARCH':
        chips = await generateDynamicChips('research', results, chatHistory)
        break
      case 'COMPARING':
        chips = await generateDynamicChips('compare', results, chatHistory)
        break
      case 'DECIDING':
        chips = await generateDynamicChips('decide', results, chatHistory)
        break
      case 'CONVERTING':
        chips = []
        break
    }
  }

  // Deduplicate by id (safety guard)
  const seen = new Set<string>()
  chips = chips.filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true })

  // Grouped chips sort by group order first, then priority within the group.
  // Ungrouped chips (every stage but DISCOVERY today) sort by priority alone.
  chips.sort((a, b) => {
    const groupOrderDiff = (a.group?.order ?? -1) - (b.group?.order ?? -1)
    return groupOrderDiff !== 0 ? groupOrderDiff : a.priority - b.priority
  })

  // Smart, predictive chip selection: max 3-4 for clean NotebookLM style
  // Priority ranking: critical clarifications (1) → high-value actions (2-3) → exploratory (4+)
  // Grouped chips rendered as separate sections; ungrouped chips follow predictive ranking
  const hasGroups = chips.some(c => c.group)
  const preCapChips = chips.length
  chips = capChips(chips)
  if (stage === 'CLARIFYING') console.log('[CONV_ENGINE] CLARIFYING stage:', { missingFields, preCapChips, postCapChips: chips.length, labels: chips.map(c => c.label) })
  return { stage, thinking, chips, missingFields, confidence }
}
