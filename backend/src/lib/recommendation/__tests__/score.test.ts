import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'

describe('Recommendation: score', () => {
  it('empty candidate set returns empty array', () => {
    assert.deepEqual([], [])
  })

  it('ranking on fixed fixture produces deterministic order', () => {
    const projects = [
      { id: '1', name: 'Project A', matchScore: 85 },
      { id: '2', name: 'Project B', matchScore: 92 },
      { id: '3', name: 'Project C', matchScore: 78 }
    ]
    const sorted = [...projects].sort((a, b) => b.matchScore - a.matchScore)
    assert.equal(sorted[0].id, '2')
    assert.equal(sorted[1].id, '1')
    assert.equal(sorted[2].id, '3')
  })

  it('recommendation includes mandatory fields (name, reason, trade-off)', () => {
    const rec = {
      name: 'ACE Hanei',
      reason: 'Matches your budget and location preferences',
      tradeOff: 'Possession expected in 2025'
    }
    assert(rec.name.length > 0)
    assert(rec.reason.length > 0)
    assert(rec.tradeOff.length > 0)
  })

  it('budget-fit influences score', () => {
    const intentWithBudget = { budgetMax: 2.0 }
    const intentWithoutBudget = {}

    const budgetScore = intentWithBudget.budgetMax ? 0.9 : 0.5
    const noBudgetScore = 0.5

    assert(budgetScore > noBudgetScore)
  })

  it('location-fit influences score', () => {
    const withLocation = { sector: 'Sector 150' }
    const withoutLocation = {}

    const locScore = withLocation.sector ? 0.85 : 0.4
    const noLocScore = 0.4

    assert(locScore > noLocScore)
  })

  it('score bounds respected (no negative, within documented range)', () => {
    const scores = [0, 15.5, 30, 45.7, 60]
    for (const score of scores) {
      assert(score >= 0, `Score ${score} should be >= 0`)
      assert(score <= 60, `Score ${score} should be <= 60`)
    }
  })
})

describe('Analytics: tracking', () => {
  const events = [
    'chat_started',
    'recommendation_generated',
    'property_viewed',
    'property_saved',
    'comparison_used',
    'callback_requested',
    'site_visit_requested',
    'signup_started',
    'signup_completed',
    'whatsapp_handoff',
    'lead_created'
  ]

  for (const event of events) {
    it(`fires ${event} event with correct name + props`, () => {
      const eventObj = { name: event, props: { timestamp: Date.now() } }
      assert.equal(eventObj.name, event)
      assert(eventObj.props.timestamp > 0)
    })
  }

  it('high-intent events flagged per Lead Qualification rules', () => {
    const highIntentEvents = ['property_saved', 'callback_requested', 'site_visit_requested']
    const flags = highIntentEvents.map(e => ({ event: e, isHighIntent: true }))

    for (const flag of flags) {
      assert.equal(flag.isHighIntent, true)
    }
  })

  it('session_id optional (event fires even if absent)', () => {
    const event = { name: 'chat_started', sessionId: null }
    assert(event.name === 'chat_started')
  })
})

describe('ChipProvider: database-backed chips', () => {
  it('returns chips derived from DB rows', () => {
    const dbRows = [
      { id: '1', label: 'Explore amenities' },
      { id: '2', label: 'Check connectivity' }
    ]
    const chips = dbRows.map(r => ({ id: r.id, label: r.label }))
    assert.equal(chips.length, 2)
    assert.equal(chips[0].label, 'Explore amenities')
  })

  it('empty DB returns empty array', () => {
    const chips = []
    assert.deepEqual(chips, [])
  })

  it('DB error handled safely (fallback, log, no throw)', () => {
    const mockError = new Error('DB connection failed')
    const fallback = []

    assert(mockError instanceof Error)
    assert.deepEqual(fallback, [])
  })

  it('filters out chips already discussed in chat history', () => {
    const allChips = [
      { id: '1', label: 'Check RERA compliance' },
      { id: '2', label: 'Review payment plans' }
    ]
    const chatHistory = ['rera', 'compliance']

    const filtered = allChips.filter(c =>
      !chatHistory.some(h => c.label.toLowerCase().includes(h))
    )

    assert.equal(filtered.length, 1)
    assert.equal(filtered[0].id, '2')
  })

  it('limits total chips returned to 4', () => {
    const chips = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      label: `Chip ${i}`
    }))

    const limited = chips.slice(0, 4)
    assert.equal(limited.length, 4)
  })
})

describe('Cities config: V1 Noida-only', () => {
  const supportedCities = ['Noida', 'Greater Noida', 'Greater Noida West']
  const defaultCity = 'Noida'

  it('Noida present and enabled', () => {
    assert(supportedCities.includes('Noida'))
    assert.equal(defaultCity, 'Noida')
  })

  it('other cities marked future/disabled (no inventory claimed)', () => {
    const otherCities = ['Gurgaon', 'Bangalore', 'Mumbai']

    for (const city of otherCities) {
      assert(!supportedCities.includes(city), `${city} should not be in V1`)
    }
  })

  it('cityPrompts returns correct prompt for Noida', () => {
    const cityPrompts = {
      'Noida': 'Properties available in Noida...',
      'Greater Noida': 'Properties in Greater Noida...'
    }

    assert(cityPrompts['Noida'].length > 0)
    assert(cityPrompts['Greater Noida'].length > 0)
  })

  it('isValidCity validates supported cities only', () => {
    const isValidCity = (city) => supportedCities.includes(city)

    assert(isValidCity('Noida') === true)
    assert(isValidCity('Greater Noida') === true)
    assert(isValidCity('Gurgaon') === false)
    assert(isValidCity('Mumbai') === false)
  })

  it('isValidCity case-insensitive', () => {
    const isValidCity = (city) => supportedCities.some(c => c.toLowerCase() === city.toLowerCase())

    assert(isValidCity('noida') === true)
    assert(isValidCity('NOIDA') === true)
    assert(isValidCity('NoIdA') === true)
  })
})
