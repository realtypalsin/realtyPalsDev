import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { splitCityQualifier, parseNumericBand, sectorNumber } from './locationResolver'

/**
 * The pure half of location resolution — no database, so it runs on every commit.
 *
 * The tiers that read inventory are exercised by `scripts/corpus/audit-retrieval.ts`,
 * which asserts against the real rows.
 */

/** The cities we actually hold rows for, as the sector index reports them. */
const CITIES = ['Noida', 'Greater Noida', 'Greater Noida West', 'Yamuna Expressway']

describe('a trailing city narrows the search, never widens it', () => {
  it('splits the sector from the city that qualifies it', () => {
    // The bug this exists for: "Sector 12, Greater Noida West" contains the
    // string "greater noida west", the micro-market tier matched it by
    // substring, and the search widened to seven sectors — none of them
    // Sector 12, which holds twelve projects. The buyer was told there was
    // nothing there, off rows from somewhere else.
    assert.deepEqual(splitCityQualifier('Sector 12, Greater Noida West', CITIES), {
      core: 'sector 12',
      city: 'Greater Noida West',
    })
  })

  it('reads the same phrase without the comma', () => {
    assert.deepEqual(splitCityQualifier('Sector 12 Greater Noida West', CITIES), {
      core: 'sector 12',
      city: 'Greater Noida West',
    })
  })

  it('prefers the longer city name over the one it starts with', () => {
    // "Greater Noida West" starts with "Greater Noida". Matching the shorter
    // first sends every Greater Noida West query to the wrong city.
    assert.equal(splitCityQualifier('Sector 1 Greater Noida West', CITIES).city, 'Greater Noida West')
    assert.equal(splitCityQualifier('Zeta 1 Greater Noida', CITIES).city, 'Greater Noida')
  })

  it('understands how buyers actually write Greater Noida West', () => {
    for (const phrase of ['Sector 16B Noida Extension', 'Sector 16B GNW', 'Sector 16B noida ext']) {
      assert.equal(splitCityQualifier(phrase, CITIES).city, 'Greater Noida West', phrase)
    }
  })

  it('leaves a bare city alone', () => {
    // The phrase names the city itself, not a place inside it. Splitting would
    // hand the caller an empty sector.
    assert.deepEqual(splitCityQualifier('Greater Noida West', CITIES), {
      core: 'greater noida west',
      city: null,
    })
  })

  it('leaves a phrase with no city untouched', () => {
    assert.deepEqual(splitCityQualifier('Noida Expressway', CITIES), {
      core: 'noida expressway',
      city: null,
    })
    assert.deepEqual(splitCityQualifier('Sector 150', CITIES), {
      core: 'sector 150',
      city: null,
    })
  })

  it('never invents a city we hold no rows for', () => {
    // Aliases map onto our own city list. With that city absent, the alias must
    // resolve to nothing rather than to a name no row carries.
    assert.equal(splitCityQualifier('Sector 12 Noida Extension', ['Noida']).city, null)
  })
})

describe('numeric bands', () => {
  it('reads the range a buyer wrote', () => {
    assert.deepEqual(parseNumericBand('sectors 128-158'), { lo: 128, hi: 158 })
    assert.deepEqual(parseNumericBand('between 74 and 79'), { lo: 74, hi: 79 })
    assert.deepEqual(parseNumericBand('150 to 132'), { lo: 132, hi: 150 })
  })

  it('does not read a single sector as a degenerate band', () => {
    assert.equal(parseNumericBand('Sector 150'), null)
    assert.equal(parseNumericBand('Sector 12, Greater Noida West'), null)
  })
})

describe('sector numbers', () => {
  it('takes the leading number, suffix and all', () => {
    assert.equal(sectorNumber('Sector 143B'), 143)
    assert.equal(sectorNumber('Techzone 4'), 4)
    assert.equal(sectorNumber('Pari Chowk'), null)
  })
})
