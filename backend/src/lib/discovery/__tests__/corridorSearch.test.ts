import { describe, it } from 'node:test'
import { strict as assert } from 'node:assert'

import { expandSectorAliases, isCorridorAlias, buildHardFilters } from '../projects'
import type { Intent } from '../types'

/**
 * A corridor must return the corridor.
 *
 * "Noida Expressway" expanded to Sectors 107/137/143/150 correctly, matched
 * projects in all four, and the sector-disambiguation guard then discarded
 * every one of them and asked "Did you mean: Sector 107, 137, 143, 150?" —
 * offering the corridor's own contents back as a question. Picking one of the
 * corridor chips re-entered the same state, so the buyer could loop for as long
 * as they had patience and never see a card.
 */

const intentFor = (sector: string): Intent => ({
  sector,
  bhk: [3],
  gathering_loop_count: 0,
})

/** Every `sector` string the built filter will match on. */
const sectorsIn = (where: ReturnType<typeof buildHardFilters>): string[] => {
  const clauses = (where.OR ?? []) as Array<{ sector?: { equals?: string } }>
  return [...new Set(clauses.map(c => c.sector?.equals).filter((s): s is string => !!s))]
}

describe('corridor aliases', () => {
  it('recognises a corridor as plural, and a sector as singular', () => {
    assert.equal(isCorridorAlias('Noida Expressway'), true)
    assert.equal(isCorridorAlias('7X'), true)
    assert.equal(isCorridorAlias('Central Noida'), true)
    assert.equal(isCorridorAlias('Sector 150'), false)
    assert.equal(isCorridorAlias(undefined), false)
  })

  it('expands the expressway to every sector on it', () => {
    const sectors = expandSectorAliases('Noida Expressway')
    assert.deepEqual(sectors, ['Sector 107', 'Sector 137', 'Sector 143', 'Sector 150'])
  })

  it('searches all of them in one query rather than asking which', () => {
    const searched = sectorsIn(buildHardFilters(intentFor('Noida Expressway')))
    assert.deepEqual(searched, ['Sector 107', 'Sector 137', 'Sector 143', 'Sector 150'])
  })

  it('leaves a single named sector alone', () => {
    assert.deepEqual(sectorsIn(buildHardFilters(intentFor('Sector 150'))), ['Sector 150'])
  })
})
