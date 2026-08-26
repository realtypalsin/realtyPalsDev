import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { adaptiveCapMessages, CONTEXT_TOKEN_CEILING } from '../adaptiveMessaging'

function history(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
    content: `turn ${i} ${'word '.repeat(20)}`,
  }))
}

describe('adaptiveCapMessages', () => {
  it('keeps the full window when it fits the context ceiling', () => {
    const msgs = history(8)
    const res = adaptiveCapMessages(msgs, 10_000, CONTEXT_TOKEN_CEILING, 3000)
    assert.equal(res.messages.length, 8, 'an 8-turn history well under 100k must survive intact')
  })

  it('does not collapse to 2 messages when the reserve is passed separately', () => {
    // Regression: fallbackChain used to pass the OUTPUT maxTokens (3000) as the
    // ceiling. messageBudget then went negative and the "keep at least 2" clamp
    // fired on every request, capping conversation memory at one exchange.
    const msgs = history(8)
    const withOutputAsCeiling = adaptiveCapMessages(msgs, 10_000, 3000, 0)
    assert.equal(withOutputAsCeiling.messages.length, 2, 'demonstrates the old bug')

    const correct = adaptiveCapMessages(msgs, 10_000, CONTEXT_TOKEN_CEILING, 3000)
    assert.ok(correct.messages.length > 2, 'correct ceiling must retain more than one exchange')
  })

  it('trims oldest first when the system prompt eats the budget', () => {
    const msgs = history(8)
    // Leaves ~100 tokens of message budget — a few turns fit, not all 8.
    const res = adaptiveCapMessages(msgs, CONTEXT_TOKEN_CEILING - 3600, CONTEXT_TOKEN_CEILING, 3000)
    assert.ok(res.messages.length < 8, 'must shed history under pressure')
    assert.ok(
      res.messages[res.messages.length - 1].content.startsWith('turn 7'),
      'the most recent turn must always be kept',
    )
  })
})
