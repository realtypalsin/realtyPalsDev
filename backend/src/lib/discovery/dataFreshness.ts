/**
 * Data Freshness Management
 *
 * Handles freshness detection, stale data warnings, and re-verification triggers.
 * Called when building ChatResponse to include freshness metadata.
 */

export interface DataFreshnessInfo {
  source: string
  verified_at?: Date
  updated_at?: Date
  freshness_display: string // "Last verified 3 days ago"
  is_stale: boolean // > 30 days
  days_old: number
  needs_reverification: boolean // confidence < 50%
}

export interface FreshnessWarning {
  severity: 'info' | 'warning' | 'critical'
  message: string
}

/**
 * Calculate days since verification/update
 */
export function calculateDaysOld(verifiedDate: Date | undefined | null): number {
  if (!verifiedDate) return 0
  const now = new Date()
  const date = new Date(verifiedDate)
  const daysOld = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, daysOld)
}

/**
 * Format freshness for display
 * Returns: "Just now", "3 days ago", "2 weeks ago", "3 months ago"
 */
export function formatFreshness(verifiedDate: Date | undefined | null): string {
  if (!verifiedDate) return 'Last verified: unknown'

  const daysOld = calculateDaysOld(verifiedDate)

  if (daysOld === 0) return 'Last verified: just now'
  if (daysOld === 1) return 'Last verified: 1 day ago'
  if (daysOld < 7) return `Last verified: ${daysOld} days ago`

  const weeksOld = Math.floor(daysOld / 7)
  if (weeksOld === 1) return 'Last verified: 1 week ago'
  if (weeksOld < 4) return `Last verified: ${weeksOld} weeks ago`

  const monthsOld = Math.floor(daysOld / 30)
  if (monthsOld === 1) return 'Last verified: 1 month ago'
  return `Last verified: ${monthsOld} months ago`
}

/**
 * Detect if data is stale (> 30 days)
 */
export function isDataStale(verifiedDate: Date | undefined | null): boolean {
  if (!verifiedDate) return false
  const daysOld = calculateDaysOld(verifiedDate)
  return daysOld > 30
}

/**
 * Determine if re-verification is needed
 * Based on confidence score (< 50% triggers re-verification)
 */
export function needsReverification(confidence: number): boolean {
  return confidence < 50
}

/**
 * Generate freshness warning based on age and confidence
 */
export function generateFreshnessWarning(
  daysOld: number,
  confidence: number,
  source: string
): FreshnessWarning | null {
  // Critical: very stale (> 120 days) or very low confidence (< 30%)
  if (daysOld > 120 || confidence < 30) {
    return {
      severity: 'critical',
      message: `${source} data is very outdated. Please verify with the builder before making a decision.`
    }
  }

  // Warning: stale (30-120 days) or low confidence (30-50%)
  if (daysOld > 30 || confidence < 50) {
    return {
      severity: 'warning',
      message: `${source} information was last verified ${daysOld} days ago. Please confirm current details.`
    }
  }

  // Info: moderately aged (7-30 days)
  if (daysOld > 7) {
    return {
      severity: 'info',
      message: `${source} information was last verified ${daysOld} days ago.`
    }
  }

  // No warning needed
  return null
}

/**
 * Build DataFreshnessInfo from data object
 */
export function buildFreshnessInfo(
  source: string,
  data: any,
  confidence: number
): DataFreshnessInfo {
  const verifiedDate = data?.verified_at || data?.updated_at
  const daysOld = calculateDaysOld(verifiedDate)
  const isStale = isDataStale(verifiedDate)
  const needsReVerify = needsReverification(confidence)

  return {
    source,
    verified_at: verifiedDate ? new Date(verifiedDate) : undefined,
    freshness_display: formatFreshness(verifiedDate),
    is_stale: isStale,
    days_old: daysOld,
    needs_reverification: needsReVerify
  }
}

/**
 * Build data_freshness object for ChatResponse
 * Maps source -> formatted freshness string
 */
export function buildDataFreshness(
  sources: Array<{ name: string; data: any }>
): Record<string, string> {
  const freshness: Record<string, string> = {}

  sources.forEach(({ name, data }) => {
    freshness[name] = formatFreshness(data?.verified_at || data?.updated_at)
  })

  return freshness
}

/**
 * Build missing_data array with warnings for stale/incomplete data
 */
export function buildMissingDataWarnings(
  sources: Array<{
    name: string
    data: any
    confidence: number
    isIncomplete?: boolean
  }>
): string[] {
  const warnings: string[] = []

  sources.forEach(({ name, data, confidence, isIncomplete }) => {
    // Add warning for very stale data
    const daysOld = calculateDaysOld(data?.verified_at || data?.updated_at)
    if (daysOld > 60) {
      warnings.push(`${name} data is very outdated (${daysOld}+ days old) — please verify`)
    }

    // Add warning for low confidence
    if (confidence < 50) {
      warnings.push(`${name} information incomplete or unverified`)
    }

    // Add warning for explicitly incomplete data
    if (isIncomplete) {
      warnings.push(`${name} data has missing fields`)
    }
  })

  return warnings
}

/**
 * Determine if response needs re-verification chips
 * Adds "verify", "refresh_data", or similar chips
 */
export function shouldShowReverificationChips(
  sources: Array<{ confidence: number }>
): boolean {
  // Show if ANY source has confidence < 50%
  return sources.some(source => source.confidence < 50)
}

/**
 * Calculate aggregate freshness for overall response
 * Returns freshest, stalest, and average
 */
export function getAggregateFreshness(
  sources: Array<{ verified_at?: Date; updated_at?: Date }>
): { freshest_days: number; stalest_days: number; average_days: number } {
  const allDays = sources
    .map(s => calculateDaysOld(s.verified_at || s.updated_at))
    .filter(d => d > 0)

  if (allDays.length === 0) {
    return { freshest_days: 0, stalest_days: 0, average_days: 0 }
  }

  return {
    freshest_days: Math.min(...allDays),
    stalest_days: Math.max(...allDays),
    average_days: Math.floor(allDays.reduce((a, b) => a + b, 0) / allDays.length)
  }
}
