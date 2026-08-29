// backend/src/lib/ai/marketTable.ts
import { priceLabelFor } from '../discovery/scoring'

import type { MicroMarketSummary } from '../discovery/sectorDataGateway'

/** Formats an integer rupee figure the way an Indian buyer reads it. */
function rupees(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

/** The sentinel for a cell we hold no value for. */
const ABSENT = 'Not recorded'

/** Escapes a pipe so a value containing one cannot break the row. */
const cell = (s: string) => s.replace(/\|/g, '\\|').trim() || ABSENT

export interface MarketTableOptions {
  /** Cap on rows. */
  limit?: number
  /** Ordering. Price ascending suits a budget question, descending a premium one. */
  order?: 'price_asc' | 'price_desc'
}

/** The Noida micro-market table, from our own rows. */
export function renderMicroMarketTable(
  markets: MicroMarketSummary[],
  options: MarketTableOptions = {},
): string {
  const { limit = 6, order = 'price_asc' } = options
  if (!markets || markets.length < 2) return ''

  const rows = [...markets]
    .filter((m) => m.microMarket)
    .sort((a, b) =>
      order === 'price_desc'
        ? (b.avgPricePerSqft ?? 0) - (a.avgPricePerSqft ?? 0)
        : (a.avgPricePerSqft ?? 0) - (b.avgPricePerSqft ?? 0),
    )
    .slice(0, limit)

  if (rows.length < 2) return ''

  const header =
    '| Micro-market | Sectors | Avg rate | Range | Character |\n' +
    '| :--- | :--- | ---: | :--- | :--- |'

  const body = rows.map((m) => {
    const rate = m.avgPricePerSqft ? `${rupees(m.avgPricePerSqft)}/sqft` : ABSENT
    const range =
      m.priceRange?.min && m.priceRange?.max
        ? `${rupees(m.priceRange.min)} – ${rupees(m.priceRange.max)}`
        : ABSENT
    // One characterising phrase, not the full tag list: a table the buyer has
    // to scroll sideways on a phone is not a table they read.
    const character = m.dominantSegment || m.lifestyleTags?.slice(0, 2).join(', ') || ABSENT
    return `| **${cell(m.microMarket)}** | ${cell(m.sectors?.join(', ') ?? '')} | ${cell(rate)} | ${cell(range)} | ${cell(character)} |`
  })

  return `${header}\n${body.join('\n')}`
}

/** A sector we can describe from project rows but have no curated row for. */
export interface DerivedSectorRow {
  sector: string
  projectCount: number
  readyCount: number
  priceMinCr: number | null
  priceMaxCr: number | null
}

/** Sectors we hold projects in but no sector intelligence for. */
export function renderDerivedSectorTable(rows: DerivedSectorRow[], limit = 8): string {
  if (!rows || rows.length < 2) return ''
  const top = rows.slice(0, limit)

  const header =
    '| Sector | Projects | Ready to move | Price from |\n' +
    '| :--- | ---: | ---: | :--- |'

  const body = top.map((r) => {
    const price =
      r.priceMinCr != null
        ? r.priceMaxCr != null && r.priceMaxCr !== r.priceMinCr
          ? `₹${r.priceMinCr} – ${r.priceMaxCr} Cr`
          : `₹${r.priceMinCr} Cr`
        : ABSENT
    return `| **${cell(r.sector)}** | ${r.projectCount} | ${r.readyCount} | ${cell(price)} |`
  })

  return `${header}\n${body.join('\n')}`
}

/** The subset of a trimmed project this table needs. */
export interface ProjectRow {
  name?: string
  sector?: string | { name: string }
  status?: string
  price_range_label?: string
  price_min_cr?: number | null
  price_max_cr?: number | null
  unit_types?: Array<{ price_min_cr?: number | null; price_max_cr?: number | null }> | null
  possession_label?: string
  builder?: { name: string } | null
}

const sectorName = (s: ProjectRow['sector']): string =>
  typeof s === 'string' ? s : (s?.name ?? '')

/** The project shortlist table, from the rows discovery already returned. */
export function renderProjectTable(projects: ProjectRow[], limit = 6): string {
  if (!projects || projects.length < 2) return ''

  const rows = projects.filter((p) => p?.name).slice(0, limit)
  if (rows.length < 2) return ''

  const header =
    '| Project | Builder | Sector | Price | Status |\n' +
    '| :--- | :--- | :--- | :--- | :--- |'

  const body = rows.map((p) => {
    // Units first: the stored label disagrees with them on over half our rows.
    const price =
      priceLabelFor(p) !== 'Price on request'
        ? priceLabelFor(p)
        : (typeof p.price_min_cr === 'number' ? `from ₹${p.price_min_cr} Cr` : ABSENT)
    const status = p.possession_label ?? p.status ?? ABSENT
    return `| **${cell(p.name ?? '')}** | ${cell(p.builder?.name ?? '')} | ${cell(sectorName(p.sector))} | ${cell(price)} | ${cell(status)} |`
  })

  return `${header}\n${body.join('\n')}`
}

/** A project offering the configuration the buyer asked for, and what it costs. */
export interface AlternativeRow {
  name?: string
  sector?: string | { name: string }
  builder?: { name: string } | null
  possession_label?: string | null
  status?: string
  unit_types?: Array<{ bhk: number; price_min_cr?: number | null; price_max_cr?: number | null; carpet_area_sqft?: number | null }> | null
}

/**
 * What else in the area actually has the size the buyer wanted.
 *
 * Shown when a named project does not build that configuration. "Ace Hanei has
 * no 3 BHK" is the honest answer and a dead end; the same sentence with three
 * nearby projects that do is an answer they can act on. Prices are for the
 * asked-for size only — quoting a project's full spread here would repeat the
 * mistake this table exists to correct.
 */
export function renderAlternativesTable(
  projects: AlternativeRow[],
  bhk: number[],
  limit = 5,
): string {
  if (!projects?.length || !bhk.length) return ''

  const rows = projects
    .map((p) => {
      const units = (p.unit_types ?? []).filter((u) => bhk.includes(u.bhk))
      if (units.length === 0) return null
      const mins = units.map((u) => u.price_min_cr).filter((n): n is number => n != null)
      const maxs = units.map((u) => u.price_max_cr).filter((n): n is number => n != null)
      const areas = units.map((u) => u.carpet_area_sqft).filter((n): n is number => n != null)
      const price = mins.length
        ? maxs.length && Math.max(...maxs) > Math.min(...mins)
          ? `₹${Math.min(...mins).toFixed(2)}–${Math.max(...maxs).toFixed(2)} Cr`
          : `₹${Math.min(...mins).toFixed(2)} Cr+`
        : ABSENT
      return { p, price, area: areas.length ? `${Math.min(...areas)} sqft` : ABSENT }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .slice(0, limit)

  if (rows.length === 0) return ''

  const size = [...new Set(bhk)].sort((a, b) => a - b).join('/')
  const header =
    `| Project | Sector | ${size} BHK price | Carpet | Possession |\n` +
    '| :--- | :--- | ---: | ---: | :--- |'
  const body = rows.map(({ p, price, area }) =>
    `| **${cell(p.name ?? '')}** | ${cell(sectorName(p.sector))} | ${cell(price)} | ${cell(area)} | ${cell(p.possession_label ?? p.status ?? '')} |`,
  )
  return `${header}\n${body.join('\n')}`
}

// ── Payment schedule ─────────────────────────────────────────────────────────

export interface PaymentPlanRow {
  plan_name?: string | null
  plan_type?: string | null
  down_payment_pct?: number | null
  booking_amount_lakh?: number | null
  total_duration_months?: number | null
  discount_offered_pct?: number | null
  best_for?: string | null
  watch_out?: string | null
  milestones?: unknown
}

/** "construction_linked" reads badly in a cell the buyer is scanning. */
const humanPlanType = (t?: string | null) =>
  (t ?? '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim()

/** One instalment of a developer's schedule, as stored on `PaymentPlan.milestones`. */
interface Milestone {
  stage?: string
  milestone?: string
  pct?: string | number
  amt?: string | number
  due?: string
  timeline?: string
}

/** The rows are JSON, so nothing about their shape is guaranteed. */
function milestonesOf(p: PaymentPlanRow): Milestone[] {
  return Array.isArray(p.milestones) ? (p.milestones as Milestone[]) : []
}

const asText = (v: string | number | undefined): string =>
  v === undefined || v === null || v === '' ? ABSENT : String(v)

/**
 * When the buyer has to pay, and how much.
 *
 * The first version of this listed only `booking_amount_lakh`,
 * `down_payment_pct`, `total_duration_months` and `watch_out` — four summary
 * columns that are null on most rows, while the schedule itself sat unread in
 * `milestones`. A buyer asking for the payment plan of Maxblis White House II
 * got two lines saying "Available", against five stored instalments naming the
 * stage, the share and the rupee amount of each. The answer to "what is the
 * payment plan" is the schedule; the summary is a footnote to it.
 */
export function renderPaymentPlanTable(plans: PaymentPlanRow[], limit = 5): string {
  if (!plans || plans.length === 0) return ''
  const rows = plans.slice(0, limit)
  const scheduled = rows.filter((p) => milestonesOf(p).length > 0)

  if (scheduled.length > 0) {
    const blocks = scheduled.map((p) => {
      const name = p.plan_name || humanPlanType(p.plan_type) || 'Payment plan'
      const summary = [
        typeof p.booking_amount_lakh === 'number' ? `booking ₹${p.booking_amount_lakh} lakh` : '',
        typeof p.total_duration_months === 'number' ? `over ${p.total_duration_months} months` : '',
        typeof p.discount_offered_pct === 'number' ? `${p.discount_offered_pct}% discount` : '',
      ].filter(Boolean).join(' · ')

      const header =
        '| Stage | When | Share | Amount |\n' +
        '| :--- | :--- | ---: | ---: |'
      const body = milestonesOf(p).map((m) => {
        const stage = m.milestone || m.stage || ABSENT
        const when = m.timeline || m.due || ABSENT
        return `| ${cell(stage)} | ${cell(when)} | ${cell(asText(m.pct))} | ${cell(asText(m.amt))} |`
      })

      const watch = p.watch_out ? `\n\n_Watch out: ${p.watch_out}_` : ''
      return `**${name}**${summary ? ` — ${summary}` : ''}\n\n${header}\n${body.join('\n')}${watch}`
    })
    return blocks.join('\n\n')
  }

  // No schedule stored. The summary columns are all we hold, and a cell that
  // says "Not recorded" is the honest version of a plan we cannot detail.
  const header =
    '| Plan | Booking | Down payment | Duration | Watch out |\n' +
    '| :--- | :--- | ---: | ---: | :--- |'

  const body = rows.map((p) => {
    const name = p.plan_name || humanPlanType(p.plan_type) || ABSENT
    const booking =
      typeof p.booking_amount_lakh === 'number' ? `₹${p.booking_amount_lakh} lakh` : ABSENT
    const down = typeof p.down_payment_pct === 'number' ? `${p.down_payment_pct}%` : ABSENT
    const duration =
      typeof p.total_duration_months === 'number' ? `${p.total_duration_months} months` : ABSENT
    return `| **${cell(name)}** | ${cell(booking)} | ${cell(down)} | ${cell(duration)} | ${cell(p.watch_out ?? '')} |`
  })

  return `${header}\n${body.join('\n')}`
}

// ── Cost sheet ───────────────────────────────────────────────────────────────

export interface CostSheetRow {
  base_price_per_sqft?: number | null
  base_cost_cr?: number | null
  /** These three are RUPEES, not lakhs — see the warning on the CostSheet model */
  parking_cost?: number | null
  ifms?: number | null
  club_membership?: number | null
  gst_applicable?: boolean | null
  gst_rate_pct?: number | null
  stamp_duty_pct?: number | null
  registration_pct?: number | null
  all_inclusive_price_cr?: number | null
}

/** Rupee amounts stored raw, shown at whatever scale reads naturally. */
function fromRupees(n?: number | null): string {
  if (typeof n !== 'number' || n <= 0) return ABSENT
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} lakh`
  return rupees(n)
}

/** What the flat actually costs, line by line. */
export function renderCostSheetTable(sheet: CostSheetRow | null | undefined): string {
  if (!sheet) return ''

  const lines: Array<[string, string]> = []
  if (typeof sheet.base_price_per_sqft === 'number')
    lines.push(['Base rate', `${rupees(sheet.base_price_per_sqft)}/sqft`])
  if (typeof sheet.base_cost_cr === 'number')
    lines.push(['Base cost', `₹${sheet.base_cost_cr} Cr`])
  if (typeof sheet.parking_cost === 'number') lines.push(['Parking', fromRupees(sheet.parking_cost)])
  if (typeof sheet.club_membership === 'number')
    lines.push(['Club membership', fromRupees(sheet.club_membership)])
  if (typeof sheet.ifms === 'number') lines.push(['IFMS deposit', fromRupees(sheet.ifms)])
  if (sheet.gst_applicable && typeof sheet.gst_rate_pct === 'number')
    lines.push(['GST', `${sheet.gst_rate_pct}%`])
  if (typeof sheet.stamp_duty_pct === 'number')
    lines.push(['Stamp duty', `${sheet.stamp_duty_pct}%`])
  if (typeof sheet.registration_pct === 'number')
    lines.push(['Registration', `${sheet.registration_pct}%`])
  if (typeof sheet.all_inclusive_price_cr === 'number')
    lines.push(['**All-inclusive**', `**₹${sheet.all_inclusive_price_cr} Cr**`])

  // Two lines is a sentence, not a cost sheet.
  if (lines.length < 3) return ''

  const header = '| Component | Amount |\n| :--- | ---: |'
  return `${header}\n${lines.map(([k, v]) => `| ${cell(k)} | ${cell(v)} |`).join('\n')}`
}

// ── Sector versus sector ─────────────────────────────────────────────────────

export interface SectorStats {
  sector: string
  totalProjects: number
  priceRange: string
  readyCount: number
  topProjects: string
}

/** Two sectors side by side, from counts we computed rather than prose we asked for. */
export function renderSectorComparisonTable(a: SectorStats, b: SectorStats): string {
  if (!a?.sector || !b?.sector) return ''

  const rows: Array<[string, string, string]> = [
    ['Projects we hold', String(a.totalProjects), String(b.totalProjects)],
    ['Ready to move', String(a.readyCount), String(b.readyCount)],
    ['Price band', a.priceRange, b.priceRange],
    ['Landmark societies', a.topProjects, b.topProjects],
  ]

  const header = `| | ${cell(a.sector)} | ${cell(b.sector)} |\n| :--- | :--- | :--- |`
  const body = rows.map(([label, x, y]) => `| **${cell(label)}** | ${cell(x)} | ${cell(y)} |`)
  return `${header}\n${body.join('\n')}`
}

/** True when this turn should get a rendered market table. */
export function wantsMarketTable(message: string, hasProjectFocus: boolean): boolean {
  if (hasProjectFocus) return false
  const m = (message || '').toLowerCase()
  if (!m) return false

  // Comparing places, choosing between areas, or asking what things cost.
  return (
    /\bvs\b|\bversus\b|\bcompare\b|\bbetter\b/.test(m) ||
    /\bwhich (sector|area|micro|part|region)/.test(m) ||
    /\bbest (sector|area|micro|place|locality)/.test(m) ||
    /\bwhere (should|can|do)\b/.test(m) ||
    /\b(rate|rates|price|prices|per sq|psf|cost)\b/.test(m) ||
    /\bshortlist\b|\boptions\b/.test(m)
  )
}
