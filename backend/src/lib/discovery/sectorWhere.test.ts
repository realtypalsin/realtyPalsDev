import test from 'node:test'
import assert from 'node:assert/strict'
import { sectorWhereClause } from './normalize'

/**
 * The clause a handler used to build was `{ sector: { contains: '1' } }`, and
 * Sector 1 therefore matched Sector 10, 100, 128, 137 and 150 alike — 154 rows
 * out of a 280-row table. This pins the whole-word shape rather than a live
 * query: the point is that no clause is a bare substring match on the number.
 */
const applies = (clauses: Array<Record<string, unknown>>, value: string): boolean =>
  clauses.some(c => {
    const s = (c as { sector: Record<string, string> }).sector
    const v = value.toLowerCase()
    if (s.equals) return v === s.equals.toLowerCase()
    if (s.startsWith) return v.startsWith(s.startsWith.toLowerCase())
    if (s.endsWith) return v.endsWith(s.endsWith.toLowerCase())
    if (s.contains) return v.includes(s.contains.toLowerCase())
    return false
  })

test('Sector 1 does not match Sector 10, 128 or 150', () => {
  const c = sectorWhereClause('Sector 1')
  assert.equal(applies(c, 'Sector 1'), true)
  assert.equal(applies(c, 'Sector 1 Greater Noida West'), true)
  for (const other of ['Sector 10', 'Sector 100', 'Sector 128', 'Sector 137', 'Sector 150', 'Sector 16']) {
    assert.equal(applies(c, other), false, `${other} must not match Sector 1`)
  }
})

test('a bare number and a city suffix both normalise', () => {
  assert.equal(applies(sectorWhereClause('150'), 'Sector 150'), true)
  assert.equal(applies(sectorWhereClause('Sector 2, Greater Noida West'), 'Sector 2'), true)
  assert.equal(applies(sectorWhereClause('Sector 2, Greater Noida West'), 'Sector 20'), false)
})

test('no clause is a bare substring match on the number', () => {
  for (const clause of sectorWhereClause('Sector 1')) {
    const s = (clause as { sector: Record<string, string> }).sector
    if (s.contains) assert.match(s.contains, /^ .+ $/, 'infix matches must be space-delimited')
  }
})
