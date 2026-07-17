import { test, describe } from 'node:test'
import { strict as assert } from 'node:assert'
import { scoreProject, computeBudgetStatus, buildPriceRangeLabel } from '../scoring'
import type { Intent } from '../types'

describe('Scoring: Price Range Label', () => {
  test('formats range with min and max', () => {
    const label = buildPriceRangeLabel(1.5, 2.5)
    assert.equal(label, '₹1.50–2.50Cr')
  })

  test('formats with min only (+ notation)', () => {
    const label = buildPriceRangeLabel(2.0, null)
    assert.equal(label, '₹2.00Cr+')
  })

  test('returns "Price on request" when no data', () => {
    const label = buildPriceRangeLabel(null, null)
    assert.equal(label, 'Price on request')
  })
})

describe('Scoring: Budget Status', () => {
  test('returns "within" when project min ≤ intent max', () => {
    const unitTypes = [{ price_min_cr: 1.5 }]
    const intent: Intent = { budgetMax: 2.0 }
    const status = computeBudgetStatus(unitTypes, intent)
    assert.equal(status, 'within')
  })

  test('returns "slightly_over" when project within tolerance', () => {
    const unitTypes = [{ price_min_cr: 2.1 }]
    const intent: Intent = { budgetMax: 2.0 }
    const status = computeBudgetStatus(unitTypes, intent)
    assert.equal(status, 'slightly_over')
  })

  test('returns "over" when project significantly exceeds budget', () => {
    const unitTypes = [{ price_min_cr: 3.0 }]
    const intent: Intent = { budgetMax: 2.0 }
    const status = computeBudgetStatus(unitTypes, intent)
    assert.equal(status, 'over')
  })

  test('uses lowest price when multiple unit types', () => {
    const unitTypes = [
      { price_min_cr: 5.0 },
      { price_min_cr: 2.0 },
      { price_min_cr: 3.5 },
    ]
    const intent: Intent = { budgetMax: 2.5 }
    const status = computeBudgetStatus(unitTypes, intent)
    assert.equal(status, 'within')
  })

  test('returns undefined when no budget intent', () => {
    const unitTypes = [{ price_min_cr: 2.0 }]
    const intent: Intent = {}
    const status = computeBudgetStatus(unitTypes, intent)
    assert.equal(status, undefined)
  })

  test('returns undefined when no price data', () => {
    const unitTypes = [{ price_min_cr: null }]
    const intent: Intent = { budgetMax: 2.0 }
    const status = computeBudgetStatus(unitTypes, intent)
    assert.equal(status, undefined)
  })
})

describe('Scoring: Project Score', () => {
  const baseProject = {
    unit_types: [
      {
        bhk: 3,
        price_min_cr: 2.0,
        price_max_cr: 2.5,
        carpet_area_sqft: 1200,
      }
    ],
    possession_date: new Date('2025-06-01'),
    amenities: [
      { name: 'Swimming Pool' },
      { name: 'Gym' },
      { name: 'Park' },
    ],
    ai_search_keywords: ['metro', 'mall', 'school'],
    builder: {
      credai_member: true,
      delivered_units: 5000,
      awards_count: 3,
      legal_flag: null,
    },
    hero_image_url: 'https://example.com/image.jpg',
    images: [{ type: 'interior' }, { type: 'exterior' }],
    rera_number: 'UPRERAPRJ123456',
    recommendation_profile: { tier: 'premium' },
    project_risk_flag: null,
    persona_profile: { primary_persona: 'first_time_buyer' },
  }

  test('scores within-budget projects with possession within 6 months highest', () => {
    const intent: Intent = { budgetMax: 2.0, possession: 'immediate' }
    const score1 = scoreProject({ ...baseProject, possession_date: new Date() }, intent)

    const futureProject = {
      ...baseProject,
      possession_date: new Date('2027-01-01'),
    }
    const score2 = scoreProject(futureProject, intent)

    assert(score1 > score2, 'Recent possession should score higher')
  })

  test('maximum score never exceeds 60', () => {
    const intent: Intent = { budgetMax: 3.0 }
    const score = scoreProject(baseProject, intent)
    assert(score <= 60, `Score ${score} exceeds maximum of 60`)
  })

  test('applies penalty for slightly_over budget', () => {
    const baseIntent: Intent = { budgetMax: 2.0 }
    const scoreWithin = scoreProject(baseProject, baseIntent, 'within')

    const overProject = {
      ...baseProject,
      unit_types: [
        {
          bhk: 3,
          price_min_cr: 2.15, // slightly over
          price_max_cr: 2.5,
          carpet_area_sqft: 1200,
        }
      ],
    }
    const scoreOver = scoreProject(overProject, baseIntent, 'slightly_over')

    assert(scoreWithin > scoreOver, 'Slightly over budget should have lower score')
  })

  test('applies larger penalty for significantly over budget', () => {
    const baseIntent: Intent = { budgetMax: 2.0 }

    const slightlyOverProject = {
      ...baseProject,
      unit_types: [
        {
          bhk: 3,
          price_min_cr: 2.15,
          price_max_cr: 2.5,
          carpet_area_sqft: 1200,
        }
      ],
    }
    const scoreSlightlyOver = scoreProject(slightlyOverProject, baseIntent, 'slightly_over')

    const significantlyOverProject = {
      ...baseProject,
      unit_types: [
        {
          bhk: 3,
          price_min_cr: 3.0,
          price_max_cr: 3.5,
          carpet_area_sqft: 1200,
        }
      ],
    }
    const scoreOver = scoreProject(significantlyOverProject, baseIntent, 'over')

    assert(scoreSlightlyOver > scoreOver, 'Significantly over budget should have larger penalty')
  })

  test('score is never negative', () => {
    const intent: Intent = { budgetMax: 1.0 }
    const expensiveProject = {
      ...baseProject,
      unit_types: [
        {
          bhk: 3,
          price_min_cr: 10.0,
          price_max_cr: 15.0,
          carpet_area_sqft: 1200,
        }
      ],
    }
    const score = scoreProject(expensiveProject, intent)
    assert(score >= 0, `Score ${score} should never be negative`)
  })

  test('projects without required data still score (graceful degradation)', () => {
    const minimalProject = {
      unit_types: [{ bhk: 3, price_min_cr: null, price_max_cr: null, carpet_area_sqft: null }],
      possession_date: null,
      amenities: [],
      ai_search_keywords: [],
      builder: {},
      hero_image_url: null,
      images: [],
      rera_number: null,
      recommendation_profile: null,
      project_risk_flag: null,
      persona_profile: null,
    }
    const intent: Intent = { budgetMax: 2.0 }
    const score = scoreProject(minimalProject, intent)
    assert(typeof score === 'number' && !isNaN(score), 'Should return valid score even with minimal data')
  })
})
