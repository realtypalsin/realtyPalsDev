import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  renderMicroMarketTable,
  renderProjectTable,
  renderPaymentPlanTable,
  renderCostSheetTable,
  renderSectorComparisonTable,
  renderDerivedSectorTable,
  wantsMarketTable,
} from './marketTable'
import type { MicroMarketSummary } from '../discovery/sectorDataGateway'

const market = (over: Partial<MicroMarketSummary> = {}): MicroMarketSummary =>
  ({
    microMarket: 'Noida Expressway',
    sectors: ['128', '150'],
    avgPricePerSqft: 11500,
    priceRange: { min: 11000, max: 15500 },
    lifestyleTags: ['low density', 'green'],
    dominantSegment: 'Premium low-density',
    highlights: ['80% green cover'],
    ...over,
  }) as MicroMarketSummary

describe('rendered market table', () => {
  it('renders every column from our own rows', () => {
    const t = renderMicroMarketTable([market(), market({ microMarket: 'Greater Noida West', avgPricePerSqft: 7000 })])
    assert.match(t, /\| Micro-market \| Sectors \| Avg rate \| Range \| Character \|/)
    assert.match(t, /₹11,500\/sqft/)
    assert.match(t, /₹11,000 – ₹15,500/)
  })

  it('prints an explicit gap rather than inventing a value', () => {
    // The failure this replaces: asked for a rate it did not have, the model
    // wrote "**25–35%** (Metro + Airport + FAR policy)" — a five-year
    // risk-adjusted upside nothing in the database supports.
    const t = renderMicroMarketTable([
      market({ avgPricePerSqft: null as unknown as number, priceRange: null as unknown as MicroMarketSummary['priceRange'] }),
      market({ microMarket: 'Central Noida' }),
    ])
    assert.match(t, /Not recorded/)
  })

  it('cannot emit an emoji, because nothing here can', () => {
    // The model put ⭐ and ⚠️ into cells while the prompt banned emoji outright.
    const t = renderMicroMarketTable([market(), market({ microMarket: 'Central Noida' })])
    assert.ok(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(t), 'rendered table contains an emoji')
  })

  it('escapes a pipe so one value cannot break the row', () => {
    const t = renderMicroMarketTable([
      market({ dominantSegment: 'Premium | luxury' }),
      market({ microMarket: 'Central Noida' }),
    ])
    const dataRows = t.split('\n').slice(2)
    for (const r of dataRows) {
      assert.equal(r.split(/(?<!\\)\|/).length, 7, `row has the wrong cell count: ${r}`)
    }
  })

  it('renders nothing when there is no comparison to make', () => {
    // One row is not a comparison, and an empty table is worse than a sentence.
    assert.equal(renderMicroMarketTable([market()]), '')
    assert.equal(renderMicroMarketTable([]), '')
  })

  it('orders by price in the direction the question implies', () => {
    const rows = [market({ microMarket: 'Cheap', avgPricePerSqft: 7000 }), market({ microMarket: 'Dear', avgPricePerSqft: 15000 })]
    assert.ok(renderMicroMarketTable(rows, { order: 'price_asc' }).indexOf('Cheap') < renderMicroMarketTable(rows, { order: 'price_asc' }).indexOf('Dear'))
    assert.ok(renderMicroMarketTable(rows, { order: 'price_desc' }).indexOf('Dear') < renderMicroMarketTable(rows, { order: 'price_desc' }).indexOf('Cheap'))
  })
})

describe('when a market table is warranted', () => {
  it('attaches one to questions about places and prices', () => {
    for (const q of [
      'sector 150 vs sector 128 noida',
      'which sector is best for investment in noida',
      'property rates in noida',
      'where should I look with 80 lakh',
      'best areas in noida',
    ]) {
      assert.equal(wantsMarketTable(q, false), true, q)
    }
  })

  it('does not attach one to a question about a single project', () => {
    // A city-wide table under "does this project have a gym" is noise the buyer
    // pays to scroll past.
    assert.equal(wantsMarketTable('does it have a gym', true), false)
    assert.equal(wantsMarketTable('compare these two projects', true), false)
  })

  it('does not attach one to a question with no place in it', () => {
    assert.equal(wantsMarketTable('what documents do I need', false), false)
    assert.equal(wantsMarketTable('how does RERA registration work', false), false)
  })
})

describe('rendered project shortlist', () => {
  const proj = (over: Record<string, unknown> = {}) => ({
    name: 'ACE Parkway',
    sector: 'Sector 150',
    status: 'under_construction',
    price_range_label: '₹1.2 – 1.8 Cr',
    builder: { name: 'ACE Group' },
    ...over,
  })

  it('renders the shortlist the model used to draw itself', () => {
    const t = renderProjectTable([proj(), proj({ name: 'ATS Pristine' })])
    assert.match(t, /\| Project \| Builder \| Sector \| Price \| Status \|/)
    assert.match(t, /ACE Parkway/)
    assert.match(t, /ATS Pristine/)
  })

  it('says so when a price is missing instead of inventing a band', () => {
    const t = renderProjectTable([
      proj({ price_range_label: undefined, price_min_cr: null }),
      proj({ name: 'ATS Pristine' }),
    ])
    assert.match(t, /Not recorded/)
  })

  it('falls back to the minimum price when no label exists', () => {
    const t = renderProjectTable([
      proj({ price_range_label: undefined, price_min_cr: 1.4 }),
      proj({ name: 'ATS Pristine' }),
    ])
    assert.match(t, /from ₹1\.4 Cr/)
  })

  it('accepts a sector given as an object or a string', () => {
    const t = renderProjectTable([proj({ sector: { name: 'Sector 79' } }), proj({ name: 'B' })])
    assert.match(t, /Sector 79/)
  })

  it('renders nothing for a single project — the card already shows it', () => {
    assert.equal(renderProjectTable([proj()]), '')
    assert.equal(renderProjectTable([]), '')
  })
})

describe('rendered payment plans', () => {
  const plan = (o: Record<string, unknown> = {}) => ({
    plan_name: 'Construction Linked',
    plan_type: 'construction_linked',
    down_payment_pct: 10,
    booking_amount_lakh: 5,
    total_duration_months: 36,
    watch_out: 'Interest accrues from possession date',
    ...o,
  })

  it('gives watch_out its own column so it cannot be dropped', () => {
    // A payment schedule presented without its catch is the one-sided answer
    // the trade-off rule exists to prevent, and it was the easiest field for
    // the model to omit when it was drawing the table itself.
    const t = renderPaymentPlanTable([plan()])
    assert.match(t, /Watch out/)
    assert.match(t, /Interest accrues from possession date/)
  })

  it('humanises the plan type when there is no name', () => {
    assert.match(renderPaymentPlanTable([plan({ plan_name: null })]), /Construction Linked/)
  })

  it('says Not recorded rather than inventing a percentage', () => {
    const t = renderPaymentPlanTable([plan({ down_payment_pct: null, booking_amount_lakh: null })])
    assert.match(t, /Not recorded/)
  })

  it('renders nothing when we hold no plans', () => {
    assert.equal(renderPaymentPlanTable([]), '')
  })
})

describe('rendered cost sheet', () => {
  it('converts the rupee-denominated fields at the right scale', () => {
    // schema.prisma warns that parking_cost / ifms / club_membership are RUPEES,
    // not lakhs. Printing ₹300000 as "₹3" would read as a typo, not an error.
    const t = renderCostSheetTable({
      base_price_per_sqft: 11500,
      parking_cost: 300000,
      club_membership: 150000,
      ifms: 90000,
      stamp_duty_pct: 7,
    })
    assert.match(t, /₹3\.00 lakh/)
    assert.match(t, /₹11,500\/sqft/)
  })

  it('omits a charge we do not hold rather than defaulting it', () => {
    const t = renderCostSheetTable({
      base_price_per_sqft: 11500,
      stamp_duty_pct: 7,
      registration_pct: 1,
      parking_cost: null,
    })
    assert.ok(!/Parking/.test(t), 'a charge with no figure was still given a row')
  })

  it('renders nothing when there is barely anything to show', () => {
    assert.equal(renderCostSheetTable({ base_price_per_sqft: 11500 }), '')
    assert.equal(renderCostSheetTable(null), '')
  })
})

describe('rendered sector comparison', () => {
  const stats = (o: Record<string, unknown> = {}) => ({
    sector: 'Sector 75',
    totalProjects: 12,
    priceRange: '₹1.2–2.4 Cr',
    readyCount: 4,
    topProjects: 'Apex Florville, Dasnac Burj',
    ...o,
  })

  it('shows only rows we can fill from our own counts', () => {
    // The template this replaced asked for "Metro & Transit", "Livability &
    // Atmosphere" and "Social Infrastructure" — three rows with nothing behind
    // them, which the model filled from memory under a "Verified" header.
    const t = renderSectorComparisonTable(stats(), stats({ sector: 'Sector 137' }))
    assert.match(t, /Projects we hold/)
    assert.match(t, /Price band/)
    assert.ok(!/Livability|Social Infrastructure|Metro & Transit/.test(t))
  })
})

describe('derived sector table', () => {
  const row = (o: Record<string, unknown> = {}) => ({
    sector: 'Sector 120',
    projectCount: 4,
    readyCount: 2,
    priceMinCr: 0.85,
    priceMaxCr: 1.6,
    ...o,
  })

  it('describes sectors that have projects but no curated intelligence', () => {
    // 61 sectors have projects; 13 have curated rows. Every one of the other 48
    // was answered with "not recorded" while priced projects sat in the same
    // database. This is arithmetic on data we already had.
    const t = renderDerivedSectorTable([row(), row({ sector: 'Sector 121', projectCount: 3 })])
    assert.match(t, /Sector 120/)
    assert.match(t, /₹0\.85 – 1\.6 Cr/)
  })

  it('collapses the band when there is only one price', () => {
    const t = renderDerivedSectorTable([
      row({ priceMaxCr: 0.85 }),
      row({ sector: 'Sector 121' }),
    ])
    assert.match(t, /₹0\.85 Cr/)
    assert.ok(!/0\.85 – 0\.85/.test(t))
  })

  it('says Not recorded rather than guessing an unpriced sector', () => {
    const t = renderDerivedSectorTable([
      row({ priceMinCr: null, priceMaxCr: null }),
      row({ sector: 'Sector 121' }),
    ])
    assert.match(t, /Not recorded/)
  })

  it('renders nothing for a single sector', () => {
    assert.equal(renderDerivedSectorTable([row()]), '')
  })
})
