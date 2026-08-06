// Context builder with tiered truncation for Phase 2 token budget protection.
// Implements simple token-aware truncation: remove optional fields when budget tight.

import type { ScoredProject } from '../discovery'

const SAFE_TOKEN_CEILING = 100_000

/**
 * Estimate tokens using 4 chars per token (conservative).
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Simple tiered truncation: Drop lowest-priority fields when token budget is tight.
 * Strategy: Drop competitors → decision details → keep core (name, builder, price, images, possession)
 *
 * Tier 1 (always keep): id, name, slug, sector, builder, price_*, unit_types, possession_date, images, rera_number
 * Tier 2 (drop if needed): decision_profile, recommendation_profile, top_amenities, top_connectivity, persona_profile
 * Tier 3 (drop first): competitors
 *
 * @param projects Array of ScoredProjects to potentially truncate
 * @param systemPromptEstimate Estimated tokens for the system prompt
 * @param ceiling Token ceiling (default 100k)
 * @returns Truncated projects array (copy with omitted fields)
 */
export function truncateByTiers(
  projects: ScoredProject[],
  systemPromptEstimate: number,
  ceiling: number = SAFE_TOKEN_CEILING,
): ScoredProject[] {
  const remaining = ceiling - systemPromptEstimate
  if (remaining <= 0) return projects.slice(0, 1) // At least return first project

  // Measure current footprint
  let currentTokens = estimateTokens(JSON.stringify(projects))
  if (currentTokens <= remaining) {
    return projects // Fits as-is
  }

  // Tier 3: Try dropping competitors
  const withoutCompetitors = projects.map((p) => {
    const { competitors, ...rest } = p as any
    return rest as ScoredProject
  })
  currentTokens = estimateTokens(JSON.stringify(withoutCompetitors))
  if (currentTokens <= remaining) {
    return withoutCompetitors
  }

  // Tier 2: Try dropping decision profiles, detailed amenities/connectivity
  const withoutDetails = projects.map((p) => {
    const {
      competitors,
      decision_profile,
      recommendation_profile,
      top_amenities,
      top_connectivity,
      ...rest
    } = p as any
    return rest as ScoredProject
  })
  currentTokens = estimateTokens(JSON.stringify(withoutDetails))
  if (currentTokens <= remaining) {
    return withoutDetails
  }

  // Last resort: drop projects from the end, keeping only core data
  for (let i = projects.length - 1; i > 0; i--) {
    const subset = projects.slice(0, i).map((p) => {
      const {
        competitors,
        decision_profile,
        recommendation_profile,
        top_amenities,
        top_connectivity,
        ...rest
      } = p as any
      return rest as ScoredProject
    })
    currentTokens = estimateTokens(JSON.stringify(subset))
    if (currentTokens <= remaining) {
      return subset
    }
  }

  // Final fallback: return first project with minimal fields
  if (projects.length > 0) {
    const p = projects[0]
    const {
      competitors,
      decision_profile,
      recommendation_profile,
      top_amenities,
      top_connectivity,
      ...rest
    } = p as any
    return [rest as ScoredProject]
  }

  return []
}

/**
 * Serializes persona profile to a compact buyer-fit card.
 * Example: "Best For: UPGRADER · Income ₹8L+/mo · Nuclear family"
 *
 * @param persona Persona profile object (if present on project)
 * @returns Compact persona string or empty string
 */
export function serializePersona(persona: any): string {
  if (!persona) return ''

  const parts: string[] = []

  // Primary persona label
  if (persona.primary_persona) {
    const label = persona.primary_persona
      .split('_')
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ')
    parts.push(label)
  }

  // Income range (if present)
  if (persona.income_range) {
    parts.push(`Income ${persona.income_range}`)
  }

  // Family stage (if present)
  if (persona.family_stage) {
    const stage = persona.family_stage
      .split('_')
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ')
    parts.push(stage)
  }

  if (parts.length === 0) return ''
  return `Best For: ${parts.join(' · ')}`
}

/**
 * Injects persona context into projects for AI reference.
 * Adds "_persona_fit" field with human-readable buyer fit summary.
 *
 * @param projectsSummary JSON string of projects array
 * @returns Modified summary with persona notes (if available)
 */
export function injectPersonaContext(projectsSummary: string): string {
  try {
    const parsed = JSON.parse(projectsSummary)
    if (!Array.isArray(parsed)) return projectsSummary

    const withPersona = parsed.map((p: any) => {
      const personaCard = serializePersona(p.persona_profile)
      return {
        ...p,
        ...(personaCard ? { _persona_fit: personaCard } : {}),
      }
    })

    return JSON.stringify(withPersona)
  } catch {
    return projectsSummary
  }
}
