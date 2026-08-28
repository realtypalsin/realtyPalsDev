import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { stripInternalFields } from '../projectRepository'

describe('stripInternalFields', () => {
  it('removes the ranker artifacts that never reach a client', () => {
    // Measured on a live search: 51% of every project payload, 80KB of a 120KB
    // response for nine projects, read by nothing on either side of the wire.
    const p = {
      id: 'x', name: 'ACE Parkway', price_min_cr: 1.4,
      _multidimensional_rank: { finalScore: 0, summary: 'x'.repeat(2000) },
      _multidimensional_explanation: 'y'.repeat(1000),
      _recommendation_summary: 'z',
    }
    const out = stripInternalFields(p)
    assert.deepEqual(Object.keys(out).sort(), ['id', 'name', 'price_min_cr'])
  })

  it('keeps everything a card actually renders', () => {
    const p = { id: '1', name: 'A', builder: { name: 'B' }, sector: 'Sector 150', images: [] }
    assert.deepEqual(stripInternalFields(p), p)
  })

  it('does not mutate the input', () => {
    const p = { id: '1', _internal: true }
    stripInternalFields(p)
    assert.equal(p._internal, true)
  })
})
