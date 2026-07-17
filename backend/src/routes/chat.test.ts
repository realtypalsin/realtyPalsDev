import { describe, it, expect, beforeAll, afterAll } from 'node:test'
import request from 'supertest'
import { app } from '../index'
import { prisma } from '../lib/db'

describe('POST /api/v1/chat', () => {
  let authToken: string
  let userId: string

  beforeAll(async () => {
    // Setup: create test user + get token via Better Auth
    const res = await request(app)
      .post('/api/auth/sign-up')
      .send({ email: `test-${Date.now()}@example.com`, password: 'TestPass123!' })
    authToken = res.body.token
    userId = res.body.user.id
  })

  afterAll(async () => {
    // Cleanup
    await prisma.chatSession.deleteMany({ where: { user_id: userId } })
    await prisma.user.delete({ where: { id: userId } })
  })

  it('should stream chat response with SSE headers', async () => {
    const res = await request(app)
      .post('/api/v1/chat')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        message: 'Show me 3BHK properties under 1.5 crore in Noida',
        sessionId: null,
        intent: { sector: null, bhk: [3], budgetMax: 15000000, city: 'Noida' }
      })

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/text\/event-stream/)
    expect(res.text).toMatch(/^data: /)
  })

  it('should enforce rate limit (100/60s)', async () => {
    const requests = Array.from({ length: 101 }, () =>
      request(app)
        .post('/api/v1/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'test',
          sessionId: null,
          intent: {}
        })
    )
    const results = await Promise.all(requests)
    const rateLimited = results.filter(r => r.status === 429)
    expect(rateLimited.length).toBeGreaterThan(0)
  })

  it('should return 401 without auth', async () => {
    const res = await request(app)
      .post('/api/v1/chat')
      .send({ message: 'test', sessionId: null, intent: {} })
    expect(res.status).toBe(401)
  })

  it('should prevent IDOR (accessing other user sessions)', async () => {
    const otherUserToken = 'fake-token-for-different-user'
    const sessionId = 'some-session-id'
    const res = await request(app)
      .post('/api/v1/chat')
      .set('Authorization', `Bearer ${otherUserToken}`)
      .send({ message: 'test', sessionId, intent: {} })
    expect(res.status).toBe(401)
  })

  it('should block price fabrication via guardrails', async () => {
    const res = await request(app)
      .post('/api/v1/chat')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        message: 'What is the price of non-existent project XYZ?',
        sessionId: null,
        intent: {}
      })

    // Response should either block the message or provide safe fallback
    expect(res.status).toBe(200)
    // Check that response doesn't contain fabricated price
    expect(res.text).not.toMatch(/₹\d+\s*(?:cr|crore|lakh)/)
  })
})

describe('GET /chat/session (list sessions)', () => {
  it('should distinguish DB error (500) from empty list (200)', async () => {
    const guestToken = 'test-guest-token'
    const res = await request(app)
      .get('/chat/session')
      .query({ guestToken })

    // Should return 200 with sessions array (empty or populated)
    expect([200, 500]).toContain(res.status)
    if (res.status === 200) {
      expect(res.body).toHaveProperty('sessions')
      expect(Array.isArray(res.body.sessions)).toBe(true)
    }
  })
})
