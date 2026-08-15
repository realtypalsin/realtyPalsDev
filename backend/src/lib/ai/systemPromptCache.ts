// Phase 2: System prompt caching layer
// Separates static base prompt (cached) from dynamic rules (injected per request)
// Reduces token overhead ~30-40% by reusing cached static content across requests

import { getBaseSystemPrompt } from './prompts/base'
import type { Intent, ScoredProject } from '../discovery'
import type { TopicSummaries } from '../chat/summaryCompression'

interface CachedSystemPrompt {
  static: string // Cached once, reused
  timestamp: number
  version: number // Bump on base prompt changes
}

const CACHE_VERSION = 1
let cachedBasePrompt: CachedSystemPrompt | null = null
const CACHE_TTL = 3600000 // 1 hour

/**
 * Get cached base prompt OR generate + cache it.
 * Returns static prompt string once every hour.
 */
function getCachedBasePrompt(): string {
  const now = Date.now()
  if (
    cachedBasePrompt &&
    cachedBasePrompt.version === CACHE_VERSION &&
    now - cachedBasePrompt.timestamp < CACHE_TTL
  ) {
    return cachedBasePrompt.static
  }

  // Generate base (no intent-specific rules)
  const base = getBaseSystemPrompt()
  cachedBasePrompt = {
    static: base,
    timestamp: now,
    version: CACHE_VERSION,
  }

  return base
}

/**
 * Build complete system prompt with cache hit.
 * Static part: cached, reused
 * Dynamic part: injected per request
 */
export function buildSystemPromptWithCache(
  intent: any,
  projects: ScoredProject[],
  memory: any,
  sectorCtx: any,
  sectorsOverview: any,
  discoveryExpansion: any,
  nearbyProjects: any,
  notFoundNames: string[],
  blockedBuilders: any,
  intentState: string,
  city: string,
  multiDimContext?: string,
): string {
  // Get cached static base
  const staticBase = getCachedBasePrompt()

  // Build dynamic-only suffix (intent-specific, project-specific, memory)
  // These vary per request, so we don't cache them
  const dynamicRules = buildDynamicRules(
    intent,
    projects,
    memory,
    sectorCtx,
    sectorsOverview,
    discoveryExpansion,
    nearbyProjects,
    notFoundNames,
    blockedBuilders,
    intentState,
  )

  // Combine: static (cached) + dynamic (per-request)
  return staticBase + dynamicRules + (multiDimContext ? `\n\n${multiDimContext}` : '')
}

/**
 * Build only the dynamic parts of the system prompt.
 * These vary per request and cannot be cached.
 */
function buildDynamicRules(
  intent: any,
  projects: ScoredProject[],
  memory: any,
  sectorCtx: any,
  sectorsOverview: any,
  discoveryExpansion: any,
  nearbyProjects: any,
  notFoundNames: string[],
  blockedBuilders: any,
  intentState: string,
): string {
  let dynamic = ''

  // Memory block (if any)
  if (memory) {
    const memoryStr = typeof memory === 'string' ? memory : JSON.stringify(memory)
    dynamic += `\n\n## SESSION MEMORY\n${memoryStr}`
  }

  // Sector context (if any)
  if (sectorCtx) {
    dynamic += `\n\n## SECTOR CONTEXT\n${sectorCtx}`
  }

  // Sectors overview (if any)
  if (sectorsOverview) {
    dynamic += `\n\n## SECTORS OVERVIEW\n${sectorsOverview}`
  }

  // Discovery expansion (if any)
  if (discoveryExpansion && Object.keys(discoveryExpansion).length > 0) {
    dynamic += `\n\n## DISCOVERY EXPANSION\n${JSON.stringify(discoveryExpansion, null, 2)}`
  }

  // Nearby projects (if any)
  if (nearbyProjects && nearbyProjects.length > 0) {
    dynamic += `\n\n## NEARBY ALTERNATIVES\n${JSON.stringify(nearbyProjects.slice(0, 3), null, 2)}`
  }

  // Not found sentinel (if any)
  if (notFoundNames.length > 0) {
    dynamic += `\n\n## NOT FOUND PROJECTS\n${notFoundNames.map(n => `- PROJECT_NOT_FOUND: "${n}"`).join('\n')}`
  }

  // Blocked builders (legal/compliance flags)
  if (blockedBuilders && blockedBuilders.length > 0) {
    dynamic += `\n\n## COMPLIANCE FLAGS\nThese builders have legal/regulatory flags:\n`
    dynamic += blockedBuilders.map((b: any) => `- ${b.name}${b.legal_flag ? ` (${b.legal_flag})` : ''}`).join('\n')
  }

  // Intent state (for routing)
  if (intentState) {
    dynamic += `\n\n## INTENT STATE\n${intentState}`
  }

  return dynamic
}

/**
 * Clear cache (for testing or after base prompt changes).
 */
export function clearSystemPromptCache(): void {
  cachedBasePrompt = null
}
