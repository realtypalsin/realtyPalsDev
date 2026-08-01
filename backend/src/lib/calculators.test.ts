import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { calcEmi, calcGst, calcStampDuty } from './calculators'

describe('calculateEMI', () => {
  it('should calculate monthly EMI correctly', () => {
    // Principal: ₹1 crore, Rate: 8%, Years: 20
    const { emi } = calcEmi(1.0, 8, 20)
    assert(emi > 83000 && emi < 84000) // ~₹83,573/month
  })

  it('should handle 0 principal', () => {
    assert.equal(calcEmi(0, 8, 20).emi, 0)
  })

  it('should handle 0 rate', () => {
    const principalCr = 1.0
    const years = 20
    const months = years * 12
    const { emi } = calcEmi(principalCr, 0, years)
    const monthlyPrincipal = (principalCr * 1_00_00_000) / months
    assert(emi > monthlyPrincipal - 1 && emi < monthlyPrincipal + 1)
  })
})

describe('calculateGST', () => {
  it('should apply 5% GST to under construction housing', () => {
    const propertyCr = 1.0
    const { gst, rate } = calcGst(propertyCr, 'under_construction')
    assert.equal(rate, 5)
    assert.equal(gst, propertyCr * 1_00_00_000 * 0.05)
  })

  it('should apply 0% GST to ready to move residential', () => {
    const propertyCr = 1.0
    const { gst, rate } = calcGst(propertyCr, 'ready_to_move')
    assert.equal(rate, 0)
    assert.equal(gst, 0)
  })
})

describe('calculateStampDuty', () => {
  it('should apply slabs by property value', () => {
    const { stampDuty } = calcStampDuty(1.0, 'male')
    assert(stampDuty > 0 && stampDuty < 10000000 * 0.1)
  })
})

describe('calculateRegistration', () => {
  it('should apply 1% registration charge', () => {
    const { registration } = calcStampDuty(1.0, 'male')
    assert(registration > 0)
  })
})
