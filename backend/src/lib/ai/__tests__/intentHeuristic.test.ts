import { extractIntentHeuristic } from '../intent'
import type { Intent } from '../../discovery'

describe('Intent Heuristic Extraction', () => {
  const baseIntent: Intent = {}

  it('extracts BHK from message', () => {
    const result = extractIntentHeuristic('Looking for 3 BHK', baseIntent)
    expect(result.bhk).toEqual([3])
  })

  it('extracts budget in crore', () => {
    const result = extractIntentHeuristic('under 2 crore', baseIntent)
    expect(result.budgetMax).toBe(2)
  })

  it('extracts budget in lakh and converts to crore', () => {
    const result = extractIntentHeuristic('150 lakh budget', baseIntent)
    expect(result.budgetMax).toBe(1.5)
  })

  it('extracts sector', () => {
    const result = extractIntentHeuristic('in Sector 150', baseIntent)
    expect(result.sector).toContain('150')
  })

  it('extracts immediate possession', () => {
    const result = extractIntentHeuristic('ready to move', baseIntent)
    expect(result.possession).toBe('immediate')
  })

  it('extracts 1 year possession', () => {
    const result = extractIntentHeuristic('within 1 year', baseIntent)
    expect(result.possession).toBe('1year')
  })

  it('extracts investment purpose', () => {
    const result = extractIntentHeuristic('for investment returns', baseIntent)
    expect(result.purpose).toBe('investment')
  })

  it('extracts end-use purpose', () => {
    const result = extractIntentHeuristic('to live in', baseIntent)
    expect(result.purpose).toBe('endUse')
  })

  it('extracts area range', () => {
    const result = extractIntentHeuristic('1000 to 1200 sqft', baseIntent)
    expect(result.areaMin).toBe(1000)
    expect(result.areaMax).toBe(1200)
  })

  it('returns previous intent if no matches', () => {
    const prev = { bhk: [2] }
    const result = extractIntentHeuristic('random text', prev as Intent)
    expect(result.bhk).toEqual([2])
  })

  it('handles multiple signals', () => {
    const result = extractIntentHeuristic('3 BHK under 2 crore in Sector 150 ready to move', baseIntent)
    expect(result.bhk).toEqual([3])
    expect(result.budgetMax).toBe(2)
    expect(result.possession).toBe('immediate')
  })

  it('is case-insensitive', () => {
    const result1 = extractIntentHeuristic('3 bhk', baseIntent)
    const result2 = extractIntentHeuristic('3 BHK', baseIntent)
    expect(result1.bhk).toEqual(result2.bhk)
  })
})
