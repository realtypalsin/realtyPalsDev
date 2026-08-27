import {
  daysSince,
  formatAge,
  freshnessLevel,
  shouldHide,
  freshnessLabel,
  FRESHNESS,
} from '@/lib/freshness'

// A blanket "hide after 10 days" would empty most of the page: a cost sheet does
// not change weekly, and 70% of projects carry no verification timestamp at all.
// Staleness is tiered by how fast the underlying fact actually moves.

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString()

describe('daysSince', () => {
  it('measures whole days', () => {
    expect(daysSince(daysAgo(0))).toBe(0)
    expect(daysSince(daysAgo(5))).toBe(5)
    expect(daysSince(daysAgo(400))).toBe(400)
  })

  it('returns null rather than 0 for a missing or unparseable date', () => {
    // 0 would read as "verified today" — the opposite of what we know.
    expect(daysSince(null)).toBeNull()
    expect(daysSince(undefined)).toBeNull()
    expect(daysSince('not a date')).toBeNull()
  })

  it('never returns a negative age for a future timestamp', () => {
    expect(daysSince(new Date(Date.now() + 86_400_000))).toBe(0)
  })
})

describe('formatAge', () => {
  it('reads naturally at each scale', () => {
    expect(formatAge(daysAgo(0))).toBe('today')
    expect(formatAge(daysAgo(1))).toBe('yesterday')
    expect(formatAge(daysAgo(4))).toBe('4 days ago')
    expect(formatAge(daysAgo(10))).toBe('last week')
    expect(formatAge(daysAgo(30))).toBe('4 weeks ago')
    expect(formatAge(daysAgo(120))).toBe('4 months ago')
    expect(formatAge(daysAgo(400))).toBe('over a year ago')
  })

  it('returns null for an unknown date', () => {
    expect(formatAge(null)).toBeNull()
  })
})

describe('freshnessLevel — tiered by volatility', () => {
  it('ages construction progress fastest', () => {
    // A month-old progress claim is the one most likely to be quoted back at us.
    expect(freshnessLevel(daysAgo(10), FRESHNESS.construction)).toBe('fresh')
    expect(freshnessLevel(daysAgo(45), FRESHNESS.construction)).toBe('ageing')
    expect(freshnessLevel(daysAgo(120), FRESHNESS.construction)).toBe('stale')
  })

  it('lets specifications age slowly', () => {
    // The physical building does not change; the same 120 days is still fresh.
    expect(freshnessLevel(daysAgo(120), FRESHNESS.specifications)).toBe('fresh')
    expect(freshnessLevel(daysAgo(400), FRESHNESS.specifications)).toBe('ageing')
  })

  it('reports unknown rather than guessing', () => {
    expect(freshnessLevel(null, FRESHNESS.compliance)).toBe('unknown')
  })
})

describe('shouldHide', () => {
  it('hides stale volatile content', () => {
    expect(shouldHide(daysAgo(200), FRESHNESS.construction)).toBe(true)
    expect(shouldHide(daysAgo(400), FRESHNESS.pricing)).toBe(true)
  })

  it('never hides compliance, however old', () => {
    // An old RERA number is still the RERA number. Removing it would be less
    // honest than dating it.
    expect(shouldHide(daysAgo(2000), FRESHNESS.compliance)).toBe(false)
    expect(shouldHide(daysAgo(2000), FRESHNESS.specifications)).toBe(false)
  })

  it('does not hide content merely because the date is unknown', () => {
    // 70% of projects have no timestamp; hiding them would remove most of the
    // site over a missing column rather than a known problem.
    expect(shouldHide(null, FRESHNESS.construction)).toBe(false)
    expect(shouldHide(null, FRESHNESS.pricing)).toBe(false)
  })

  it('does not hide fresh or merely ageing content', () => {
    expect(shouldHide(daysAgo(10), FRESHNESS.construction)).toBe(false)
    expect(shouldHide(daysAgo(45), FRESHNESS.construction)).toBe(false)
  })
})

describe('freshnessLabel', () => {
  it('states the age plainly when fresh', () => {
    const { text, level } = freshnessLabel(daysAgo(3), FRESHNESS.compliance)
    expect(level).toBe('fresh')
    expect(text).toBe('Verified 3 days ago')
  })

  it('warns that an ageing fact may have moved', () => {
    const { text, level } = freshnessLabel(daysAgo(200), FRESHNESS.compliance)
    expect(level).toBe('ageing')
    expect(text).toMatch(/may have changed since/)
  })

  it('says so when a fact is out of date', () => {
    const { text, level } = freshnessLabel(daysAgo(500), FRESHNESS.compliance)
    expect(level).toBe('stale')
    expect(text).toMatch(/treat as out of date/)
  })

  it('admits when the date is not recorded', () => {
    const { text } = freshnessLabel(null, FRESHNESS.compliance)
    expect(text).toBe('Verification date not recorded')
    // Never implies recency it cannot support.
    expect(text).not.toMatch(/today|recent|just now/i)
  })
})

describe('policy sanity', () => {
  it('always sets staleDays beyond freshDays', () => {
    for (const [name, p] of Object.entries(FRESHNESS)) {
      expect(p.staleDays).toBeGreaterThan(p.freshDays)
      expect(p.label.length).toBeGreaterThan(2)
      expect(name).toBeTruthy()
    }
  })

  it('never hides a compliance-class fact', () => {
    expect(FRESHNESS.compliance.hideWhenStale).toBe(false)
    expect(FRESHNESS.specifications.hideWhenStale).toBe(false)
    expect(FRESHNESS.amenities.hideWhenStale).toBe(false)
  })
})
