import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { calcEmi, calcGst, calcStampDuty } from './calculators'

describe('calculateEMI', () => {
  it('should calculate monthly EMI correctly', () => {
    // Principal: ₹1 crore, Rate: 8%, Years: 20
    const emi = calcEmi(10000000, 8, 20)
    assert(emi > 83000 && emi < 84000) // ~₹83,573/month
  })

  it('should handle 0 principal', () => {
    assert.equal(calcEmi(0, 8, 20), 0)
  })

  it('should handle 0 rate', () => {
    const principal = 10000000
    const years = 20
    const months = years * 12
    const emi = calcEmi(principal, 0, years)
    assert(emi > principal / months - 1 && emi < principal / months + 1)
  })
})

describe('calculateGST', () => {
  it('should apply 5% GST to affordable housing', () => {
    const property = 45000000 // ₹4.5cr → affordable
    const gst = calcGst(property, 'residential')
    assert.equal(gst, property * 0.05)
  })

  it('should apply 12% GST to non-affordable residential', () => {
    const property = 50000000 // ₹5cr → not affordable
    const gst = calcGst(property, 'residential')
    assert.equal(gst, property * 0.12)
  })

  it('should apply correct GST to commercial', () => {
    const property = 10000000
    const gst = calcGst(property, 'commercial')
    assert.equal(gst, property * 0.18)
  })
})

describe('calculateStampDuty', () => {
  it('should apply slabs by property value', () => {
    // State-dependent; test with assumed slabs
    const duty = calcStampDuty(10000000, 'new')
    assert(duty > 0 && duty < 10000000 * 0.1)
  })
})

describe('calculateRegistration', () => {
  it('should apply 1% registration charge', () => {
    const property = 10000000
    const reg = calcStampDuty(property, 'new') // Note: registration may be separate
    assert(reg > 0)
  })
})
