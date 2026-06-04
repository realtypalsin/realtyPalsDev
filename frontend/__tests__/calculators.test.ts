import { calculateEmi, calculateStampDuty, calculateGst, formatInr } from '../lib/calculators'

describe('calculateEmi', () => {
  it('computes correct EMI for 1Cr at 8.5% for 20 years', () => {
    const r = calculateEmi(1, 8.5, 20)
    expect(r.emi_monthly).toBeGreaterThan(85000)
    expect(r.emi_monthly).toBeLessThan(88000)
    expect(r.tenure_months).toBe(240)
    expect(r.principal).toBe(10000000)
  })

  it('total_payment = principal + interest', () => {
    const r = calculateEmi(2, 9, 25)
    expect(r.total_interest).toBeGreaterThan(0)
    expect(r.total_payment).toBe(r.principal + r.total_interest)
  })

  it('handles 0% rate — no interest charged', () => {
    const r = calculateEmi(1, 0, 10)
    expect(r.emi_monthly).toBe(Math.round(1e7 / 120))
    expect(r.total_interest).toBe(0)
  })
})

describe('calculateStampDuty', () => {
  it('applies 7% stamp duty for male buyer', () => {
    const r = calculateStampDuty(2, 'male')
    expect(r.stamp_duty).toBe(1400000)
    expect(r.registration).toBe(200000)
    expect(r.total_charges).toBe(1600000)
  })

  it('applies 6% stamp duty for female buyer', () => {
    const r = calculateStampDuty(2, 'female')
    expect(r.stamp_duty).toBe(1200000)
  })

  it('applies 6.5% for joint buyer', () => {
    const r = calculateStampDuty(2, 'joint')
    expect(r.stamp_duty).toBe(1300000)
  })

  it('defaults to male if gender omitted', () => {
    const r = calculateStampDuty(1)
    expect(r.stamp_duty_rate).toBe(7)
  })
})

describe('calculateGst', () => {
  it('returns 0% GST for ready_to_move', () => {
    const r = calculateGst(3, 'ready_to_move')
    expect(r.gst_rate).toBe(0)
    expect(r.gst_amount).toBe(0)
    expect(r.category).toBe('ready_to_move')
  })

  it('returns 1% for affordable under-construction (≤45L + ≤90sqm)', () => {
    const r = calculateGst(0.4, 'under_construction', 85)
    expect(r.gst_rate).toBe(1)
    expect(r.category).toBe('affordable')
  })

  it('returns 5% for standard under-construction (>45L)', () => {
    const r = calculateGst(2, 'under_construction', 120)
    expect(r.gst_rate).toBe(5)
    expect(r.category).toBe('standard')
  })

  it('returns 5% when carpet area missing (>0 check)', () => {
    const r = calculateGst(0.4, 'under_construction', 0)
    expect(r.gst_rate).toBe(5)
  })
})

describe('formatInr', () => {
  it('formats crores', () => {
    expect(formatInr(10000000)).toBe('₹1.00 Cr')
    expect(formatInr(25000000)).toBe('₹2.50 Cr')
  })

  it('formats lakhs', () => {
    expect(formatInr(500000)).toBe('₹5.00 L')
  })

  it('formats small amounts', () => {
    expect(formatInr(50000)).toContain('₹')
  })
})
