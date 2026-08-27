import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  classifyFailure,
  isCoolingDown,
  recordFailure,
  recordSuccess,
  resetCooldowns,
  activeCooldowns,
  cooldownReason,
} from '../providerCooldown'

// A live health check found both tier-1 Gemini keys returning 429 "You exceeded
// your current quota". With no memory in the chain those legs were retried on
// every turn, in order, costing ~1.8s before the first token of every
// conversation. The distinction this module has to get right is durable versus
// transient: cooling a provider that is merely slow removes capacity during the
// outage the chain exists to survive.

beforeEach(() => resetCooldowns())

describe('classifyFailure', () => {
  it('treats an exhausted quota as durable', () => {
    assert.equal(classifyFailure(new Error('{"error":{"code":429,"message":"You exceeded your current quota"}}')), 'durable')
    assert.equal(classifyFailure(new Error('insufficient_quota')), 'durable')
  })

  it('treats billing and payment errors as durable', () => {
    assert.equal(classifyFailure(new Error('HTTP 402 — Payment required to access this resource')), 'durable')
    assert.equal(classifyFailure(new Error('Please enable billing')), 'durable')
  })

  it('treats a bad or revoked key as durable', () => {
    assert.equal(classifyFailure(new Error('401 Unauthorized')), 'durable')
    assert.equal(classifyFailure(new Error('Invalid API key provided')), 'durable')
    assert.equal(classifyFailure(new Error('403 permission denied')), 'durable')
  })

  it('treats a retired or missing model as durable', () => {
    assert.equal(classifyFailure(new Error('Model does not exist or you do not have access to it')), 'durable')
    assert.equal(classifyFailure(new Error('410 github_models_retirement_brownout')), 'durable')
  })

  it('treats timeouts, stalls and 5xx as transient', () => {
    for (const msg of [
      'Gemini stream stalled — no chunk within timeout (8000ms)',
      'fetch failed',
      'ECONNRESET',
      'HTTP 500 — internal server error',
      'HTTP 503 — service unavailable',
      'The operation was aborted',
    ]) {
      assert.equal(classifyFailure(new Error(msg)), 'transient', msg)
    }
  })

  it('defaults an unrecognised error to transient', () => {
    // Wrongly cooling a healthy provider costs more than one wasted retry.
    assert.equal(classifyFailure(new Error('something nobody has seen before')), 'transient')
    assert.equal(classifyFailure(null), 'transient')
    assert.equal(classifyFailure(undefined), 'transient')
  })
})

describe('cooldown lifecycle', () => {
  it('skips a leg after a durable failure', () => {
    const key = 'GEMINI_API_KEY:gemini-3.6-flash'
    assert.equal(isCoolingDown(key), false)
    recordFailure(key, new Error('You exceeded your current quota'))
    assert.equal(isCoolingDown(key), true)
    assert.match(cooldownReason(key) ?? '', /exceeded your current quota/)
  })

  it('does not skip a leg after a transient failure', () => {
    const key = 'GROQ_API_KEY:openai/gpt-oss-120b'
    recordFailure(key, new Error('stream stalled — no chunk within timeout'))
    assert.equal(isCoolingDown(key), false, 'a timeout must not remove the provider')
  })

  it('trusts a leg again as soon as it answers', () => {
    const key = 'CEREBRAS_API_KEY:gpt-oss-120b'
    recordFailure(key, new Error('402 payment required'))
    assert.equal(isCoolingDown(key), true)
    recordSuccess(key)
    assert.equal(isCoolingDown(key), false, 'billing topped up mid-window should recover immediately')
  })

  it('keys cooldowns per key and model, not per provider', () => {
    // GEMINI_API_KEY appears twice in the chain with different models; the main
    // model being out of quota must not disable the lite tier, which the live
    // check showed still answering.
    const main = 'GEMINI_API_KEY:gemini-3.6-flash'
    const lite = 'GEMINI_API_KEY:gemini-3.5-flash-lite'
    recordFailure(main, new Error('429 quota'))
    assert.equal(isCoolingDown(main), true)
    assert.equal(isCoolingDown(lite), false)
  })

  it('reports what is cooling down and for how long', () => {
    recordFailure('A:m', new Error('quota'))
    const active = activeCooldowns()
    assert.equal(active.length, 1)
    assert.equal(active[0].key, 'A:m')
    assert.ok(active[0].secondsLeft > 0 && active[0].secondsLeft <= 300)
  })

  it('reports nothing when no leg has failed durably', () => {
    recordFailure('B:m', new Error('timeout'))
    assert.deepEqual(activeCooldowns(), [])
  })
})
