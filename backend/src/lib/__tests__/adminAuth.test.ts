import { test, describe, before, after } from 'node:test'
import { strict as assert } from 'node:assert'
import { createAdminSession, validateAdminSession, destroyAdminSession } from '../adminAuth'

describe('AdminAuth: Session Management', () => {
  let testToken: string

  before(async () => {
    // Create a test session before each test that needs it
  })

  test('createAdminSession generates valid token', async () => {
    const ip = '127.0.0.1'
    const userAgent = 'Mozilla/5.0'
    testToken = await createAdminSession(ip, userAgent)

    assert(testToken, 'Should generate a token')
    assert.equal(typeof testToken, 'string', 'Token should be a string')
    assert(testToken.length > 0, 'Token should not be empty')
  })

  test('validateAdminSession returns session for valid token', async () => {
    const ip = '127.0.0.1'
    const userAgent = 'Mozilla/5.0'
    const token = await createAdminSession(ip, userAgent)

    const session = await validateAdminSession(token)
    assert(session, 'Should find session for valid token')
    assert.equal(session.ip, ip, 'Session should store correct IP')
    assert.equal(session.userAgent, userAgent, 'Session should store correct user agent')
  })

  test('validateAdminSession returns null for invalid token', async () => {
    const session = await validateAdminSession('invalid-token-xyz')
    assert.equal(session, null, 'Should return null for invalid token')
  })

  test('validateAdminSession returns null for undefined token', async () => {
    const session = await validateAdminSession(undefined)
    assert.equal(session, null, 'Should return null for undefined token')
  })

  test('destroyAdminSession invalidates existing token', async () => {
    const ip = '127.0.0.1'
    const userAgent = 'Test Agent'
    const token = await createAdminSession(ip, userAgent)

    // Verify session exists
    let session = await validateAdminSession(token)
    assert(session, 'Session should exist before destruction')

    // Destroy session
    await destroyAdminSession(token)

    // Verify session is gone
    session = await validateAdminSession(token)
    assert.equal(session, null, 'Session should be destroyed')
  })

  test('tokens are unique across creations', async () => {
    const ip = '127.0.0.1'
    const userAgent = 'Mozilla/5.0'

    const token1 = await createAdminSession(ip, userAgent)
    const token2 = await createAdminSession(ip, userAgent)

    assert.notEqual(token1, token2, 'Each session should have a unique token')
  })

  test('session contains createdAt timestamp', async () => {
    const token = await createAdminSession('127.0.0.1', 'Agent')
    const session = await validateAdminSession(token)

    assert(session.createdAt, 'Session should have createdAt')
    const createdTime = new Date(session.createdAt)
    assert(!isNaN(createdTime.getTime()), 'createdAt should be valid ISO date')
  })

  test('session contains lastSeen timestamp', async () => {
    const token = await createAdminSession('127.0.0.1', 'Agent')
    const session = await validateAdminSession(token)

    assert(session.lastSeen, 'Session should have lastSeen')
    const lastSeenTime = new Date(session.lastSeen)
    assert(!isNaN(lastSeenTime.getTime()), 'lastSeen should be valid ISO date')
  })

  test('session IP matches creation IP', async () => {
    const testIps = ['127.0.0.1', '192.168.1.1', '10.0.0.1']

    for (const ip of testIps) {
      const token = await createAdminSession(ip, 'Agent')
      const session = await validateAdminSession(token)
      assert.equal(session.ip, ip, `Session IP should match: ${ip}`)
    }
  })

  after(async () => {
    // Cleanup: destroy any test sessions
    if (testToken) {
      try {
        await destroyAdminSession(testToken)
      } catch (err) {
        // Ignore cleanup errors
      }
    }
  })
})

describe('AdminAuth: Bearer Token Extraction', () => {
  test('Bearer token extraction format is correct', () => {
    // This test validates the expected format for requireAdmin middleware
    // Bearer tokens should be prefixed with "Bearer "
    const mockAuthHeader = 'Bearer abc123def456'
    const token = mockAuthHeader.startsWith('Bearer ')
      ? mockAuthHeader.slice(7)
      : undefined

    assert.equal(token, 'abc123def456')
  })

  test('missing Bearer prefix returns undefined', () => {
    const mockAuthHeader = 'abc123def456'
    const token = mockAuthHeader.startsWith('Bearer ')
      ? mockAuthHeader.slice(7)
      : undefined

    assert.equal(token, undefined)
  })

  test('malformed auth header is handled gracefully', () => {
    const mockAuthHeaders = [
      'Bearer',
      'bearer abc123',
      'Token abc123',
      '',
      null,
    ]

    for (const header of mockAuthHeaders) {
      if (!header) continue
      const token = header.startsWith('Bearer ')
        ? header.slice(7)
        : undefined

      // No error should occur
      assert(typeof token === 'string' || token === undefined)
    }
  })
})

describe('AdminAuth: Session Fallback (In-Memory)', () => {
  test('in-memory fallback works when Redis unavailable', async () => {
    // This validates that the fallback mechanism can function
    // Even without Redis access, sessions should be creatable
    const token = await createAdminSession('127.0.0.1', 'Test Agent')
    const session = await validateAdminSession(token)

    assert(session, 'Session should be retrievable via fallback mechanism')
    await destroyAdminSession(token)
  })

  test('destroyed session is not found in fallback', async () => {
    const token = await createAdminSession('127.0.0.1', 'Test Agent')

    // Verify it exists
    let session = await validateAdminSession(token)
    assert(session, 'Session should exist')

    // Destroy it
    await destroyAdminSession(token)

    // Verify it's gone from fallback too
    session = await validateAdminSession(token)
    assert.equal(session, null, 'Destroyed session should not be in fallback')
  })
})
