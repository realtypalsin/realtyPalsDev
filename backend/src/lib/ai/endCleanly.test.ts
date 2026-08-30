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
