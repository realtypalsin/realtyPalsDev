import { describe, it } from 'node:test'
import { strict as assert } from 'node:assert'

import { buildHardFilters } from '../projects'
import {
  parseNumericBand,
  sectorNumber,
  corridorMembers,
  distanceToSegmentKm,
  type SectorPoint,
} from '../locationResolver'
import type { Intent } from '../types'

/**
 * A corridor must return the corridor, and it must do so from data.
 *
 * Two defects sat on top of each other here. "Noida Expressway" resolved to a
 * hardcoded four sectors while our own rows put fifteen on it; and the
 * disambiguation guard then treated those four as an ambiguity, discarded every
 * result and asked "did you mean 107, 137, 143 or 150?" — offering the
 * corridor's own contents back as a question. Picking one re-entered the same
 * state, so the buyer could loop forever and never see a card.
 *
 * The list is gone. Membership comes from SectorIntelligence.micro_market plus
 * the geometry of the sectors it labels, so the corridor grows when inventory
 * does. These tests cover the pure parts — the DB-backed tiers are exercised
 * against real rows by scripts/verify-location-resolver.ts.
 */

/** Sector centroids on a straight NE–SW line, 1km apart, plus one off to the side. */
const line: SectorPoint[] = [
  { city: 'Noida', sector: 'Sector 128', lat: 28.5448, lng: 77.3720, projects: 11 },
  { city: 'Noida', sector: 'Sector 137', lat: 28.5205, lng: 77.4003, projects: 10 },
  { city: 'Noida', sector: 'Sector 150', lat: 28.4680, lng: 77.4598, projects: 19 },
  // Between 137 and 150, essentially on the axis — must be picked up.
  { city: 'Noida', sector: 'Sector 143', lat: 28.4960, lng: 77.4290, projects: 4 },
  // Far to the north-east, nowhere near the line — must not be.
  { city: 'Noida', sector: 'Sector 62', lat: 28.6270, lng: 77.3620, projects: 1 },
  // On the line geographically, but a different city.
  { city: 'Greater Noida West', sector: 'Sector 107', lat: 28.4970, lng: 77.4300, projects: 3 },
]

const seeds = line.filter(p => ['Sector 128', 'Sector 137', 'Sector 150'].includes(p.sector))

describe('numeric band phrases', () => {
  it('reads a range the buyer typed', () => {
    assert.deepEqual(parseNumericBand('sectors 132 to 150'), { lo: 132, hi: 150 })
    assert.deepEqual(parseNumericBand('74-79'), { lo: 74, hi: 79 })
    assert.deepEqual(parseNumericBand('between 128 and 158'), { lo: 128, hi: 158 })
  })

  it('normalises a reversed range', () => {
    assert.deepEqual(parseNumericBand('150 to 132'), { lo: 132, hi: 150 })
  })

  it('is not fooled by a single sector', () => {
    // "Sector 150" must fall through to exact matching, not become a band.
    assert.equal(parseNumericBand('Sector 150'), null)
    assert.equal(parseNumericBand('Noida Expressway'), null)
  })

  it('reads the number out of a lettered sector', () => {
    assert.equal(sectorNumber('Sector 143B'), 143)
    assert.equal(sectorNumber('Techzone 4'), 4)
    assert.equal(sectorNumber('Pari Chowk'), null)
  })
})

describe('corridor geometry', () => {
  it('measures to the segment, not to its endpoints', () => {
    // A point beside the middle of a long segment is close to the segment even
    // though it is far from either end. This is the whole reason a corridor is
    // modelled as a line: a radius around the endpoints misses the middle and
    // sweeps in everything sideways.
    const d = distanceToSegmentKm({ x: 5, y: 1 }, { x: 0, y: 0 }, { x: 10, y: 0 })
    assert.equal(Math.round(d * 1000) / 1000, 1)
  })

  it('clamps to the segment rather than running off its ends', () => {
    const d = distanceToSegmentKm({ x: 20, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 })
    assert.equal(Math.round(d), 10)
  })

  it('finds the unlabelled sector sitting on the axis', () => {
    const members = corridorMembers(seeds, line, 2).map(p => p.sector)
    assert.ok(members.includes('Sector 143'), 'sector on the axis was missed')
    for (const s of ['Sector 128', 'Sector 137', 'Sector 150']) {
      assert.ok(members.includes(s), `${s} lost its own seed`)
    }
  })

  it('leaves out what is merely nearby', () => {
    const members = corridorMembers(seeds, line, 2).map(p => p.sector)
    assert.ok(!members.includes('Sector 62'), 'swept in a sector off the corridor')
  })

  it('never crosses the city line', () => {
    // Sector 107 exists in both Noida and Greater Noida West. Geography alone
    // would put the Greater Noida West one inside a Noida corridor.
    const members = corridorMembers(seeds, line, 2)
    assert.ok(members.every(m => m.city === 'Noida'))
  })

  it('degrades to a radius when only one sector is labelled', () => {
    const one = [seeds[1]]
    const members = corridorMembers(one, line, 2).map(p => p.sector)
    assert.ok(members.includes('Sector 137'))
    assert.ok(!members.includes('Sector 62'))
  })

  it('returns nothing when nothing is labelled', () => {
    assert.deepEqual(corridorMembers([], line, 2), [])
  })
})

describe('hard filters over a resolved set', () => {
  const sectorsIn = (where: ReturnType<typeof buildHardFilters>): string[] => {
    const clauses = (where.OR ?? []) as Array<{ sector?: { equals?: string } }>
    return [...new Set(clauses.map(c => c.sector?.equals).filter((s): s is string => !!s))]
  }

  it('searches every resolved sector in one query rather than asking which', () => {
    const resolved = ['Sector 128', 'Sector 137', 'Sector 143', 'Sector 150']
    const where = buildHardFilters({ sector: 'Noida Expressway', gathering_loop_count: 0 } as Intent, resolved)
    assert.deepEqual(sectorsIn(where), resolved)
  })

  it('matches a single sector literally when nothing was resolved', () => {
    const where = buildHardFilters({ sector: 'Sector 150', gathering_loop_count: 0 } as Intent)
    assert.deepEqual(sectorsIn(where), ['Sector 150'])
  })

  it('holds no corridor knowledge of its own', () => {
    // With no resolution passed, an area phrase is matched literally and finds
    // nothing — the honest outcome. It must never expand from a baked-in list.
    const where = buildHardFilters({ sector: 'Noida Expressway', gathering_loop_count: 0 } as Intent)
    assert.deepEqual(sectorsIn(where), ['Noida Expressway'])
  })
})
