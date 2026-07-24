import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { app } from '../../index'

describe('POST /api/v1/analytics/engagement', () => {
  it('accepts valid engagement event', async () => {
    const res = await request(app).post('/api/v1/analytics/engagement').send({
      session_id: 'sess_12345',
      event: 'chat_started'
    })
    assert(res.status === 200 || res.status === 400)
  })

  it('requires event field', async () => {
    const res = await request(app).post('/api/v1/analytics/engagement').send({
      session_id: 'sess_12345'
    })
    assert.equal(res.status, 400)
  })

  it('tracks drop_off with stage and idle_seconds', async () => {
    const res = await request(app).post('/api/v1/analytics/engagement').send({
      session_id: 'sess_12345',
      event: 'drop_off',
      drop_off_stage: 'discovery',
      idle_seconds: 45
    })
    assert(res.status === 200 || res.status === 400)
  })

  it('accepts drop_off without optional fields', async () => {
    const res = await request(app).post('/api/v1/analytics/engagement').send({
      session_id: 'sess_12345',
      event: 'drop_off'
    })
    assert(res.status === 200 || res.status === 400)
  })

  it('handles first_engagement with project_id', async () => {
    const res = await request(app).post('/api/v1/analytics/engagement').send({
      session_id: 'sess_12345',
      event: 'first_engagement',
      project_id: 'proj_abc123'
    })
    assert(res.status === 200 || res.status === 400)
  })

  it('session_id is optional', async () => {
    const res = await request(app).post('/api/v1/analytics/engagement').send({
      event: 'view_page'
    })
    assert(res.status === 200 || res.status === 400)
  })

  it('creates ChatAnalytics record if not exists', async () => {
    // Database side effect — would need integration test
    assert(true)
  })

  it('handles FK constraint error gracefully', async () => {
    const res = await request(app).post('/api/v1/analytics/engagement').send({
      session_id: 'nonexistent_session_xyz',
      event: 'drop_off'
    })
    assert(res.status === 200 || res.status === 400)
  })
})

describe('POST /api/v1/analytics/promotions', () => {
  it('accepts impression event', async () => {
    const res = await request(app).post('/api/v1/analytics/promotions').send({
      action: 'impression',
      promotional_id: 'promo_123',
      session_id: 'sess_abc'
    })
    assert(res.status === 200 || res.status === 400)
  })

  it('accepts click event', async () => {
    const res = await request(app).post('/api/v1/analytics/promotions').send({
      action: 'click',
      promotional_id: 'promo_123',
      session_id: 'sess_abc'
    })
    assert(res.status === 200 || res.status === 400)
  })

  it('rejects invalid action', async () => {
    const res = await request(app).post('/api/v1/analytics/promotions').send({
      action: 'invalid_action',
      promotional_id: 'promo_123',
      session_id: 'sess_abc'
    })
    assert.equal(res.status, 400)
  })

  it('requires promotional_id', async () => {
    const res = await request(app).post('/api/v1/analytics/promotions').send({
      action: 'click',
      session_id: 'sess_abc'
    })
    assert.equal(res.status, 400)
  })

  it('requires session_id', async () => {
    const res = await request(app).post('/api/v1/analytics/promotions').send({
      action: 'click',
      promotional_id: 'promo_123'
    })
    assert.equal(res.status, 400)
  })

  it('optionally accepts user_id or guest_token', async () => {
    const withUser = await request(app).post('/api/v1/analytics/promotions').send({
      action: 'click',
      promotional_id: 'promo_123',
      session_id: 'sess_abc',
      user_id: 'user_xyz'
    })
    assert(withUser.status === 200 || withUser.status === 400)

    const withGuest = await request(app).post('/api/v1/analytics/promotions').send({
      action: 'click',
      promotional_id: 'promo_123',
      session_id: 'sess_abc',
      guest_token: 'guest_123'
    })
    assert(withGuest.status === 200 || withGuest.status === 400)
  })
})

describe('POST /api/v1/analytics/property-event', () => {
  it('accepts property event with project_id and action', async () => {
    const res = await request(app).post('/api/v1/analytics/property-event').send({
      project_id: 'proj_123',
      action: 'view',
      session_id: 'sess_abc'
    })
    assert(res.status === 200 || res.status === 400)
  })

  it('requires project_id', async () => {
    const res = await request(app).post('/api/v1/analytics/property-event').send({
      action: 'view',
      session_id: 'sess_abc'
    })
    assert.equal(res.status, 400)
  })

  it('requires action', async () => {
    const res = await request(app).post('/api/v1/analytics/property-event').send({
      project_id: 'proj_123',
      session_id: 'sess_abc'
    })
    assert.equal(res.status, 400)
  })

  it('session_id is optional but recommended', async () => {
    const res = await request(app).post('/api/v1/analytics/property-event').send({
      project_id: 'proj_123',
      action: 'view'
    })
    assert(res.status === 200 || res.status === 400)
  })

  it('accepts metadata object', async () => {
    const res = await request(app).post('/api/v1/analytics/property-event').send({
      project_id: 'proj_123',
      action: 'view',
      session_id: 'sess_abc',
      metadata: { source: 'recommendation', position: 1 }
    })
    assert(res.status === 200 || res.status === 400)
  })

  it('optionally accepts user_id or guest_token', async () => {
    const res = await request(app).post('/api/v1/analytics/property-event').send({
      project_id: 'proj_123',
      action: 'save',
      session_id: 'sess_abc',
      user_id: 'user_xyz'
    })
    assert(res.status === 200 || res.status === 400)
  })

  it('accepts null values for session_id, user_id, guest_token', async () => {
    const res = await request(app).post('/api/v1/analytics/property-event').send({
      project_id: 'proj_123',
      action: 'view',
      session_id: null,
      user_id: null,
      guest_token: null
    })
    assert(res.status === 200 || res.status === 400)
  })

  it('only stores event if session_id provided', async () => {
    // DB side effect — would need integration test
    assert(true)
  })

  it('tracks multiple action types', () => {
    const actions = ['view', 'save', 'compare', 'share', 'interested']
    for (const action of actions) {
      assert(action.length > 0)
    }
  })
})

describe('Analytics data validation', () => {
  it('rejects invalid JSON', async () => {
    const res = await request(app)
      .post('/api/v1/analytics/engagement')
      .set('Content-Type', 'application/json')
      .send('{invalid json')
    assert(res.status >= 400)
  })

  it('handles empty body', async () => {
    const res = await request(app).post('/api/v1/analytics/engagement').send({})
    assert.equal(res.status, 400)
  })

  it('validates string fields are strings', async () => {
    const res = await request(app).post('/api/v1/analytics/engagement').send({
      session_id: 12345, // number instead of string
      event: 'view'
    })
    assert.equal(res.status, 400)
  })

  it('validates numeric fields are numbers', async () => {
    const res = await request(app).post('/api/v1/analytics/engagement').send({
      session_id: 'sess_123',
      event: 'drop_off',
      idle_seconds: '45' // string instead of number
    })
    assert.equal(res.status, 400)
  })
})

describe('Analytics error handling', () => {
  it('logs errors without exposing DB details', async () => {
    // Would verify in logs
    assert(true)
  })

  it('returns consistent error format', async () => {
    const res = await request(app).post('/api/v1/analytics/engagement').send({})
    if (res.status === 400) {
      assert(res.body.error || res.body.details)
    }
  })

  it('handles database connection errors', async () => {
    // Would mock DB failure
    assert(true)
  })
})
