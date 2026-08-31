import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { endCleanly } from './endCleanly'

describe('ending an answer cleanly', () => {
  it('leaves a finished answer untouched', () => {
    const t = 'Sector 150 fits your budget. Possession is expected in 2027.'
    assert.equal(endCleanly(t), t)
  })

  it('drops a half-built table row', () => {
    // The real cut from the 30 Aug run.
    const t = [
      '| Sector | Buyer | Rate |',
      '| :--- | :--- | :--- |',
      '| **Sector 150** | End use | 12,000 |',
      '| **Techzone 4**   | IT commuters, NRIs          | 5,80',
    ].join('\n')
    const out = endCleanly(t)
    assert.ok(!out.includes('5,80'), out)
    assert.ok(out.trimEnd().endsWith('12,000 |'), out)
  })

  it('cuts back to the last finished sentence', () => {
    const t = 'Sector 150 fits your budget. Possession is expected in 2027. The trade-off is that the'
    assert.equal(endCleanly(t), 'Sector 150 fits your budget. Possession is expected in 2027.')
  })

  it('does not mistake a decimal point for a sentence end', () => {
    const t = 'Your ceiling is about ₹1.25 crore, which buys a 2 BHK in Sector 76. It will be tight for a'
    assert.ok(endCleanly(t).endsWith('Sector 76.'), endCleanly(t))
  })

  it('keeps the rough edge rather than destroying the answer', () => {
    // Trimming here would discard most of the reply. A dangling half-sentence
    // is worth losing; half an answer is not.
    const t = 'This one long unbroken clause runs on and on without any terminator at all and then just'
    assert.equal(endCleanly(t), t)
  })

  it('leaves a complete table alone', () => {
    const t = '| A | B |\n| :--- | :--- |\n| 1 | 2 |'
    assert.equal(endCleanly(t), t)
  })

  it('handles an empty answer without throwing', () => {
    assert.equal(endCleanly(''), '')
  })
})

describe('endCleanly on a stream tail rather than a whole answer', () => {
  // The tail buffer in fallbackChain holds only the last ~180 characters, so
  // the ratio guard — which assumes it is looking at the entire answer —
  // refuses to trim exactly the fragments it exists to remove. maxTrimChars
  // is how the tail path opts out of an assumption that is false for it.

  it('drops a dangling row that is most of the tail', () => {
    const tail = '| **Techzone 4** | IT commuters | 5,80'
    // Without the option the ratio guard keeps it: dropping the row loses
    // everything the tail is holding.
    assert.equal(endCleanly(tail), tail)
    assert.equal(endCleanly(tail, { maxTrimChars: tail.length }), '')
  })

  it('drops a dangling clause that is most of the tail', () => {
    const tail = 'possession is 2027. The trade-off is that the nearest metro'
    assert.equal(
      endCleanly(tail, { maxTrimChars: tail.length }),
      'possession is 2027.',
    )
  })

  it('still leaves a tail that already ends cleanly', () => {
    const tail = 'and possession is expected in 2027.'
    assert.equal(endCleanly(tail, { maxTrimChars: tail.length }), tail)
  })

  it('respects a tighter cap when one is given', () => {
    const tail = 'possession is 2027. The trade-off is that the nearest metro'
    // Trimming needs 40 chars; only 5 are allowed, so the edge is kept.
    assert.equal(endCleanly(tail, { maxTrimChars: 5 }), tail)
  })
})
