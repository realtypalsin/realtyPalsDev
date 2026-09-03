import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { oneQuestion } from '../oneQuestion'

describe('one question per turn', () => {
  it('trims a second ask joined with ", and"', () => {
    const r = oneQuestion('Are you aiming for a ready-to-move 3 or 4 BHK, and what is your target budget for your family\'s home?')
    assert.equal(r.trimmed, 1)
    assert.equal(r.text, 'Are you aiming for a ready-to-move 3 or 4 BHK?')
  })

  it('drops a trailing second question', () => {
    const r = oneQuestion('Which sector are you leaning toward? And what is your budget?')
    assert.equal(r.trimmed, 1)
    assert.equal(r.text, 'Which sector are you leaning toward?')
  })

  it('leaves an either/or alone — one decision, two options', () => {
    const text = 'Do you want expressway connectivity, or would you rather be near the metro?'
    assert.deepEqual(oneQuestion(text), { text, trimmed: 0 })
  })

  it('leaves a single question alone', () => {
    const text = 'Possession is June 2025. Want the payment plan?'
    assert.deepEqual(oneQuestion(text), { text, trimmed: 0 })
  })

  it('leaves prose with no question alone', () => {
    const text = 'Possession is scheduled for June 2025.'
    assert.deepEqual(oneQuestion(text), { text, trimmed: 0 })
  })

  it('keeps a question mark inside a table and still trims the prose after it', () => {
    const text = '| Q | A |\n| :--- | :--- |\n| Ready? | Yes |\n\nWhich one shall I open? And what is your budget?'
    const r = oneQuestion(text)
    assert.ok(r.text.includes('| Ready? | Yes |'), r.text)
    assert.ok(r.text.trimEnd().endsWith('Which one shall I open?'), r.text)
  })
})
