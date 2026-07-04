// backend/src/lib/discovery/intent.ts
import { Intent, IntentState } from './types'
import { CITY_LEVEL_TERMS } from './constants'

export function isCityLevel(sector: string): boolean {
  return CITY_LEVEL_TERMS.includes(sector.toLowerCase().trim())
}

export function getIntentState(intent: Intent, hasExistingResults = false): IntentState {
  const hasBhk = (intent.bhk?.length ?? 0) > 0
  const hasBudget = !!intent.budgetMax
  // City-level (e.g. "Noida") and sector-level both count as location signals
  const hasSector = !!intent.sector
  const hasBuilder = !!intent.builderName
  const hasProjectNames = (intent.projectNames?.length ?? 0) > 0
  // Explicit timeline/possession intent (e.g. "ready to move", "possession in 1 year")
  const hasPossession = !!intent.possession

  if (!hasBhk && !hasBudget && !hasSector && !hasBuilder && !hasProjectNames && !hasPossession) return 'COLD'

  // Project names (comparison query) → fetch those specific projects.
  // Any TWO of {BHK, budget, sector} is enough to search (e.g. "3BHK in Sector 150",
  // "under 1.5Cr in Sector 150") — or an explicit builder/project. Asking for a 3rd
  // signal before showing anything feels like an interrogation, not advice.
  const signals = [hasBhk, hasBudget, hasSector].filter(Boolean).length
  const hasLifestyleKeywords = (intent.lifestyleKeywords?.length ?? 0) > 0
  if (
    hasProjectNames ||
    hasBuilder ||
    signals >= 2 ||
    (hasSector && hasLifestyleKeywords) ||
    (hasSector && hasPossession) ||   // "RTM Sector 137" → search immediately
    (hasBudget && hasPossession)      // "under 2Cr ready to move" → enough signal
  ) {
    return hasExistingResults ? 'SHORTLISTED' : 'READY_TO_SEARCH'
  }

  return 'GATHERING'
}
