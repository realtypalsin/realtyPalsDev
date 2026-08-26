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

export interface ConversationStateOptions {
  /**
   * When false, chip generation stays fully deterministic — no LLM call.
   * Used for the pre-search ui_state and for session restore, where the chips
   * are either overwritten by the post-response ui_state or not worth a
   * paid round-trip on a page load.
   */
  allowLlmChips?: boolean
}

export interface ConversationState {
  stage: ConversationStage
  thinking: string
  chips: ChipAction[]
  missingFields: string[]
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
}

export interface ChatMessage {
  role: string
  content?: string | null
}

function isChatMessage(msg: unknown): msg is ChatMessage {
  return typeof msg === 'object' && msg !== null && 'role' in msg
}

// ─── Stage computation ────────────────────────────────────────────────────────

function computeStage(
  intent: Intent,
  intentState: IntentState,
  results: ScoredProject[] = [],
  isComparison: boolean = false,
  hasHistory: boolean = false,
  isUserMessage: boolean = false
): ConversationStage {
  const safeResults = results || []
  if (isComparison) return 'COMPARING'
  if (safeResults.length > 0 && intentState === 'SHORTLISTED') return 'DECIDING'
  if (safeResults.length > 0) return 'RESEARCH'
  if (intentState === 'READY_TO_SEARCH') return 'SEARCHING'
  
  // If the user has sent a message or there is history, we are actively conversing.
  // DISCOVERY stage should ONLY appear on an empty chat's initial load.
  if (intentState === 'GATHERING' || (intentState === 'COLD' && (hasHistory || isUserMessage))) {
    return 'CLARIFYING'
  }
  
  return 'DISCOVERY'
}

// ─── Missing field computation ────────────────────────────────────────────────

function getMissingFields(intent: Intent, intentState?: IntentState): string[] {
  const missing: string[] = []
  if (!intent.sector) missing.push('sector')
  if (!intent.bhk || intent.bhk.length === 0) missing.push('bhk')
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

function cleanLabel(s: string): string {
  if (!s) return ''
  return s
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2B50}\u{FE0F}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function chip(
  id: string,
  actionType: ConversationActionType,
  label: string,
  icon: string,
  payload: Record<string, unknown>,
  priority: number = 1,
  group?: ChipGroup
): ChipAction {
  return {
    id,
    actionType,
    label: cleanLabel(label),
    icon: '',
    analyticsId: id.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
    priority,
    payload,
    ...(group ? { group } : {}),
  }
}

// ─── Homepage suggestion groups ────────────────────────────────────────────────
function getDiscoveryChips(inventory: ChipInventory | null): ChipAction[] {
  const chips: ChipAction[] = []
  if (!inventory) return chips

  const areaGroup: ChipGroup = { id: 'popular_areas', label: 'Explore Areas', order: 1, emphasis: 'primary' }
  const topSectors = inventory.sectors.slice(0, 2)
  for (const [idx, { sector, projectCount }] of topSectors.entries()) {
    chips.push(chip(
      `INTENT_PATCH:sector:${sector}`,
      'INTENT_PATCH',
      `${sector} (${projectCount} projects)`,
      '',
      { patch: { sector }, label: sector },
      idx + 1,
      areaGroup
    ))
  }

  const budgetGroup: ChipGroup = { id: 'budget_buckets', label: 'Budget ranges', order: 1, emphasis: 'secondary' }
  for (const bucket of inventory.budgetBuckets.slice(0, 1)) {
    chips.push(chip(
      `INTENT_PATCH:budget:${bucket.label.replace(/\W+/g, '_').toLowerCase()}`,
      'INTENT_PATCH',
      bucket.label,
      '',
      { patch: { budgetMax: bucket.max }, label: bucket.label },
      chips.length + 1,
      budgetGroup
    ))
  }

  const bhkGroup: ChipGroup = { id: 'bhk_options', label: 'BHK', order: 2, emphasis: 'tertiary' }
  for (const bhk of inventory.bhkOptions.slice(0, 1)) {
    chips.push(chip(
      `INTENT_PATCH:bhk:${bhk}`,
      'INTENT_PATCH',
      `${bhk} BHK`,
      '',
      { patch: { bhk: [bhk] }, label: `${bhk} BHK` },
      chips.length + 1,
      bhkGroup
    ))
  }

  return chips
}

async function getClarifyingChips(
  intent: Intent,
  missingFields: string[],
  results: ScoredProject[],
  chatHistory: { role: string; content: string }[],
  inventory: ChipInventory | null,
  usedProvider?: { provider: string; envKey: string },
  allowLlmChips: boolean = true
): Promise<ChipAction[]> {
  const chips: ChipAction[] = []
  let priority = 1

  // ─── 1. Dynamic Conversational Bridge (High Priority when history is present) ───
  if (allowLlmChips && chatHistory.length > 0) {
    try {
      const llmChips = await generateContextualLLMChips(chatHistory, priority, usedProvider, {
        intent: intent as unknown as Record<string, unknown>,
        projectNames: results.slice(0, 5).map(r => r.name),
      })
      if (llmChips.length > 0) {
        // If user already specified BHK, filter out any redundant BHK chips
        const filtered = (intent.bhk && intent.bhk.length > 0)
          ? llmChips.filter(c => !/^\d\s*bhk$/i.test(c.label.trim()))
          : llmChips
        if (filtered.length > 0) {
          return filtered
        }
      }
    } catch (llmErr) {
      console.warn('[CONV_ENGINE:LLM_CHIPS:WARN]', llmErr)
    }
  }

  // ─── 2. Persona Specific Dynamic Clarification ───────────────────────────────
  if (intent.journeyStage === 'yield_investor') {
    chips.push(
      chip('EXPLORE:yield_commercial', 'TEXT_MESSAGE', 'Commercial Retail (6-8% Yield)', '', { message: 'Tell me about commercial retail yields vs residential in Noida' }, priority++),
      chip('EXPLORE:jewar_catalyst', 'TEXT_MESSAGE', 'Jewar Airport Impact', '', { message: 'How will Jewar Airport commercial flights impact property values?' }, priority++),
      chip('EXPLORE:roi_5yr_model', 'TEXT_MESSAGE', '5-Yr ROI Projection', '', { message: 'Show me a 5-year ROI model comparing residential vs commercial' }, priority++)
    )
    return chips
  }

  if (intent.riskProfile === 'nri' || intent.journeyStage === 'nri_investor') {
    chips.push(
      chip('EXPLORE:nri_form7', 'TEXT_MESSAGE', 'Form-7 Escrow Compliant Only', '', { message: 'Show me projects with 100% UP RERA Form-7 escrow compliance' }, priority++),
      chip('EXPLORE:nri_tripartite', 'TEXT_MESSAGE', 'Tripartite Agreement Info', '', { message: 'How does the mandatory Tripartite Sale Agreement protect me?' }, priority++),
      chip('EXPLORE:nri_remote_spa', 'TEXT_MESSAGE', 'Remote Registry (SPA)', '', { message: 'How does remote registration via Special Power of Attorney work?' }, priority++)
    )
    return chips
  }

  if (intent.journeyStage === 'market_evaluator') {
    chips.push(
      chip('EXPLORE:sec75_vs_76', 'TEXT_MESSAGE', 'Sector 75 vs 76 Delta', '', { message: 'Why is Sector 75 more expensive than Sector 76?' }, priority++),
      chip('EXPLORE:carpet_vs_super', 'TEXT_MESSAGE', 'Carpet vs Super Area', '', { message: 'How does RERA carpet area differ from builder super built-up area?' }, priority++),
      chip('EXPLORE:circle_rate_duty', 'TEXT_MESSAGE', 'Circle Rate & Tax Rules', '', { message: 'How are circle rates and stamp duty calculated in Noida?' }, priority++)
    )
    return chips
  }

  // ─── 3. Relocators without a specific sector selected ─────────────────────────
  if (intent.journeyStage === 'relocation' && !intent.sector) {
    chips.push(
      chip('INTENT_PATCH:corridor_exp', 'TEXT_MESSAGE', 'Noida Expressway (IT & Luxury)', '', { message: 'Tell me about living along the Noida Expressway corridor' }, priority++),
      chip('INTENT_PATCH:corridor_central', 'TEXT_MESSAGE', 'Central Noida (Schools & Metro)', '', { message: 'Tell me about family living in Central Noida 7X sectors' }, priority++),
      chip('INTENT_PATCH:corridor_gnw', 'TEXT_MESSAGE', 'Gr. Noida West (Value & Space)', '', { message: 'Tell me about Greater Noida West for spacious family flats' }, priority++),
      chip('EXPLORE:lifestyle_commute_delhi', 'TEXT_MESSAGE', 'Commuting to Delhi/Gurgaon', '', { message: 'I need easy daily connectivity to Delhi and South Delhi' }, priority++)
    )
    return chips
  }

  // ─── 4. Sector is Known, but Configuration / BHK is missing (Only if user has NOT given BHK) ──
  if (intent.sector && (!intent.bhk || intent.bhk.length === 0)) {
    const sec = intent.sector
    chips.push(
      chip(`INTENT_PATCH:bhk_2:${sec}`, 'INTENT_PATCH', `2 BHK in ${sec}`, '', { patch: { sector: sec, bhk: [2] }, label: `2 BHK in ${sec}` }, priority++),
      chip(`INTENT_PATCH:bhk_3:${sec}`, 'INTENT_PATCH', `3 BHK in ${sec}`, '', { patch: { sector: sec, bhk: [3] }, label: `3 BHK in ${sec}` }, priority++),
      chip(`INTENT_PATCH:bhk_4:${sec}`, 'INTENT_PATCH', `4 BHK in ${sec}`, '', { patch: { sector: sec, bhk: [4] }, label: `4 BHK in ${sec}` }, priority++),
      chip(`EXPLORE:rtm:${sec}`, 'TEXT_MESSAGE', `Ready to Move in ${sec}`, '', { message: `Show me ready-to-move projects with Occupancy Certificate in ${sec}` }, priority++)
    )
    return chips
  }

  // ─── 5. Sector & BHK Known, but Budget is missing ─────────────────────────────
  if (intent.sector && intent.bhk?.length && !intent.budgetMax) {
    const sec = intent.sector
    const cleanSec = sec.startsWith('Sector') ? sec : `Sector ${sec}`
    chips.push(
      chip(`INTENT_PATCH:budget_low:${sec}`, 'INTENT_PATCH', `Under ₹1.2 Cr`, '', { patch: { sector: sec, bhk: intent.bhk, budgetMax: 1.2 }, label: `Under ₹1.2 Cr` }, priority++),
      chip(`INTENT_PATCH:budget_mid:${sec}`, 'INTENT_PATCH', `₹1.2 – ₹1.6 Cr`, '', { patch: { sector: sec, bhk: intent.bhk, budgetMin: 1.2, budgetMax: 1.6 }, label: `₹1.2 – ₹1.6 Cr` }, priority++),
      chip(`INTENT_PATCH:budget_high:${sec}`, 'INTENT_PATCH', `₹1.6 Cr+`, '', { patch: { sector: sec, bhk: intent.bhk, budgetMin: 1.6 }, label: `₹1.6 Cr+` }, priority++),
      chip(`EXPLORE:tradeoffs:${sec}`, 'TEXT_MESSAGE', `${cleanSec} Pros & Cons`, '', { message: `What are the main advantages and drawbacks of living in ${cleanSec}?` }, priority++)
    )
    return chips
  }

  // ─── 6. BHK known, sector still missing — ask where ──────────────────────────
  // Without this the engine had no deterministic answer for "show me 3 BHK": every
  // branch above needs intent.sector, and the bhk fallback below is skipped because
  // bhk is already known, so it fell through to generic floor chips and never asked
  // for location. The LLM chip path masked it whenever a provider was reachable.
  if (!intent.sector && inventory?.sectors?.length) {
    // Never offer a sector the buyer has already named — suggesting "Sector 150"
    // to someone who just typed "3 BHK in Sector 150" reads as not listening.
    const saidAlready = chatHistory
      .filter(m => m.role === 'user')
      .map(m => String(m.content ?? '').toLowerCase())
      .join(' ')
    const candidates = inventory.sectors
      .filter(({ sector }) => !saidAlready.includes(sector.toLowerCase()))
      .slice(0, 3)

    if (candidates.length === 0) return chips
    for (const { sector, projectCount } of candidates) {
      chips.push(chip(
        `INTENT_PATCH:clarify_sector:${sector.replace(/\s+/g, '_')}`,
        'INTENT_PATCH',
        `${sector} (${projectCount} projects)`,
        '',
        { patch: { sector, ...(intent.bhk?.length ? { bhk: intent.bhk } : {}) }, label: sector },
        priority++,
      ))
    }
    return chips
  }

  // Fallback missing field inventory chips
  if (missingFields.includes('bhk') && (!intent.bhk || intent.bhk.length === 0) && inventory?.bhkOptions) {
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

  return chips
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
  if (intent.sector && intent.bhk?.length && !intent.budgetMax && !intent.budgetMin) {
    const resultPrices = results.map(r => r.price_min_cr).filter((p): p is number => typeof p === 'number' && p > 0)
    let dynamicBuckets = inventory?.budgetBuckets.slice(0, 3) ?? []
    if (resultPrices.length > 0) {
      const minP = Math.min(...resultPrices)
      const maxP = Math.max(...resultPrices)
      const midP = Number(((minP + maxP) / 2).toFixed(2))
      dynamicBuckets = [
        { label: `Under ₹${midP < 1 ? Math.round(midP * 100) + 'L' : midP + ' Cr'}`, min: 0, max: midP },
        { label: `₹${minP < 1 ? Math.round(minP * 100) + 'L' : minP + ' Cr'}–${maxP < 1 ? Math.round(maxP * 100) + 'L' : maxP + ' Cr'}`, min: minP, max: maxP },
        { label: `Up to ₹${Number((maxP * 1.25).toFixed(2))} Cr`, min: 0, max: Number((maxP * 1.25).toFixed(2)) }
      ]
    }

    for (const bucket of dynamicBuckets) {
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

function filterByHistory(pool: ChipAction[], chatHistory: unknown[]): ChipAction[] {
  const historyText = chatHistory
    .filter((m): m is ChatMessage => isChatMessage(m))
    .filter(m => m.role === 'user')
    .map(m => String(m.content ?? '').toLowerCase())
    .join(' ')
  return pool.filter(c => {
    const labelLower = c.label.toLowerCase()
    const isDiscussed = historyText.includes(labelLower) ||
      ((c.payload?.text as string)?.toLowerCase() && historyText.includes((c.payload.text as string).toLowerCase()))
    return !isDiscussed
  })
}

function getFallbackChips(pool: ChipAction[], chips: ChipAction[], maxCount: number, chatHistory: unknown[]): ChipAction[] {
  const needed = maxCount - chips.length
  if (needed <= 0) return chips
  
  const turn = Math.floor(chatHistory.length / 2)
  const maxStartIndex = Math.max(0, pool.length - needed)
  const startIndex = maxStartIndex > 0 ? (turn % maxStartIndex) : 0
  
  chips.push(...pool.slice(startIndex, startIndex + needed))
  return chips
}

/** Unified chip pipeline: candidates → dedupe → rank → cap-4 */
function capChips(candidates: ChipAction[]): ChipAction[] {
  if (candidates.length <= 4) return candidates
  const hasGroups = candidates.some(c => c.group)
  if (hasGroups) return candidates.slice(0, 4)

  const picked: ChipAction[] = []
  const take = (pool: ChipAction[], n: number) => {
    for (const c of pool) {
      if (picked.length >= n) break
      if (!picked.includes(c)) picked.push(c)
    }
  }
  take(candidates.filter(c => c.priority <= 2), 2)              // critical first
  take(candidates.filter(c => c.priority === 3), 4)             // then high-value
  take(candidates, 4)                                          // then anything left — never waste a slot
  return picked.slice(0, 4)
}

export function getFloorChips(intent: Intent, results: ScoredProject[] = []): ChipAction[] {
  const safeResults = results || []
  // If we do have results, offer actions grounded in them.
  if (safeResults.length > 0) {
    const projects = safeResults.slice(0, 4).map(r => ({ id: r.id, name: r.name }))
    const pIds = projects.map(p => p.id).join(':')
    const out: ChipAction[] = [
      chip(`TEXT_MESSAGE:floor_tradeoffs:${pIds}`, 'TEXT_MESSAGE', 'What are the trade-offs?', '',
        { actionPrefix: 'What are the main trade-offs and risks of', projects, actionSuffix: '?' }, 1),
      chip(`TEXT_MESSAGE:floor_tell_more:${pIds}`, 'TEXT_MESSAGE', 'Tell me more', '',
        { actionPrefix: 'Tell me more about', projects }, 2),
    ]
    if (results.length >= 2) {
      out.push(chip(`COMPARE_PROPERTIES:floor_compare:${pIds}`, 'COMPARE_PROPERTIES',
        `Compare these ${Math.min(results.length, 3)}`, '', { mode: 'multi', projects }, 3))
    }
    return out
  }

  // No results: safe, always-answerable questions. No invented inventory.
  const sectorBit = intent.sector ? ` in ${intent.sector}` : ' in Noida'
  return [
    chip('TEXT_MESSAGE:floor_ready_to_move', 'TEXT_MESSAGE', 'Ready-to-move homes', '',
      { text: `Show me ready-to-move projects${sectorBit}.` }, 1),
    chip('TEXT_MESSAGE:floor_buying_guide', 'TEXT_MESSAGE', 'What should I check first?', '',
      { text: 'What should I check before buying a property in Noida?' }, 2),
    chip('TEXT_MESSAGE:floor_budget_help', 'TEXT_MESSAGE', 'Help me set a budget', '',
      { text: 'Help me work out a realistic budget and EMI.' }, 3),
  ]
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
  isUserMessage: boolean = false,
  usedProvider?: { provider: string; envKey: string },
  opts: ConversationStateOptions = {}
): Promise<ConversationState> {
  const allowLlmChips = opts.allowLlmChips ?? true
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
        chips = await getClarifyingChips(intent, missingFields, results, chatHistory, chipInventory, usedProvider, allowLlmChips)
        break
      case 'DISCOVERY':
        chips = getDiscoveryChips(chipInventory)
        break
      case 'SEARCHING':
        // While searching, offer context-aware refinement chips (not discovery chips)
        chips = getSearchRefinementChips(intent, results, chatHistory, chipInventory)
        break
      case 'RESEARCH':
        chips = await generateDynamicChips('research', results, chatHistory, usedProvider, allowLlmChips)
        break
      case 'COMPARING':
        chips = await generateDynamicChips('compare', results, chatHistory, usedProvider, allowLlmChips)
        break
      case 'DECIDING':
        chips = await generateDynamicChips('decide', results, chatHistory, usedProvider, allowLlmChips)
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
  const preCapChips = chips.length
  chips = capChips(chips)

  // FLOOR: the pipeline must never hand the UI an empty chip row.
  // Every filter above is subtractive; this is the only additive step.
  if (chips.length === 0) {
    chips = capChips(getFloorChips(intent, results))
    console.warn('[CONV_ENGINE] chip floor engaged', { stage, preCapChips, emitted: chips.length })
  }

  if (stage === 'CLARIFYING') console.log('[CONV_ENGINE] CLARIFYING stage:', { missingFields, preCapChips, postCapChips: chips.length, labels: chips.map(c => c.label) })
  return { stage, thinking, chips, missingFields, confidence }
}
