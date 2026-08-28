import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
// getCachedResponseLocal, not getCachedResponse: these cases are about how keys
// are built, and the async variant would reach for Redis that is not configured
// in a unit test run.
import { getCachedResponseLocal, setCachedResponse, intentFingerprint, GLOBAL_SCOPE } from '../semanticCache'

describe('semanticCache scoping', () => {
  it('does not leak a project-specific answer to another project', () => {
    // Regression: entries were keyed on normalized question text alone, so a
    // payment-plan answer written around one project was served verbatim to the
    // next buyer asking the same question about a different one.
    setCachedResponse('show payment plans', { token: 'Godrej CLP 10:80:10' }, undefined, 'project:godrej-1')

    assert.equal(
      getCachedResponseLocal('show payment plans', 'project:ats-2'),
      null,
      'a different project must miss',
    )
    assert.equal(
      getCachedResponseLocal('show payment plans'),
      null,
      'the pre-intent global read must not surface project-scoped entries',
    )
    assert.equal(
      getCachedResponseLocal('show payment plans', 'project:godrej-1')?.token,
      'Godrej CLP 10:80:10',
      'the owning project must still hit',
    )
  })

  it('still shares genuinely global answers', () => {
    setCachedResponse('what is stamp duty in up', { token: '7% plus 1% registry' }, undefined, GLOBAL_SCOPE)
    assert.equal(getCachedResponseLocal('what is stamp duty in up')?.token, '7% plus 1% registry')
  })

  it('ignores keys below the minimum length', () => {
    setCachedResponse('ok', { token: 'x' })
    assert.equal(getCachedResponseLocal('ok'), null)
  })
})

describe('semanticCache intent fingerprinting', () => {
  it('does not serve an answer written for one budget to a buyer with another', () => {
    // The cache is read before the model runs, on the raw message. Without a
    // fingerprint, "show me something bigger" answered for a ₹1.5cr buyer would
    // be replayed verbatim to a ₹80L one — the words match, the answer does not.
    const rich = intentFingerprint({ budgetMax: 1.5, bhk: [3] })
    const modest = intentFingerprint({ budgetMax: 0.8, bhk: [2] })

    setCachedResponse('best sector to live in noida', { token: 'Sector 150' }, undefined, GLOBAL_SCOPE, rich)

    assert.equal(
      getCachedResponseLocal('best sector to live in noida', GLOBAL_SCOPE, modest),
      null,
      'a different stated budget must miss',
    )
    assert.equal(
      getCachedResponseLocal('best sector to live in noida', GLOBAL_SCOPE, rich)?.token,
      'Sector 150',
      'the same situation must hit',
    )
  })

  it('shares one entry between buyers in the same situation', () => {
    // Not a leak — two buyers who have told us the same things get the same
    // answer, and paying twice for it is the thing being fixed.
    const a = intentFingerprint({ bhk: [2], sector: 'Sector 75' })
    const b = intentFingerprint({ sector: 'Sector 75', bhk: [2] })
    assert.equal(a, b, 'field order must not split the bucket')
  })

  it('buckets a first turn as anon, which is where head terms land', () => {
    assert.equal(intentFingerprint({}), 'anon')
    assert.equal(intentFingerprint(null), 'anon')
    // Bookkeeping fields are not answer-shaping and must not fragment the bucket.
    assert.equal(intentFingerprint({ queryKind: 'DISCOVERY', radiusKm: 3.5 }), 'anon')
  })

  it('ignores empty arrays so an absent BHK is still anon', () => {
    assert.equal(intentFingerprint({ bhk: [], projectNames: [] }), 'anon')
  })
})
