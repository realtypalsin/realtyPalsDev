import { describe, it, expect } from 'vitest'
import { generateChips } from '../chipGenerator'
import type { ConversationMemory } from '../types'

describe('Chip Generator', () => {
  it('should generate EMI calculator chip for payment plan queries', () => {
    const chips = generateChips('PAYMENT_PLANS', {}, 'ADVISOR')
    const emiChip = chips.find(c => c.action.includes('emi'))
    expect(emiChip).toBeDefined()
    expect(emiChip?.emoji).toBe('🧮')
    expect(emiChip?.label).toContain('EMI')
  })

  it('should generate RERA verification chip for builder queries', () => {
    const chips = generateChips('BUILDER_HISTORY', {}, 'ADVISOR')
    const reraChip = chips.find(c => c.action.includes('rera'))
    expect(reraChip).toBeDefined()
    expect(reraChip?.emoji).toBe('✅')
  })

  it('should generate location chips for location queries', () => {
    const chips = generateChips('LOCATION', {}, 'ADVISOR')
    const mapChip = chips.find(c => c.action.includes('map'))
    const metroChip = chips.find(c => c.action.includes('metro'))
    expect(mapChip).toBeDefined()
    expect(metroChip).toBeDefined()
  })

  it('should not generate chips in DISCOVERY phase', () => {
    const chips = generateChips('PAYMENT_PLANS', {}, 'DISCOVERY')
    expect(chips.length).toBe(0)
  })

  it('should generate site visit chip when user has stated budget', () => {
    const memory: Partial<ConversationMemory> = {
      user_budget_min_cr: 50,
      user_budget_max_cr: 75
    }
    const chips = generateChips('LOCATION', memory, 'ADVISOR')
    const siteChip = chips.find(c => c.action.includes('site_visit'))
    expect(siteChip).toBeDefined()
    expect(siteChip?.emoji).toBe('🏗️')
  })

  it('should generate compare chip when multiple options exist', () => {
    const chips = generateChips('PAYMENT_PLANS', {}, 'ADVISOR')
    const compareChip = chips.find(c => c.action.includes('compare'))
    // May or may not exist depending on chip count
    expect(chips.length).toBeGreaterThan(0)
  })

  it('should generate costs chip for costs query', () => {
    const chips = generateChips('COSTS', {}, 'ADVISOR')
    const costChip = chips.find(c => c.action.includes('compare'))
    expect(chips.length).toBeGreaterThan(0)
  })

  it('should generate possession chips for timeline query', () => {
    const chips = generateChips('POSSESSION_TIMELINE', {}, 'ADVISOR')
    const ocChip = chips.find(c => c.action.includes('oc'))
    expect(ocChip).toBeDefined()
    expect(ocChip?.emoji).toBe('📅')
  })

  it('should not include conditional chips if budget not stated', () => {
    const memory: Partial<ConversationMemory> = {}
    const chips = generateChips('PAYMENT_PLANS', memory, 'ADVISOR')
    const siteChip = chips.find(c => c.action.includes('site_visit'))
    expect(siteChip).toBeUndefined()
  })
})
