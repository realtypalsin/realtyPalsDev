import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isSpecificUnknownProject, unknownProjectDirective } from './coverageGap'

describe('coverage gap — only a NAMED project we do not hold', () => {
  it('fires when the buyer names a specific development', () => {
    assert.equal(
      isSpecificUnknownProject('tell me about Godrej Woods', ['Godrej Woods']),
      'Godrej Woods',
    )
    assert.equal(
      isSpecificUnknownProject('is Lotus Panache worth buying?', ['Lotus Panache']),
      'Lotus Panache',
    )
  })

  it('does NOT fire on a general browse', () => {
    // The whole point of the gate. "best society in sector 137" names no
    // project — the buyer is asking us to choose, not to look one up — and
    // treating it as a gap would log noise and search the web for a question
    // the database answers well.
    assert.equal(isSpecificUnknownProject('best society in sector 137', ['society']), null)
    assert.equal(isSpecificUnknownProject('what is good in Noida?', ['Noida']), null)
    assert.equal(isSpecificUnknownProject('show me 3 BHK options', ['3 BHK']), null)
  })

  it('ignores a single common word the extractor offered as a name', () => {
    assert.equal(isSpecificUnknownProject('tell me about Noida', ['Noida']), null)
    assert.equal(isSpecificUnknownProject('what about metro', ['metro']), null)
  })

  it('accepts a single word only when it is shaped like a development', () => {
    assert.equal(isSpecificUnknownProject('tell me about Panache', ['Panache']), null)
    assert.equal(isSpecificUnknownProject('tell me about Greenwood Heights', ['Greenwood Heights']), 'Greenwood Heights')
  })

  it('does nothing when retrieval found everything', () => {
    assert.equal(isSpecificUnknownProject('tell me about Godrej Woods', []), null)
  })

  it('the directive forbids a card, invented figures, and any outside destination', () => {
    const d = unknownProjectDirective('Godrej Woods')
    assert.match(d, /not yet in our verified/i)
    assert.match(d, /UNVERIFIED/)
    assert.match(d, /Do NOT present prices, possession dates or RERA numbers as facts/i)
    assert.match(d, /Never name or link another website, portal or government site/i)
    assert.match(d, /our own advisory team/i)
  })
})
