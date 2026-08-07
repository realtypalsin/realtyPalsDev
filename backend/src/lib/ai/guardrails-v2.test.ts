import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { validateAgainstFacts } from './guardrails-v2'

describe('guardrails-v2: schema-based validation', () => {
  it('should pass when response uses only known project names', async () => {
    const systemPrompt = `
    Verified facts: {
      "projects": [
        { "name": "Godrej Palm Retreat", "sector": "Sector 150", "rera_number": "UPRERAPRJ123" }
      ]
    }
    `
    const response = 'Godrej Palm Retreat is a great option.'
    const result = await validateAgainstFacts(response, systemPrompt)
    assert.equal(result.violations.length, 0)
    assert.equal(result.blocked, false)
  })

  it('should catch fabricated project names', async () => {
    const systemPrompt = `
    Verified facts: {
      "projects": [
        { "name": "Godrej Palm Retreat" }
      ]
    }
    `
    const response = 'I recommend the project Lodha Metropolis Residences in Sector 75.'
    const result = await validateAgainstFacts(response, systemPrompt)
    assert(result.violations.some((v) => v.type === 'name_fabrication'))
    assert.equal(result.blocked, true)
  })

  it('should catch fabricated prices outside known ranges', async () => {
    const systemPrompt = `
    Verified facts: {
      "projects": [
        { "name": "Project A", "price_min_cr": 1.5, "price_max_cr": 2.0 }
      ]
    }
    `
    const response = 'The price is only ₹5 Crore.'
    const result = await validateAgainstFacts(response, systemPrompt)
    assert(result.violations.some((v) => v.type === 'price_fabrication'))
    assert.equal(result.blocked, true)
  })

  it('should handle missing systemPrompt gracefully', async () => {
    const result = await validateAgainstFacts('any response', undefined)
    assert.equal(result.blocked, false)
    assert.equal(result.violations.length, 0)
  })

  it('should catch RERA number hallucinations', async () => {
    const systemPrompt = `
    Verified facts: {
      "projects": [
        { "name": "Test Project", "rera_number": "UPRERAPRJ100" }
      ]
    }
    `
    const response = 'Check UPRERAPRJ999 for details.'
    const result = await validateAgainstFacts(response, systemPrompt)
    assert(result.violations.some((v) => v.type === 'upreraprj_hallucination'))
    assert.equal(result.blocked, true)
  })

  it('should catch sector fabrications', async () => {
    const systemPrompt = `
    Verified facts: {
      "projects": [
        { "name": "Project A", "sector": "Sector 150" }
      ]
    }
    `
    const response = 'Located in Sector 200, near metro.'
    const result = await validateAgainstFacts(response, systemPrompt)
    assert(result.violations.some((v) => v.type === 'sector_fabrication'))
    assert.equal(result.blocked, true)
  })
})
