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

describe('the first chunk is a different deadline from the ones after it', () => {
  // Waiting for a stream to START and waiting for it to CONTINUE are different
  // failures, and a single window treated them alike. Measured over the corpus,
  // the calls that set p99 were not long answers — the 39.4s call that set it
  // emitted about 536 tokens, so nearly all of that was spent before the first
  // chunk. A leg silent for 25s is not about to become the fast path, while a
  // leg that IS producing must never be cut off mid-sentence.

  it('gives up early when nothing ever arrives', async () => {
    const guard = createInactivityGuard('test', 5_000, 40)
    await tick(80)
    assert.equal(guard.signal.aborted, true, 'should abort on the short first-token budget')
    guard.clear()
  })

  it('switches to the longer budget once the first chunk lands', async () => {
    // First-token budget 40ms, mid-stream 400ms. One chunk arrives at 20ms;
    // after that a 120ms gap must be tolerated, because the stream is alive.
    const guard = createInactivityGuard('test', 400, 40)
    await tick(20)
    guard.reset() // the first chunk
    await tick(120)
    assert.equal(guard.signal.aborted, false, 'a producing stream was cut off')
    guard.clear()
  })

  it('still aborts a stream that starts and then dies', async () => {
    const guard = createInactivityGuard('test', 60, 40)
    await tick(20)
    guard.reset()
    await tick(120)
    assert.equal(guard.signal.aborted, true)
    guard.clear()
  })

  it('never lets the first-token budget exceed the inactivity budget', async () => {
    // A caller passing one number means "this is my timeout". Defaulting the
    // first-token phase to 25s would silently give a 30ms guard a 25s window.
    const guard = createInactivityGuard('test', 30)
    await tick(70)
    assert.equal(guard.signal.aborted, true)
    guard.clear()
  })
})
