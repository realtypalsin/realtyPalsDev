import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { linkProjectNames, findSectorsMentioned, findSectorsAsked, buildOpenAnswerChips } from './proseEntities'

describe('linkProjectNames', () => {
  const mentioned = [{ id: 'p1', name: 'Godrej Woods' }, { id: 'p2', name: 'ATS Pious Hideaways' }]

  it('links every mentioned name', () => {
    const out = linkProjectNames('Godrej Woods sits next to ATS Pious Hideaways.', mentioned)
    assert.match(out, /\[Godrej Woods\]\(#entity:p1\)/)
    assert.match(out, /\[ATS Pious Hideaways\]\(#entity:p2\)/)
  })

  it('leaves names already rendered as cards alone', () => {
    const out = linkProjectNames('Godrej Woods is the pick.', mentioned, new Set(['p1']))
    assert.doesNotMatch(out, /#entity:p1/)
  })

  it('is idempotent — running twice does not double-link', () => {
    const once = linkProjectNames('Godrej Woods leads.', mentioned)
    assert.equal(linkProjectNames(once, mentioned), once)
  })

  it('survives regex metacharacters in a project name', () => {
    const tricky = [{ id: 'p3', name: 'M3M (Phase 1)' }]
    const out = linkProjectNames('Consider M3M (Phase 1) here.', tricky)
    assert.match(out, /\[M3M \(Phase 1\)\]\(#entity:p3\)/)
  })
})

describe('findSectorsMentioned', () => {
  it('returns unique sectors in order of appearance', () => {
    const found = findSectorsMentioned('Sector 128 leads, then Sector 150. Sector 128 again.')
    assert.deepEqual(found, ['Sector 128', 'Sector 150'])
  })

  it('returns nothing when no sector is named', () => {
    assert.deepEqual(findSectorsMentioned('Prices are climbing across the city.'), [])
  })
})

describe('buildOpenAnswerChips', () => {
  it('builds a sector chip per named sector', () => {
    const chips = buildOpenAnswerChips([], ['Sector 128', 'Sector 150'])
    const labels = chips.map(c => c.label)
    assert.ok(labels.includes('Projects in Sector 128'))
    assert.ok(labels.includes('Sector 128 vs Sector 150'))
  })

  it('emits nothing when the answer named no place and no project', () => {
    // The old hardcoded chips said "show projects in those sectors" even here.
    assert.deepEqual(buildOpenAnswerChips([], []), [])
  })

  it('offers a compare chip once two projects are named', () => {
    const chips = buildOpenAnswerChips([{ id: 'a', name: 'A Towers' }, { id: 'b', name: 'B Towers' }], [])
    assert.ok(chips.some(c => c.label === 'Compare these 2'))
  })
})

describe('findSectorsAsked — what the BUYER named', () => {
  it('reads a comma-and-or enumeration after one anchor', () => {
    // The 30 Aug run: this question got a city-wide table containing none of
    // 75, 76 or 78, because the strict pattern found only "Sector 74".
    assert.deepEqual(
      findSectorsAsked('Which is better for a family: Sector 74, 75, 76 or 78 Noida?'),
      ['Sector 74', 'Sector 75', 'Sector 76', 'Sector 78'],
    )
  })

  it('reads a vs comparison', () => {
    assert.deepEqual(findSectorsAsked('sector 150 vs 128 for investment'), ['Sector 150', 'Sector 128'])
  })

  it('keeps a suffixed sector intact', () => {
    assert.deepEqual(findSectorsAsked('what about sector 16B and 22D?'), ['Sector 16B', 'Sector 22D'])
  })

  it('does not read an unrelated number as a sector', () => {
    // The reason bare numbers only count inside an enumeration: every one of
    // these would otherwise become a sector.
    assert.deepEqual(findSectorsAsked('show me 3 BHK under 2 crore within 5 years'), [])
    assert.deepEqual(findSectorsAsked('3BHK in Sector 150 under 1.5 crore'), ['Sector 150'])
  })

  it('returns nothing when no sector is named', () => {
    assert.deepEqual(findSectorsAsked('what is the average price in Noida'), [])
  })
})
