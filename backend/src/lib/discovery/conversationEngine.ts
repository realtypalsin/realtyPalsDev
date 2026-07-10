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
): ConversationStage {
  if (isComparison) return 'COMPARING'
  if (results.length > 0 && intentState === 'SHORTLISTED') return 'DECIDING'
  if (results.length > 0) return 'RESEARCH'
  if (intentState === 'READY_TO_SEARCH') return 'SEARCHING'
  if (intentState === 'GATHERING') return 'CLARIFYING'
  // Only show discovery chips on first message (homepage). If user is already
  // in chat and sends garbage/empty input, don't show discovery chips.
  if (hasHistory && intentState === 'COLD') return 'CLARIFYING'
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

function chip(
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

  // Top sectors by project count
  for (const { sector, projectCount } of inventory.sectors.slice(0, 3)) {
    chips.push(chip(
      `discovery_sector_${sector.replace(/\s+/g, '_').toLowerCase()}`,
      'INTENT_PATCH',
      `${sector} (${projectCount} projects)`,
      '📍',
      { patch: { sector }, label: sector },
      chips.length + 1,
      sectorGroup
    ))
  }

  // Budget buckets
  const budgetGroup: ChipGroup = { id: 'budget_buckets', label: 'Budget ranges', order: 1, emphasis: 'secondary' }
  for (let i = 0; i < Math.min(3, inventory.budgetBuckets.length); i++) {
    const bucket = inventory.budgetBuckets[i]
    const budgetMax = bucket.max || 10
    chips.push(chip(
      `discovery_budget_${bucket.label.replace(/\W+/g, '_').toLowerCase()}`,
      'INTENT_PATCH',
      bucket.label,
      '💰',
      { patch: { budgetMax }, label: bucket.label },
      chips.length + 1,
      budgetGroup
    ))
  }

  // BHK options
  const bhkGroup: ChipGroup = { id: 'bhk_options', label: 'BHK', order: 2, emphasis: 'tertiary' }
  for (const bhk of inventory.bhkOptions) {
    chips.push(chip(
      `discovery_bhk_${bhk}`,
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

  // Missing sector — offer sectors based on actual returned projects (data-driven)
  if (missingFields.includes('sector') && !intent.sector) {
    const candidateSectors = Array.from(new Set(results.map(r => r.sector)))
      .filter(sector => sector && !historyText.includes(sector.toLowerCase()))

    // Take top 3 sectors from actual inventory matching the rest of the intent
    const sectors = candidateSectors.slice(0, 3)

    for (const sector of sectors) {
      chips.push(chip(
        `sector_${sector.replace(/\s/g, '_').toLowerCase()}`,
        'INTENT_PATCH', sector, '📍',
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
        `bhk_${bhk}`,
        'INTENT_PATCH', `${bhk} BHK`, '🏠',
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
        `budget_${bucket.label.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`,
        'INTENT_PATCH', bucket.label, '💰',
        { patch: { budgetMax }, label: bucket.label },
        priority++,
      ))
    }
    return chips
  }

  return chips // Do not fallback to getDiscoveryChips, return whatever we built or empty
}

function getResearchChips(intent: Intent, results: ScoredProject[]): ChipAction[] {
  const chips: ChipAction[] = []
  const hasMultiple = results.length >= 2
  const hasUnderConstruction = results.some(
    r => r.status === 'under_construction' || r.status === 'new_launch'
  )
  const topProjectName = results[0]?.name || 'these properties'

  if (hasMultiple) {
    // Frictionless Comparison: Bypasses picker if exactly 2 or 3 projects.
    const directCompare = results.length <= 3
    const shortName = topProjectName.length > 12 ? topProjectName.substring(0, 12) + '…' : topProjectName
    chips.push(chip('compare', 'COMPARE_PROPERTIES', `Compare ${shortName} vs others`, '⚖️',
      directCompare ? { mode: 'direct', selected: results.slice(0, 3).map(r => r.slug) } : { mode: 'multi' }, 1))
  }

  chips.push(chip('price_trends', 'TEXT_MESSAGE', 'Price Trends', '📊',
    { text: `How have property prices trended for ${topProjectName} recently?` }, 2))

  if (hasUnderConstruction) {
    chips.push(chip('builder_risk', 'TEXT_MESSAGE', 'Builder delivery risk', '🏗️',
      { text: `What are the builder delivery risks for ${topProjectName}?` }, 3))
  } else {
    chips.push(chip('builder_track', 'TEXT_MESSAGE', 'Builder track record', '🏗️',
      { text: `Tell me about the builder for ${topProjectName} — delivery history and reputation` }, 3))
  }

  if (intent.purpose === 'investment' || !intent.purpose) {
    chips.push(chip('roi', 'TEXT_MESSAGE', 'Investment ROI', '📈',
      { text: `What is the rental yield and appreciation potential for ${topProjectName}?` }, 4))
  } else {
    chips.push(chip('nearby', 'TEXT_MESSAGE', 'Nearby amenities', '🏫',
      { text: `What schools, hospitals, and metro stations are near ${topProjectName}?` }, 4))
  }

  return chips.slice(0, 4)
}

function getComparingChips(results: ScoredProject[]): ChipAction[] {
  const topNames = results.slice(0, 2).map(r => r.name).join(' and ') || 'these properties'
  return [
    chip('roi_compare', 'TEXT_MESSAGE', 'Optimal ROI', '📈',
      { text: `Between ${topNames}, which offers the best return on investment?` }, 1),
    chip('hidden_costs', 'TEXT_MESSAGE', 'Cost & Tax Transparency', '💸',
      { text: `Provide a complete breakdown of maintenance, GST, and stamp duty for ${topNames}.` }, 2),
    chip('family_fit', 'TEXT_MESSAGE', 'Lifestyle & Family Fit', '👨‍👩‍👧',
      { text: `Which between ${topNames} offers the best ecosystem and lifestyle amenities for a family?` }, 3),
    chip('payment_plan', 'TEXT_MESSAGE', 'Payment Structuring', '🗓️',
      { text: `Compare the payment plans and construction-linked structures for ${topNames}.` }, 4),
  ]
}

function getDecidingChips(results: ScoredProject[]): ChipAction[] {
  const topProjectName = results[0]?.name || 'my shortlist'
  const chips: ChipAction[] = [
    chip('hidden_risks', 'TEXT_MESSAGE', 'Risk & Diligence Check', '⚠️',
      { text: `Are there any hidden risks, legal issues, or delivery concerns for ${topProjectName}?` }, 1),
    chip('negotiation', 'TEXT_MESSAGE', 'Strategic Acquisition', '🤝',
      { text: `What is a realistic negotiation margin and acquisition strategy for ${topProjectName}?` }, 2),
    chip('legal_check', 'TEXT_MESSAGE', 'RERA & Compliance', '🛡️',
      { text: `Verify the RERA compliance and legal clearances for ${topProjectName}.` }, 3),
  ]
  if (results.length >= 2) {
    chips.unshift(chip('final_compare', 'COMPARE_PROPERTIES', 'Final comparison', '⚖️',
      { mode: 'multi' }, 0))
  }
  return chips.slice(0, 4)
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeConversationState(
  intent: Intent,
  intentState: IntentState,
  results: ScoredProject[],
  isComparison: boolean,
  chatHistory: { role: string; content: string }[] = [],
  disambiguation?: { query: string; candidates: Array<{ name: string; sector: string; builder: string }> },
  sectorDisambiguation?: { query: string; candidates: string[] },
  cityDisambiguation?: { query: string; candidates: Array<{ city: string; label: string }> },
  chipInventory: ChipInventory | null = null
): ConversationState {
  const stage = computeStage(intent, intentState, results, isComparison, chatHistory.length > 0)
  const missingFields = getMissingFields(intent, intentState)
  const confidence = computeConfidenceLevel(intent)
  const thinking = getThinkingMessage(stage, intent)

  let chips: ChipAction[] = []

  if (disambiguation) {
    chips = disambiguation.candidates.map((c, idx) => {
      const label = `${c.name} (${c.sector})`
      const shortLabel = label.length > 24 ? label.substring(0, 21) + '…' : label
      return chip(
        `disambig_${idx}`,
        'TEXT_MESSAGE',
        shortLabel,
        '🏢',
        { text: `Show me ${c.name} in ${c.sector}` },
        idx + 1
      )
    })
  } else if (sectorDisambiguation) {
    chips = sectorDisambiguation.candidates.map((s, idx) => chip(
      `disambig_sec_${idx}`,
      'INTENT_PATCH',
      s,
      '📍',
      { patch: { sector: s }, label: s },
      idx + 1
    ))
  } else if (cityDisambiguation) {
    // Progressive clarification: city selection chips (max 3-4, NotebookLM style)
    chips = cityDisambiguation.candidates.slice(0, 4).map((c, idx) => chip(
      `disambig_city_${idx}`,
      'INTENT_PATCH',
      c.label,
      '🏘️',
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
        chips = getDiscoveryChips(chipInventory) // Offer discovery chips while searching so user can refine
        break
      case 'RESEARCH':
        chips = getResearchChips(intent, results)
        break
      case 'COMPARING':
        chips = getComparingChips(results)
        break
      case 'DECIDING':
        chips = getDecidingChips(results)
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
  if (!hasGroups && chips.length > 4) {
    // Sort by priority, take top 3-4 most relevant chips
    // Lower priority number = more critical (appears first)
    const critical = chips.filter(c => c.priority <= 2).slice(0, 2)
    const secondary = chips.filter(c => c.priority > 2 && c.priority <= 3).slice(0, 2)
    chips = [...critical, ...secondary].slice(0, 4)
  }
  return { stage, thinking, chips: hasGroups ? chips : chips.slice(0, 4), missingFields, confidence }
}
