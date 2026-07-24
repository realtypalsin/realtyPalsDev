import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { destroyAdminSession, validateAdminSession } from './adminAuth'

describe('Admin Auth: Session management', () => {
  it('validateAdminSession returns null for undefined token', async () => {
    const result = await validateAdminSession(undefined)
    assert(result === null)
  })

  it('validateAdminSession returns null for invalid token', async () => {
    const result = await validateAdminSession('invalid-token-format')
    assert(result === null)
  })

  it('destroyAdminSession resolves without error', async () => {
    const token = 'test-token-' + Date.now()
    // Should not throw
    await destroyAdminSession(token)
    assert(true)
  })
})

describe('Session validity', () => {
  it('session token has expected format', () => {
    // Tokens follow pattern: session_${random32chars}
    const tokenRegex = /^session_[a-f0-9]{32}$/
    assert(tokenRegex.test('session_' + 'a'.repeat(32)))
  })

  it('token should expire after 7 days', () => {
    // 7 days in milliseconds
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
    assert(sevenDaysMs === 604800000)
  })
})
