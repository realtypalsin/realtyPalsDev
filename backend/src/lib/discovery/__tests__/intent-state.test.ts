import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getIntentState, isCityLevel } from '../intent'
import { CITY_LEVEL_TERMS } from '../constants'
import type { Intent } from '../types'

describe('Intent: getIntentState', () => {
  it('empty intent returns COLD', () => {
    assert.equal(getIntentState({}), 'COLD')
  })

  it('single signal (BHK only) returns GATHERING', () => {
    assert.equal(getIntentState({ bhk: [3] }), 'GATHERING')
  })

  it('single signal (budget only) returns GATHERING', () => {
    assert.equal(getIntentState({ budgetMax: 2 }), 'GATHERING')
  })

  it('single signal (sector only) returns GATHERING', () => {
    assert.equal(getIntentState({ sector: 'Sector 150' }), 'GATHERING')
  })

  it('two of {BHK, budget, sector} returns READY_TO_SEARCH', () => {
    assert.equal(getIntentState({ bhk: [3], budgetMax: 2 }), 'READY_TO_SEARCH')
    assert.equal(getIntentState({ bhk: [3], sector: 'Sector 150' }), 'READY_TO_SEARCH')
    assert.equal(getIntentState({ budgetMax: 2, sector: 'Sector 150' }), 'READY_TO_SEARCH')
  })

  it('projectNames alone (even single) returns READY_TO_SEARCH', () => {
    assert.equal(getIntentState({ projectNames: ['Godrej Meridien'] }), 'READY_TO_SEARCH')
  })

  it('empty projectNames array treated as no signal', () => {
    assert.equal(getIntentState({ projectNames: [] }), 'COLD')
  })

  it('builderName alone returns READY_TO_SEARCH', () => {
    assert.equal(getIntentState({ builderName: 'Godrej' }), 'READY_TO_SEARCH')
  })

  it('sector + lifestyleKeywords returns READY_TO_SEARCH', () => {
    assert.equal(
      getIntentState({ sector: 'Sector 150', lifestyleKeywords: ['gym', 'pool'] }),
      'READY_TO_SEARCH'
    )
  })

  it('sector + possession returns READY_TO_SEARCH', () => {
    assert.equal(getIntentState({ sector: 'Sector 150', possession: 'immediate' }), 'READY_TO_SEARCH')
  })

  it('budget + possession returns READY_TO_SEARCH', () => {
    assert.equal(getIntentState({ budgetMax: 2, possession: '1year' }), 'READY_TO_SEARCH')
  })

  it('possession alone returns GATHERING (not enough signal)', () => {
    assert.equal(getIntentState({ possession: 'immediate' }), 'GATHERING')
  })

  it('hasExistingResults=true on search-ready returns SHORTLISTED', () => {
    assert.equal(getIntentState({ projectNames: ['X'] }, true), 'SHORTLISTED')
    assert.equal(getIntentState({ bhk: [3], sector: 'Sector 150' }, true), 'SHORTLISTED')
  })

  it('hasExistingResults=true on COLD still returns COLD', () => {
    assert.equal(getIntentState({}, true), 'COLD')
  })

  it('hasExistingResults=false on GATHERING returns GATHERING', () => {
    assert.equal(getIntentState({ bhk: [3] }, false), 'GATHERING')
  })
})

describe('Intent: isCityLevel', () => {
  it('recognizes all CITY_LEVEL_TERMS (case insensitive, trimmed)', () => {
    for (const term of CITY_LEVEL_TERMS) {
      assert(isCityLevel(term), `Should recognize ${term}`)
      assert(isCityLevel(term.toUpperCase()), `Should recognize ${term.toUpperCase()}`)
      assert(isCityLevel(`  ${term}  `), `Should recognize trimmed "${term}"`)
    }
  })

  it('rejects sector-level inputs', () => {
    assert(!isCityLevel('Sector 150'))
    assert(!isCityLevel('Sector 10'))
    assert(!isCityLevel('Sector 62'))
  })

  it('common city terms from CITY_LEVEL_TERMS', () => {
    // Based on what we saw in constants.ts
    assert(isCityLevel('noida'))
    assert(isCityLevel('greater noida'))
    assert(isCityLevel('gurgaon'))
    assert(isCityLevel('gurugram'))
    assert(isCityLevel('delhi'))
  })

  it('handles mixed case and whitespace', () => {
    assert(isCityLevel('NOIDA'))
    assert(isCityLevel('NoIdA'))
    assert(isCityLevel('  noida  '))
  })
})

describe('Intent: getIntentState comprehensive matrix', () => {
  const matrix = [
    { intent: {}, state: 'COLD', desc: 'all empty' },
    { intent: { bhk: [3] }, state: 'GATHERING', desc: 'single signal' },
    { intent: { bhk: [3], budgetMax: 2 }, state: 'READY_TO_SEARCH', desc: 'two signals' },
    { intent: { projectNames: ['X'] }, state: 'READY_TO_SEARCH', desc: 'projectNames alone' },
    { intent: { builderName: 'Godrej' }, state: 'READY_TO_SEARCH', desc: 'builderName alone' },
    { intent: { sector: 'Sector 10', lifestyleKeywords: ['gym'] }, state: 'READY_TO_SEARCH', desc: 'sector + lifestyle' },
    { intent: { budgetMax: 1, possession: 'immediate' }, state: 'READY_TO_SEARCH', desc: 'budget + possession' },
    { intent: { possession: 'immediate' }, state: 'GATHERING', desc: 'possession alone' },
  ]

  for (const { intent, state, desc } of matrix) {
    it(`correctly classifies: ${desc}`, () => {
      assert.equal(getIntentState(intent as Intent), state)
    })
  }
})
