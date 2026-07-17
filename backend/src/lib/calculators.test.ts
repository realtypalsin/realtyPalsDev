import { describe, it, expect } from 'node:test'
import { calculateEMI, calculateGST, calculateStampDuty, calculateRegistration } from './calculators'

describe('calculateEMI', () => {
  it('should calculate monthly EMI correctly', () => {
    // Principal: ₹1 crore, Rate: 8%, Years: 20
    const emi = calculateEMI(10000000, 8, 20)
    expect(emi).toBeCloseTo(83573, -1) // ~₹83,573/month
  })

  it('should handle 0 principal', () => {
    expect(calculateEMI(0, 8, 20)).toBe(0)
  })

  it('should handle 0 rate', () => {
    const principal = 10000000
    const years = 20
    const months = years * 12
    const emi = calculateEMI(principal, 0, years)
    expect(emi).toBeCloseTo(principal / months, -2)
  })
})

describe('calculateGST', () => {
  it('should apply 5% GST to affordable housing', () => {
    const property = 45000000 // ₹4.5cr → affordable
    const gst = calculateGST(property, 'residential')
    expect(gst).toBe(property * 0.05)
  })

  it('should apply 12% GST to non-affordable residential', () => {
    const property = 50000000 // ₹5cr → not affordable
    const gst = calculateGST(property, 'residential')
    expect(gst).toBe(property * 0.12)
  })

  it('should apply correct GST to commercial', () => {
    const property = 10000000
    const gst = calculateGST(property, 'commercial')
    expect(gst).toBe(property * 0.18)
  })
})

describe('calculateStampDuty', () => {
  it('should apply slabs by property value', () => {
    // State-dependent; test with assumed slabs
    const duty = calculateStampDuty(10000000, 'new')
    expect(duty).toBeGreaterThan(0)
    expect(duty).toBeLessThan(10000000 * 0.1)
  })
})

describe('calculateRegistration', () => {
  it('should apply 1% registration charge', () => {
    const property = 10000000
    const reg = calculateRegistration(property)
    expect(reg).toBe(property * 0.01)
  })
})
