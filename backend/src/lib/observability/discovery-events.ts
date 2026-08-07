// PostHog event tracking for discovery and guardrails

export interface DiscoveryResult {
  exactResults: Array<{ id: string }>
  nearbyResults: Array<{ id: string }>
  disambiguation?: string
  sectorDisambiguation?: string
}

export function trackDiscoveryBranch(
  branch: 'B1_EXACT' | 'B2_HARD_FILTER' | 'B2_FALLBACK' | 'B3_EXPANSION' | 'B4_CITYWIDE',
  result: DiscoveryResult,
  intent: any
): void {
  // In production, this would call PostHog client
  // For now, log it for observability
  if (process.env.NODE_ENV !== 'test') {
    console.log('[DISCOVERY:BRANCH]', {
      branch,
      exact_count: result.exactResults.length,
      nearby_count: result.nearbyResults.length,
      has_disambiguation: !!result.disambiguation,
      has_sector_ambiguity: !!result.sectorDisambiguation,
      request_sector: intent.sector || 'none',
      request_bhk: intent.bhk?.join(',') || 'none',
      request_budget: intent.budgetMax || 'none',
    })
  }
}

export function trackGuardrailTrigger(
  violations: any[],
  blocked: boolean,
  messageLength: number
): void {
  if (process.env.NODE_ENV !== 'test') {
    console.log('[GUARDRAIL:TRIGGERED]', {
      blocked,
      violation_count: violations.length,
      violation_types: violations.map((v) => v.type).join(','),
      message_length: messageLength,
    })
  }
}

export function trackTokenUsage(
  systemTokens: number,
  messageTokens: number,
  totalBudget: number
): void {
  if (process.env.NODE_ENV !== 'test') {
    console.log('[TOKENS:BUDGET_CHECK]', {
      system_tokens: systemTokens,
      message_tokens: messageTokens,
      total_budget: totalBudget,
      utilization_pct: Math.round(((systemTokens + messageTokens) / totalBudget) * 100),
    })
  }
}
