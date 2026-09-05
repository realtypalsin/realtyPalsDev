import test from 'node:test'
import assert from 'node:assert/strict'
import { extractSectorMentions } from './sectorMentions'

// Every sector number the pilot table actually holds includes 1, 2 and 3 —
// which is precisely why the bare-number scan was so destructive.
const HELD = ['1', '2', '3', '10', '75', '76', '78', '128', '137', '150', '168']

test('a budget band is not a sector pair', () => {
  assert.deepEqual(
    extractSectorMentions('Show me the best projects between 1 and 2 crore, with the reason for each and its main trade-off.', HELD),
    [],
  )
})

test('a BHK range is not a sector pair', () => {
  assert.deepEqual(extractSectorMentions('compare 2 and 3 BHK options', HELD), [])
})

test('a carpet area range is not a sector pair', () => {
  assert.deepEqual(extractSectorMentions('what is better, 1200 or 3 sq ft balcony', HELD), [])
})

test('explicit sectors still resolve', () => {
  assert.deepEqual(
    extractSectorMentions('Compare Sector 150 and Sector 137', HELD).sort(),
    ['Sector 137', 'Sector 150'],
  )
})

test('the second number inherits the word sector', () => {
  assert.deepEqual(extractSectorMentions('sector 76 vs 75', HELD).sort(), ['Sector 75', 'Sector 76'])
})

test('a bare number resolves only when anchored to a named sector', () => {
  assert.deepEqual(
    extractSectorMentions('is sector 76 better than 75?', HELD).sort(),
    ['Sector 75', 'Sector 76'],
  )
  // Same sentence shape, no anchor: nothing is promoted.
  assert.deepEqual(extractSectorMentions('is 76 better than 75?', HELD), [])
})

test('a budget beside a real sector does not become a second sector', () => {
  assert.deepEqual(
    extractSectorMentions('best projects in sector 150 between 1 and 2 crore', HELD),
    ['Sector 150'],
  )
})
