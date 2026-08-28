// backend/src/lib/ai/marketTable.ts
//
// Market tables, rendered in code instead of by the model.
//
// Measured over 321 real answers: 54% of them contained a markdown table, and
// those tables were 53% of ALL output tokens. Output is roughly two thirds of a
// turn's cost, so the model drawing tables was about a third of the entire AI
// bill — and most of what it drew was data we had already injected into its
// prompt. We paid input to send it and output to have it copied back.
//
// The cost is the smaller half of the argument. Left to invent its own columns,
// the model invented metrics it had no data for:
//
//   | Micro-Market | ... | 5-Yr Upside Risk-Adjusted Est. | Net Rental Yield |
//   | Greater Noida West | ... | **25–35%** (Metro + Airport) | 3.5–4.0%       |
//
// Nothing in our database supports a five-year risk-adjusted upside figure. It
// also emitted ⭐ and ⚠️ into cells while the prompt forbade emoji anywhere. A
// rendered table cannot do either: every column here is a column we hold, and a
// value we do not have prints as an explicit gap rather than a plausible number.
//
// The table is streamed to the buyer BEFORE the model's prose, as its own block.
// That avoids a placeholder protocol entirely — no `{{table}}` token to survive
// substitution and leak into the answer, which is the failure the prompt's ban
// on custom tags exists to prevent.

import type { MicroMarketSummary } from '../discovery/sectorDataGateway'

/** Formats an integer rupee figure the way an Indian buyer reads it. */
function rupees(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

/**
 * The sentinel for a cell we hold no value for.
 *
 * Deliberately the same wording used elsewhere for absent facts. An em dash or
 * a blank cell reads as "nothing here"; this reads as "we did not find one",
 * which is the honest claim and the one the fact-tier rules require.
 */
const ABSENT = 'Not recorded'

/** Escapes a pipe so a value containing one cannot break the row. */
const cell = (s: string) => s.replace(/\|/g, '\\|').trim() || ABSENT

export interface MarketTableOptions {
  /**
   * Cap on rows. A buyer choosing between twelve micro-markets is not choosing;
   * the model's prose is what narrows it, and the table is the evidence.
   */
  limit?: number
  /** Ordering. Price ascending suits a budget question, descending a premium one. */
  order?: 'price_asc' | 'price_desc'
}

/**
 * The Noida micro-market table, from our own rows.
 *
 * Returns an empty string when there is nothing worth showing — one row is not
 * a comparison, and an empty table is worse than a sentence. The caller then
 * simply does not attach one, and the model writes prose as usual.
 */
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

/**
 * A sector we can describe from project rows but have no curated row for.
 *
 * Rendered in the same table as curated micro-markets, and marked, because the
 * two make different claims: a curated row asserts character ("Ultra Luxury &
 * Golf Township"), a derived one asserts only arithmetic over projects we hold.
 */
export interface DerivedSectorRow {
  sector: string
  projectCount: number
  readyCount: number
  priceMinCr: number | null
  priceMaxCr: number | null
}

/**
 * Sectors we hold projects in but no sector intelligence for.
 *
 * Measured: 61 sectors have projects, 13 have curated rows, and 29 of the gap
 * hold two or more projects each. Every one of those was answered with "not
 * recorded" while priced projects sat in the same database.
 */
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
  possession_label?: string
  builder?: { name: string } | null
}

const sectorName = (s: ProjectRow['sector']): string =>
  typeof s === 'string' ? s : (s?.name ?? '')

/**
 * The project shortlist table, from the rows discovery already returned.
 *
 * This is the shape the model drew most often and the most wasteful one:
 * `| Project | Builder | Status | Price Range |` over the same projects that
 * were injected into its prompt a moment earlier. Every column here is a
 * `Project` field, so nothing in it can be invented — and unlike the model's
 * version, a project with no recorded price says so instead of being given a
 * plausible band.
 *
 * Returns '' for fewer than two rows: one project is not a shortlist, and the
 * property cards already show it better than a table can.
 */
export function renderProjectTable(projects: ProjectRow[], limit = 6): string {
  if (!projects || projects.length < 2) return ''

  const rows = projects.filter((p) => p?.name).slice(0, limit)
  if (rows.length < 2) return ''

  const header =
    '| Project | Builder | Sector | Price | Status |\n' +
    '| :--- | :--- | :--- | :--- | :--- |'

  const body = rows.map((p) => {
    const price =
      p.price_range_label ??
      (typeof p.price_min_cr === 'number' ? `from ₹${p.price_min_cr} Cr` : ABSENT)
    const status = p.possession_label ?? p.status ?? ABSENT
    return `| **${cell(p.name ?? '')}** | ${cell(p.builder?.name ?? '')} | ${cell(sectorName(p.sector))} | ${cell(price)} | ${cell(status)} |`
  })

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

/**
 * The developer's payment plans, side by side.
 *
 * `watch_out` gets its own column deliberately. It is the one field on the row
 * that argues against the plan, and a payment schedule presented without its
 * catch is the kind of one-sided answer the trade-off rule exists to prevent.
 * The model used to have to remember to surface it; now it cannot be dropped.
 */
export function renderPaymentPlanTable(plans: PaymentPlanRow[], limit = 5): string {
  if (!plans || plans.length === 0) return ''
  const rows = plans.slice(0, limit)

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
  /**
   * These three are RUPEES, not lakhs — see the warning on the CostSheet model
   * in schema.prisma. Getting the unit wrong here would print a ₹3 lakh parking
   * charge as ₹3, which reads as a typo rather than as the error it is.
   */
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

/**
 * What the flat actually costs, line by line.
 *
 * Every row here was a line the model used to compose from injected numbers,
 * which is both the expensive way and the one that lets a rate drift. Statutory
 * percentages (GST, stamp duty, registration) come from the project's own sheet
 * where it has them and are omitted where it does not — never defaulted to a
 * figure that looks official.
 */
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

/**
 * Two sectors side by side, from counts we computed rather than prose we asked for.
 *
 * Only rows we can fill appear. The template this replaces asked the model for
 * "Metro & Transit", "Livability & Atmosphere" and "Social Infrastructure" —
 * three rows with nothing behind them in any table we hold, which the model
 * duly filled from memory and presented under a "Verified Sector Database
 * Facts" header.
 */
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

/**
 * True when this turn should get a rendered market table.
 *
 * Only for questions actually about the market across areas. A question about
 * one project, or one that names no place at all, gets prose — attaching a
 * city-wide table to "does Godrej Woods have a gym" is noise the buyer pays to
 * scroll past.
 */
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
