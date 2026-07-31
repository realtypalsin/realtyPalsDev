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
        builder_track_record_score: 90,
        price_position_score: 80,
        locality_score: 85,
        rera_compliance_score: 100,
        amenity_depth_score: 70,
        possession_certainty_score: 75,
      },
    })
    assert.equal(result.basis_count, 6)
    assert.equal(result.confidence, 100)
  })

  it('reports partial basis when only some dna scores are present', () => {
    const result = computeRecommendationScore({
      ...baseInput,
      dna: {
        builder_track_record_score: 90,
        price_position_score: 80,
        locality_score: null,
        rera_compliance_score: null,
        amenity_depth_score: null,
        possession_certainty_score: null,
      },
    })
    assert.equal(result.basis_count, 2)
    assert.equal(result.confidence, Math.round((2 / 6) * 100))
  })
})
