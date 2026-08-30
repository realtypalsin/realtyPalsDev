import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createInactivityGuard, StreamStalledError } from './streamTimeout'

const tick = (ms: number) => new Promise(r => setTimeout(r, ms))

describe('stream inactivity guard', () => {
  it('aborts after silence', async () => {
    const guard = createInactivityGuard('test', 30)
    await tick(60)
    assert.equal(guard.signal.aborted, true)
    guard.clear()
  })

  it('does not abort while chunks keep arriving', async () => {
    // A slow but progressing generation must never be cut off mid-sentence,
    // which is the whole reason this is an inactivity timer and not a deadline.
    const guard = createInactivityGuard('test', 60)
    for (let i = 0; i < 6; i++) {
      await tick(20)
      guard.reset()
    }
    assert.equal(guard.signal.aborted, false)
    guard.clear()
  })

  it('rethrows a stall as StreamStalledError, carrying whether tokens were sent', async () => {
    const guard = createInactivityGuard('mistral', 20)
    guard.markTokenSent()
    await tick(50)
    assert.throws(
      () => guard.rethrow(new Error('aborted')),
      (err: unknown) => err instanceof StreamStalledError && err.tokensSent === true,
    )
  })

  it('rethrows an unrelated failure unchanged', () => {
    // A 402 or a 429 must reach the chain as itself: it drives the cooldown
    // classification, and a stall error would cool the wrong way.
    const guard = createInactivityGuard('mistral', 10_000)
    const original = new Error('402 status code (no body)')
    assert.throws(() => guard.rethrow(original), (err: unknown) => err === original)
    guard.clear()
  })

  it('clear() stops the timer, so a finished stream cannot abort later', async () => {
    const guard = createInactivityGuard('test', 30)
    guard.clear()
    await tick(60)
    assert.equal(guard.signal.aborted, false)
  })
})
