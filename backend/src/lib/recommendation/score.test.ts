import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { computeRecommendationScore } from './score'

const baseInput = {
  status: 'under_construction' as const,
  possession_date: null,
  project_risk_flag: null,
  builder: { legal_flag: null },
}

describe('computeRecommendationScore confidence', () => {
  it('reports 0 basis and 0 confidence when dna is null', () => {
    const result = computeRecommendationScore({ ...baseInput, dna: null })
    assert.equal(result.basis_count, 0)
    assert.equal(result.confidence, 0)
  })

  it('reports full basis and confidence when all 6 dna scores are present', () => {
    const result = computeRecommendationScore({
      ...baseInput,
      dna: {
        builder_score: 90,
        price_score: 80,
        location_score: 85,
        legal_score: 100,
        amenity_score: 70,
        possession_score: 75,
      },
    })
    assert.equal(result.basis_count, 6)
    assert.equal(result.confidence, 100)
  })

  it('reports partial basis when only some dna scores are present', () => {
    const result = computeRecommendationScore({
      ...baseInput,
      dna: {
        builder_score: 90,
        price_score: 80,
        location_score: null,
        legal_score: null,
        amenity_score: null,
        possession_score: null,
      },
    })
    assert.equal(result.basis_count, 2)
    assert.equal(result.confidence, Math.round((2 / 6) * 100))
  })
})
