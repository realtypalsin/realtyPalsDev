import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeOutput, isClean } from './sanitizeOutput'

describe('output sanitising', () => {
  it('removes the emoji the prompt already banned', () => {
    // Five of fifty answers carried emoji while the prompt read "NO EMOJI,
    // ANYWHERE". A rule the model can ignore is not a guarantee.
    const r = sanitizeOutput('🏗️ Coverage Status: Noida ⭐ Good ❌ No ⚠️ Medium')
    assert.ok(isClean(r.text), r.text)
    assert.ok(r.strippedEmoji >= 4)
  })

  it('leaves rupees, arrows in prose and ordinary punctuation alone', () => {
    const src = 'Sector 150 runs ₹11,500/sqft — 20% above Sector 120.'
    assert.equal(sanitizeOutput(src).text, src)
  })

  it('replaces a competitor name rather than deleting it', () => {
    // Deleting leaves "prices on are higher", which is worse than the name.
    const r = sanitizeOutput('Prices on 99acres are higher than ours.')
    assert.ok(!/99acres/i.test(r.text))
    assert.match(r.text, /market listings/)
  })

  it('removes the empty citation a stripped name leaves behind', () => {
    const r = sanitizeOutput('2 BHK rents are ₹22,000–35,000 (Source: MagicBricks)')
    assert.ok(!/\(\s*Source\s*:?\s*\)/i.test(r.text), r.text)
    assert.ok(!/MagicBricks/i.test(r.text))
  })

  it('catches every portal on the ban list', () => {
    for (const p of ['99acres', 'MagicBricks', 'NoBroker', 'Housing.com', 'PropTiger', 'Square Yards']) {
      const r = sanitizeOutput(`Listed on ${p} today.`)
      assert.ok(!new RegExp(p.replace('.', '\\.'), 'i').test(r.text), `${p} survived`)
    }
  })

  it('does not touch the word housing on its own', () => {
    const src = 'Group housing societies prohibit short-term rentals.'
    assert.equal(sanitizeOutput(src).text, src)
  })

  it('is a no-op on clean text, and says so', () => {
    const src = 'Sector 128 is the stronger choice for immediate possession.'
    const r = sanitizeOutput(src)
    assert.equal(r.text, src)
    assert.equal(r.strippedEmoji, 0)
    assert.equal(r.strippedPlatforms, 0)
  })

  it('survives empty input', () => {
    assert.equal(sanitizeOutput('').text, '')
  })
})
