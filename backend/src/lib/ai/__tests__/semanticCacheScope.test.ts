import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getCachedResponse, setCachedResponse, GLOBAL_SCOPE } from '../semanticCache'

describe('semanticCache scoping', () => {
  it('does not leak a project-specific answer to another project', () => {
    // Regression: entries were keyed on normalized question text alone, so a
    // payment-plan answer written around one project was served verbatim to the
    // next buyer asking the same question about a different one.
    setCachedResponse('show payment plans', { token: 'Godrej CLP 10:80:10' }, undefined, 'project:godrej-1')

    assert.equal(
      getCachedResponse('show payment plans', 'project:ats-2'),
      null,
      'a different project must miss',
    )
    assert.equal(
      getCachedResponse('show payment plans'),
      null,
      'the pre-intent global read must not surface project-scoped entries',
    )
    assert.equal(
      getCachedResponse('show payment plans', 'project:godrej-1')?.token,
      'Godrej CLP 10:80:10',
      'the owning project must still hit',
    )
  })

  it('still shares genuinely global answers', () => {
    setCachedResponse('what is stamp duty in up', { token: '7% plus 1% registry' }, undefined, GLOBAL_SCOPE)
    assert.equal(getCachedResponse('what is stamp duty in up')?.token, '7% plus 1% registry')
  })

  it('ignores keys below the minimum length', () => {
    setCachedResponse('ok', { token: 'x' })
    assert.equal(getCachedResponse('ok'), null)
  })
})
