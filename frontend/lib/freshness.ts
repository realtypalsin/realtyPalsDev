/**
 * How old a fact is allowed to be before we stop presenting it as current.
 *
 * A single staleness window across every fact would be wrong in both directions.
 * Construction progress a month old is misleading; a project's land tenure is
 * still true a year later. Applying "hide after 10 days" uniformly would empty
 * most of the page while leaving genuinely stale progress photos on it.
 *
 * So staleness is tiered by how fast the underlying fact actually moves, and the
 * response is graded rather than binary:
 *
 *   fresh    within the window — show the date quietly
 *   ageing   past the window — show the date prominently, keep the content
 *   stale    well past it — hide volatile content, keep durable content labelled
 *
 * Volatile facts (construction stage, live pricing) are hidden when stale
 * because a wrong one actively misleads. Durable facts (RERA number, land
 * tenure) are never hidden — an old RERA number is still the RERA number, and
 * removing it would be less honest than dating it.
 */

export type FreshnessLevel = 'fresh' | 'ageing' | 'stale' | 'unknown'

export interface FreshnessPolicy {
  /** Days after which the fact is shown as ageing. */
  freshDays: number
  /** Days after which a volatile fact is hidden entirely. */
  staleDays: number
  /**
   * Whether being stale should hide the content.
   * False for facts that remain true regardless of age.
   */
  hideWhenStale: boolean
  label: string
}

export const FRESHNESS: Record<string, FreshnessPolicy> = {
  // Moves weekly on an active site. A stale progress claim is the one most
  // likely to be quoted back at us on a site visit.
  construction: { freshDays: 30, staleDays: 90, hideWhenStale: true, label: 'Construction progress' },

  // Developer price lists move on launch phases and quarterly revisions.
  pricing: { freshDays: 60, staleDays: 180, hideWhenStale: true, label: 'Pricing' },
  costSheet: { freshDays: 90, staleDays: 270, hideWhenStale: true, label: 'Cost sheet' },
  paymentPlans: { freshDays: 90, staleDays: 270, hideWhenStale: true, label: 'Payment plans' },

  // Analyst opinion ages with the market it describes.
  intelligence: { freshDays: 90, staleDays: 270, hideWhenStale: true, label: 'Analysis' },

  // Compliance facts change rarely, and matter most when they do. Never hidden:
  // an old RERA number is still the RERA number.
  compliance: { freshDays: 120, staleDays: 365, hideWhenStale: false, label: 'Compliance' },

  // Physical description of the building. Effectively static.
  specifications: { freshDays: 180, staleDays: 540, hideWhenStale: false, label: 'Specifications' },
  amenities: { freshDays: 180, staleDays: 540, hideWhenStale: false, label: 'Amenities' },
}

export function daysSince(date: string | Date | null | undefined): number | null {
  if (!date) return null
  const then = new Date(date).getTime()
  if (Number.isNaN(then)) return null
  return Math.max(0, Math.floor((Date.now() - then) / 86_400_000))
}

export function freshnessLevel(
  date: string | Date | null | undefined,
  policy: FreshnessPolicy,
): FreshnessLevel {
  const days = daysSince(date)
  if (days === null) return 'unknown'
  if (days <= policy.freshDays) return 'fresh'
  if (days <= policy.staleDays) return 'ageing'
  return 'stale'
}

/**
 * Whether to render a section at all.
 *
 * Unknown is deliberately shown: 70% of projects carry no verification
 * timestamp, and hiding all of them would remove most of the site over a
 * missing column rather than a known problem. It is labelled instead.
 */
export function shouldHide(
  date: string | Date | null | undefined,
  policy: FreshnessPolicy,
): boolean {
  return policy.hideWhenStale && freshnessLevel(date, policy) === 'stale'
}

/** "3 days ago", "2 weeks ago", "5 months ago". */
export function formatAge(date: string | Date | null | undefined): string | null {
  const days = daysSince(date)
  if (days === null) return null
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 14) return 'last week'
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`
  if (days < 365) return `${Math.floor(days / 30)} months ago`
  const years = Math.floor(days / 365)
  return years === 1 ? 'over a year ago' : `${years} years ago`
}

/** The line shown under a section heading. */
export function freshnessLabel(
  date: string | Date | null | undefined,
  policy: FreshnessPolicy,
): { text: string; level: FreshnessLevel } {
  const level = freshnessLevel(date, policy)
  if (level === 'unknown') {
    return { text: 'Verification date not recorded', level }
  }
  const age = formatAge(date)
  if (level === 'fresh') return { text: `Verified ${age}`, level }
  if (level === 'ageing') return { text: `Last verified ${age} — may have changed since`, level }
  return { text: `Last verified ${age} — treat as out of date`, level }
}
