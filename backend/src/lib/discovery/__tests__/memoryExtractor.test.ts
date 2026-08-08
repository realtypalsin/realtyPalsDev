import { describe, it, expect } from 'vitest'
import { extractBudget, extractTimeline, extractPainPoints } from '../memoryExtractor'

describe('Memory Extraction', () => {
  it('should extract budget range from "My budget is 50-75 crore"', () => {
    const result = extractBudget('My budget is 50-75 crore')
    expect(result).toEqual({ min: 50, max: 75 })
  })

  it('should extract timeline from "I have a 5-year horizon"', () => {
    const result = extractTimeline('I have a 5-year horizon')
    expect(result).toBe('5 years')
  })

  it('should extract pain points from "I want flexibility and am concerned about delays"', () => {
    const result = extractPainPoints('I want flexibility and am concerned about delays')
    expect(result).toContain('want flexibility')
    expect(result).toContain('concerned about delays')
  })
})
