// Every turn used to carry all six playbooks: 5,569 characters of which at most
// one applies. Time to first token tracks input size — measured on a
// six-project search, a 72,009-character prompt produced its first token after
// 11,093ms while emitting 262 characters of answer.

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { selectPlaybooks, matchedPlaybooks } from '../playbooks'

describe('playbook selection', () => {
  for (const [q, expected] of [
    ['i am relocating to noida, which areas are good', 'relocation'],
    ['what rental yield can i expect', 'yield'],
    ['i am an NRI, is it safe to buy remotely', 'nri'],
    ['where do the richest people live in noida', 'luxury'],
    ['is 2 crore too much for a 3bhk', 'pricing'],
    ['should i buy or rent as a first time buyer', 'firstTime'],
  ] as Array<[string, string]>) {
    it(`selects ${expected} for "${q.slice(0, 40)}"`, () => {
      assert.ok(matchedPlaybooks(q).includes(expected as never), `got ${matchedPlaybooks(q).join(',') || 'none'}`)
    })
  }

  it('sends nothing when no framework applies', () => {
    // A greeting needs no advisory framework, and sending six is how this block
    // became the largest avoidable thing in the prompt.
    assert.equal(selectPlaybooks('hi'), '')
    assert.equal(selectPlaybooks('show me 3 bhk in sector 150'), '')
  })

  it('never sends more than two', () => {
    // A message hitting four would undo the saving.
    const many = 'as an NRI investor relocating, is 2 crore too much for a luxury penthouse rental yield'
    assert.ok(matchedPlaybooks(many).length <= 2)
  })

  it('reads intent as well as wording', () => {
    assert.ok(matchedPlaybooks('what should I look at', { purpose: 'investment' } as never).includes('yield'))
  })

  it('matches inflected forms', () => {
    // `\brelocat\b` never matches "relocating" — the same miss `\brefund\b`
    // made on "refunded".
    assert.ok(matchedPlaybooks('relocating to noida').includes('relocation'))
    assert.ok(matchedPlaybooks('we are relocation candidates').includes('relocation'))
  })
})
