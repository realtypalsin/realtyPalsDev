// ---------------------------------------------------------------------------
// Confidence Engine
//
// Determines whether the system has enough information to answer safely.
// Pure deterministic function — no LLM, no async.
// ---------------------------------------------------------------------------
import type { Intent } from './types'
import type { ChipInventory } from './chipInventory'
import { isCityLevel } from './intent'

export interface ConfidenceResult {
  score:   number           // 0.0 – 1.0
  level:  'HIGH' | 'MEDIUM' | 'LOW'
  reason: string
}

export interface ClarificationOption {
  label: string   // display text on chip
  value: string   // what to append to the next user message
}

export interface ClarificationRequest {
  question: string
  options:  ClarificationOption[]
}

// ---------------------------------------------------------------------------

export function computeConfidence(intent: Intent): ConfidenceResult {
  const hasProjectNames = (intent.projectNames?.length ?? 0) > 0
  const hasBuilder      = !!intent.builderName
  const hasBhk          = (intent.bhk?.length ?? 0) > 0
  const hasBudget       = !!intent.budgetMax
  const hasSector       = !!intent.sector && !isCityLevel(intent.sector)
  const hasLifestyle    = (intent.lifestyleKeywords?.length ?? 0) > 0

  // ── HIGH: specific project or builder with name → answer immediately ──────
  if (hasProjectNames) {
    return { score: 0.95, level: 'HIGH', reason: 'Specific project name identified' }
  }
  if (hasBuilder) {
    return { score: 0.90, level: 'HIGH', reason: 'Builder name identified — can search directly' }
  }

  // ── HIGH: 3 strong signals ────────────────────────────────────────────────
  const strongSignals = [hasBhk, hasBudget, hasSector].filter(Boolean).length
  if (strongSignals === 3) {
    return { score: 0.88, level: 'HIGH', reason: 'BHK, budget, and sector all known' }
  }

  // ── MEDIUM: 2 strong signals + optional lifestyle ─────────────────────────
  if (strongSignals === 2) {
    return { score: 0.72, level: 'MEDIUM', reason: 'Two key signals known — results shown, refinement possible' }
  }

  // ── MEDIUM: 1 strong signal + lifestyle ───────────────────────────────────
  if (strongSignals === 1 && hasLifestyle) {
    return { score: 0.60, level: 'MEDIUM', reason: 'Lifestyle preference + one key signal — showing results' }
  }

  // ── LOW: single signal, no lifestyle ─────────────────────────────────────
  return { score: 0.30, level: 'LOW', reason: 'Only one signal — need more context for a useful answer' }
}

// ---------------------------------------------------------------------------
// Clarification chips builder
// Returns the chips to show for LOW confidence only.
// Builds options dynamically from live inventory.
// ---------------------------------------------------------------------------
export function buildClarificationOptions(intent: Intent, inventory: ChipInventory | null): ClarificationRequest {
  const hasBhk    = (intent.bhk?.length ?? 0) > 0
  const hasBudget = !!intent.budgetMax
  const hasSector = !!intent.sector && !isCityLevel(intent.sector)
  const bhkLabel  = hasBhk ? intent.bhk!.map(b => `${b}BHK`).join('/') : null
  const budgetLabel = hasBudget ? `₹${intent.budgetMax}Cr` : null

  // Build dynamic sector chips from inventory
  const sectorChips = inventory?.sectors.slice(0, 3).map(s => ({
    label: s.sector,
    value: s.sector,
  })) ?? []
  sectorChips.push({ label: 'Other sector', value: 'Tell me more about sectors in Noida' })

  // Build dynamic BHK chips from inventory
  const bhkChips = inventory?.bhkOptions.map(bhk => ({
    label: `${bhk} BHK`,
    value: `${bhk} BHK`,
  })) ?? [
    { label: '2 BHK', value: '2 BHK' },
    { label: '3 BHK', value: '3 BHK' },
    { label: '4 BHK', value: '4 BHK' },
  ]
  bhkChips.push({ label: 'Any config', value: 'Show me 2, 3 and 4 BHK options' })

  // Build dynamic budget chips from inventory
  const budgetChips = inventory?.budgetBuckets.slice(0, 3).map(b => ({
    label: b.label,
    value: `Budget ${b.label.toLowerCase()}`,
  })) ?? [
    { label: 'Under 1.5 Cr', value: 'Budget under 1.5 Cr' },
    { label: 'Under 2.5 Cr', value: 'Budget under 2.5 Cr' },
    { label: 'Under 3.5 Cr', value: 'Budget under 3.5 Cr' },
  ]

  // Two knowns
  if (hasSector && hasBhk && !hasBudget) {
    return {
      question: `${intent.sector} and ${bhkLabel} noted. What is your maximum budget?`,
      options: budgetChips,
    }
  }

  if (hasBhk && hasBudget && !hasSector) {
    return {
      question: `${bhkLabel} under ${budgetLabel} noted. Any preferred sector?`,
      options: sectorChips,
    }
  }

  if (hasSector && hasBudget && !hasBhk) {
    return {
      question: `${intent.sector} under ${budgetLabel} noted. What configuration are you looking for?`,
      options: bhkChips,
    }
  }

  // One known
  if (hasBhk && !hasSector && !hasBudget) {
    return {
      question: `${bhkLabel} noted. Which sector or area are you considering?`,
      options: sectorChips,
    }
  }

  if (hasBudget && !hasSector && !hasBhk) {
    return {
      question: `Budget under ${budgetLabel} noted. Which sector and configuration?`,
      options: [...sectorChips.slice(0, 2), ...bhkChips.slice(0, 2)],
    }
  }

  if (hasSector && !hasBhk && !hasBudget) {
    return {
      question: `${intent.sector} noted. What configuration are you looking for?`,
      options: bhkChips,
    }
  }

  // Zero knowns
  return {
    question: 'What are you looking for? (area, configuration, or budget)',
    options: [
      ...bhkChips.slice(0, 3),
      { label: 'Tell me options', value: 'What options are available in Noida under 2 crore?' },
    ],
  }
}
