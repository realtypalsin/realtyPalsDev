import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { recordFailure, resetCooldowns, activeCooldowns } from './providerCooldown'
describe('a depleted balance is not retried on the five-minute window', () => {
  it('treats a bare 402 as balance exhaustion', () => {
    // All the OpenAI SDK throws for a Cerebras payment failure is
    // "402 status code (no body)" — no message, no type. Matching only the
    // words meant both Cerebras legs were re-probed every five minutes all run.
    resetCooldowns()
    recordFailure('CEREBRAS_API_KEY:gpt-oss-120b', new Error('402 status code (no body)'))
    const entry = activeCooldowns().find(c => c.key.startsWith('CEREBRAS_API_KEY'))
    assert.ok(entry, 'no cooldown recorded')
    assert.ok(entry.secondsLeft > 30 * 60, `cooled for only ${entry.secondsLeft}s`)
  })

  it('still cools a per-minute rate limit briefly', () => {
    resetCooldowns()
    recordFailure('GROQ_API_KEY:gpt-oss-120b', new Error('429 rate limit reached, please retry after 20s'))
    const entry = activeCooldowns().find(c => c.key.startsWith('GROQ_API_KEY'))
    assert.ok(entry, 'no cooldown recorded')
    assert.ok(entry.secondsLeft <= 70, `cooled for ${entry.secondsLeft}s, expected a short window`)
  })
})
