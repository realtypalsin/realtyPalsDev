// backend/src/lib/calculators.ts

export function formatInr(amount: number): string {
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2)} Cr`
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(2)} L`
  return `₹${amount.toLocaleString('en-IN')}`
}

export function calcEmi(
  principalCr: number,
  annualRatePct: number,
  tenureYears: number
): { emi: number; totalPayment: number; totalInterest: number } {
  const P = principalCr * 1_00_00_000
  const r = annualRatePct / 1200
  const n = tenureYears * 12
  if (r === 0) return { emi: P / n, totalPayment: P, totalInterest: 0 }
  const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
  const totalPayment = emi * n
  return { emi, totalPayment, totalInterest: totalPayment - P }
}

export function calcStampDuty(
  priceCr: number,
  gender: 'male' | 'female' | 'joint' = 'male'
): { stampDuty: number; registration: number; total: number; rate: number } {
  const price = priceCr * 1_00_00_000
  const rate = gender === 'female' ? 6 : 7   // UP rates
  const stampDuty = (price * rate) / 100
  const registration = price * 0.01
  return { stampDuty, registration, total: stampDuty + registration, rate }
}

export function calcGst(
  priceCr: number,
  status: 'under_construction' | 'ready_to_move',
  carpetSqm = 0
): { gst: number; rate: number; category: string } {
  if (status === 'ready_to_move') return { gst: 0, rate: 0, category: 'OC received — no GST' }
  const price = priceCr * 1_00_00_000
  const isAffordable = priceCr < 0.45 && carpetSqm > 0 && carpetSqm <= 60
  const rate = isAffordable ? 1 : 5
  return { gst: (price * rate) / 100, rate, category: isAffordable ? 'affordable_housing' : 'standard' }
}
