import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { validateAgainstFacts, validateAgainstFactsSync } from './guardrails-v2'

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

  it('should synchronously validate against facts with validateAgainstFactsSync', () => {
    const systemPrompt = `
    Verified facts: {
      "projects": [
        { "name": "Godrej Palm Retreat", "sector": "Sector 150", "price_min_cr": 1.2, "price_max_cr": 2.5, "rera_number": "UPRERAPRJ123" }
      ]
    }
    `
    const validResponse = 'Godrej Palm Retreat in Sector 150 is priced at ₹1.8 Cr with RERA UPRERAPRJ123.'
    const result = validateAgainstFactsSync(validResponse, systemPrompt)
    assert.equal(result.violations.length, 0)
    assert.equal(result.blocked, false)
  })

  it('should catch fabricated project names with validateAgainstFactsSync', () => {
    const systemPrompt = `
    Verified facts: {
      "projects": [
        { "name": "Godrej Palm Retreat" }
      ]
    }
    `
    const response = 'I recommend the project Lodha Metropolis Residences in Sector 75.'
    const result = validateAgainstFactsSync(response, systemPrompt)
    assert(result.violations.some((v) => v.type === 'name_fabrication'))
  })

  it('should catch fabricated prices outside known ranges with validateAgainstFactsSync', () => {
    const systemPrompt = `
    Verified facts: {
      "projects": [
        { "name": "Project A", "price_min_cr": 1.5, "price_max_cr": 2.0 }
      ]
    }
    `
    const response = 'The price is only ₹5.5 Crore.'
    const result = validateAgainstFactsSync(response, systemPrompt)
    assert(result.violations.some((v) => v.type === 'price_fabrication'))
  })

  it('should handle missing systemPrompt gracefully in sync mode', () => {
    const result = validateAgainstFactsSync('any response', undefined)
    assert.equal(result.blocked, false)
    assert.equal(result.violations.length, 0)
  })

  it('should catch RERA number hallucinations in sync mode', () => {
    const systemPrompt = `
    Verified facts: {
      "projects": [
        { "name": "Test Project", "rera_number": "UPRERAPRJ100" }
      ]
    }
    `
    const response = 'Check UPRERAPRJ999 for details.'
    const result = validateAgainstFactsSync(response, systemPrompt)
    assert(result.violations.some((v) => v.type === 'upreraprj_hallucination'))
  })

  it('should catch sector fabrications in sync mode', () => {
    const systemPrompt = `
    Verified facts: {
      "projects": [
        { "name": "Project A", "sector": "Sector 150" }
      ]
    }
    `
    const response = 'Located in Sector 200.'
    const result = validateAgainstFactsSync(response, systemPrompt)
    assert(result.violations.some((v) => v.type === 'sector_fabrication'))
  })

  it('should exempt responses with Market Advisory Note from fact blocking', () => {
    const systemPrompt = `Verified facts: { "projects": [] }`
    const advisoryResponse = `
    Near Al Shifa Hospital, average residential plot rates range from ₹40,000 to ₹75,000 per sq. yard.
    For 2 plots (approx 200 sq yards each) and 4 builder floors (approx 1,200 sq ft each), the total portfolio is estimated around ₹3.2 Cr to ₹4.8 Cr.

    > ⚠️ **Market Advisory Note**: *This estimate is based on general market indicators and third-party trends, not verified RERA database records for this micro-market. Actual property value varies based on exact plot dimensions, title/registry status, road width, and construction age.*
    `
    const result = validateAgainstFactsSync(advisoryResponse, systemPrompt)
    assert.equal(result.violations.length, 0)
    assert.equal(result.blocked, false)
  })

  it('should ignore budget ceilings and context phrases from price checks', () => {
    const systemPrompt = `
    Verified facts: {
      "projects": [
        { "name": "Project A", "price_min_cr": 1.0, "price_max_cr": 1.8 }
      ]
    }
    `
    const response = 'For a budget of ₹3 Cr, Project A is available at ₹1.5 Cr.'
    const result = validateAgainstFactsSync(response, systemPrompt)
    assert.equal(result.violations.filter(v => v.type === 'price_fabrication').length, 0)
  })
})
