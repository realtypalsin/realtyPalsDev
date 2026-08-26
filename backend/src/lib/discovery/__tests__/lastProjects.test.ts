import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readLastProjectIds, readLastProjectCards } from '../lastProjects'

// ChatSession.last_projects is written as bare ids by the project-context branch
// and as ScoredProject objects by the search / end-of-turn branches. Both readers
// must survive either shape — that mismatch used to silently drop the focused
// project on a follow-up like "tell me more about it".

describe('readLastProjectIds', () => {
  it('reads the id-array shape', () => {
    assert.deepEqual(readLastProjectIds(['a', 'b']), ['a', 'b'])
  })

  it('reads ids out of the object-array shape', () => {
    assert.deepEqual(readLastProjectIds([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }]), ['a', 'b'])
  })

  it('reads a mixed array left behind by two writers', () => {
    assert.deepEqual(readLastProjectIds(['a', { id: 'b' }]), ['a', 'b'])
  })

  it('drops entries with no usable id instead of emitting undefined', () => {
    assert.deepEqual(readLastProjectIds([{ name: 'no id' }, null, 7, { id: 3 }, 'ok']), ['ok'])
  })

  it('returns empty for null / non-array values', () => {
    assert.deepEqual(readLastProjectIds(null), [])
    assert.deepEqual(readLastProjectIds(undefined), [])
    assert.deepEqual(readLastProjectIds({ id: 'a' }), [])
  })
})

describe('readLastProjectCards', () => {
  it('returns the cached cards when every entry is an object', () => {
    const cards = readLastProjectCards([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }])
    assert.equal(cards?.length, 2)
    assert.equal((cards?.[0] as { name?: string }).name, 'A')
  })

  it('returns null for the id-array shape — there are no cards to reuse', () => {
    assert.equal(readLastProjectCards(['a', 'b']), null)
  })

  it('returns null for a mixed array rather than a partial result set', () => {
    assert.equal(readLastProjectCards(['a', { id: 'b' }]), null)
  })

  it('returns null for empty / null values', () => {
    assert.equal(readLastProjectCards([]), null)
    assert.equal(readLastProjectCards(null), null)
  })
})
