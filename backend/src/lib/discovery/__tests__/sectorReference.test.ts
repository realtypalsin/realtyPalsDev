import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveSectorReference, sectorsShownIn } from '../reference'

test('sectorsShownIn keeps order and drops repeats', () => {
  const text = 'Sector 62 is closer to the metro, while Sector 79 is quieter. Sector 62 also has more inventory.'
  assert.deepEqual(sectorsShownIn(text), ['Sector 62', 'Sector 79'])
})

test('an ordinal resolves against the sectors the last answer named', () => {
  const shown = ['Sector 62', 'Sector 79']
  assert.equal(resolveSectorReference('The second one.', shown)?.sector, 'Sector 79')
  assert.equal(resolveSectorReference('tell me about the first one', shown)?.sector, 'Sector 62')
  assert.equal(resolveSectorReference('what about the latter', shown)?.sector, 'Sector 79')
  assert.equal(resolveSectorReference('the last one', shown)?.sector, 'Sector 79')
})

test('one sector is not a list, so a pointer into it resolves to nothing', () => {
  assert.equal(resolveSectorReference('the second one', ['Sector 62']), null)
})

test('a message that names a sector outright is not pointing at a position', () => {
  assert.equal(resolveSectorReference('what about Sector 150', ['Sector 62', 'Sector 79']), null)
})

test('a message with no pointer resolves to nothing', () => {
  assert.equal(resolveSectorReference('show me 3bhk under 2cr', ['Sector 62', 'Sector 79']), null)
})
