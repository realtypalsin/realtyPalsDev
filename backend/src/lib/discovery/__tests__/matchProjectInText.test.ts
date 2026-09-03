import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { matchProjectInText, matchProjectsInText } from '../matchProjectInText'

/**
 * The real prefix collisions in the live catalogue, measured 4 Sep 2026.
 * These are phase-two towers of the same township: adjacent, differently
 * priced, and years apart on handover, so answering about the wrong one is a
 * wrong RERA number and a wrong possession date.
 */
const PAIRS: Array<[short: string, long: string]> = [
  ['ATS Pristine', 'ATS Pristine & Golf Meadows'],
  ['Maxblis White House', 'Maxblis White House II'],
  ['Lotus Greens Arena', 'Lotus Greens Arena II'],
  ['Lotus Boulevard', 'Lotus Boulevard Espacia'],
  ['Nirala Estate Phase 1', 'Nirala Estate Phase 1 & 2'],
  ['Antriksh Golf View', 'Antriksh Golf View II'],
  ['AIMS Golf Avenue I', 'AIMS Golf Avenue I & II'],
]

describe('the longest match wins, whatever the catalogue order', () => {
  for (const [short, long] of PAIRS) {
    it(`resolves "${long}" and not "${short}"`, () => {
      const message = `what is the cost sheet for ${long}?`
      // Both orders, because the bug this replaces was array order: the
      // catalogue is a findMany with no orderBy, so its order is heap order.
      const shortFirst = [{ id: 'a', name: short }, { id: 'b', name: long }]
      const longFirst = [{ id: 'b', name: long }, { id: 'a', name: short }]
      assert.equal(matchProjectInText(message, shortFirst)?.name, long)
      assert.equal(matchProjectInText(message, longFirst)?.name, long)
    })
  }

  it('still resolves the short name when that is what was typed', () => {
    const catalog = [{ id: 'a', name: 'ATS Pristine' }, { id: 'b', name: 'ATS Pristine & Golf Meadows' }]
    assert.equal(matchProjectInText('cost sheet for ATS Pristine', catalog)?.name, 'ATS Pristine')
  })

  it('returns null when no project is named', () => {
    assert.equal(matchProjectInText('what is stamp duty in UP', [{ id: 'a', name: 'ATS Pristine' }]), null)
    assert.equal(matchProjectInText('', [{ id: 'a', name: 'ATS Pristine' }]), null)
  })

  it('breaks ties on id, never on array order', () => {
    // Both names are 11 characters, so length cannot decide it.
    const a = [{ id: 'zzz', name: 'Alpha Court' }, { id: 'aaa', name: 'Delta Court' }]
    const b = [{ id: 'aaa', name: 'Delta Court' }, { id: 'zzz', name: 'Alpha Court' }]
    assert.equal(matchProjectInText('Alpha Court vs Delta Court', a)?.id, 'aaa')
    assert.equal(matchProjectInText('Alpha Court vs Delta Court', b)?.id, 'aaa')
  })
})

describe('a comparison collects both projects and no phantoms', () => {
  it('does not add the prefix names as extra projects', () => {
    const catalog = [
      { id: '1', name: 'Maxblis White House' },
      { id: '2', name: 'Maxblis White House II' },
      { id: '3', name: 'Lotus Boulevard' },
      { id: '4', name: 'Lotus Boulevard Espacia' },
    ]
    const got = matchProjectsInText('Maxblis White House II vs Lotus Boulevard Espacia', catalog)
    assert.deepEqual(got.map(p => p.name).sort(), ['Lotus Boulevard Espacia', 'Maxblis White House II'])
  })

  it('keeps two genuinely different projects', () => {
    const catalog = [{ id: '1', name: 'Godrej Woods' }, { id: '2', name: 'ACE Parkway' }]
    assert.equal(matchProjectsInText('Godrej Woods vs ACE Parkway', catalog).length, 2)
  })
})
