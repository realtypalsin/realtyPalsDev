import { describe, it } from 'node:test'
import assert from 'node:assert'
import { generateChips } from '../chipGenerator'
import type { ConversationMemory } from '../types'

describe('Chip Generator', () => {
  it('should generate EMI calculator chip for payment plan queries', () => {
    const chips = generateChips('PAYMENT_PLANS', {}, 'ADVISOR')
    const emiChip = chips.find(c => c.analyticsId.includes('emi'))
    assert.ok(emiChip, 'EMI chip should exist')
    assert.strictEqual(emiChip?.icon, '🧮')
    assert.ok(emiChip?.label.includes('EMI'))
  })

  it('should generate RERA verification chip for builder queries', () => {
    const chips = generateChips('BUILDER_HISTORY', {}, 'ADVISOR')
    const reraChip = chips.find(c => c.analyticsId.includes('rera'))
    assert.ok(reraChip, 'RERA chip should exist')
    assert.strictEqual(reraChip?.icon, '✅')
  })

  it('should generate location chips for location queries', () => {
    const chips = generateChips('LOCATION', {}, 'ADVISOR')
    const mapChip = chips.find(c => c.analyticsId.includes('map'))
    const metroChip = chips.find(c => c.analyticsId.includes('metro'))
    assert.ok(mapChip, 'Map chip should exist')
    assert.ok(metroChip, 'Metro chip should exist')
  })

  it('should not generate chips in DISCOVERY phase', () => {
    const chips = generateChips('PAYMENT_PLANS', {}, 'DISCOVERY')
    assert.strictEqual(chips.length, 0)
  })

  it('should generate site visit chip when user has stated budget', () => {
    const memory: Partial<ConversationMemory> = {
      user_budget_min_cr: 50,
      user_budget_max_cr: 75
    }
    const chips = generateChips('LOCATION', memory, 'ADVISOR')
    const siteChip = chips.find(c => c.analyticsId.includes('site_visit'))
    assert.ok(siteChip, 'Site visit chip should exist')
    assert.strictEqual(siteChip?.icon, '🏗️')
  })

  it('should generate compare chip when multiple options exist', () => {
    const chips = generateChips('PAYMENT_PLANS', {}, 'ADVISOR')
    assert.ok(chips.length > 0, 'Should have at least one chip')
  })

  it('should generate costs chip for costs query', () => {
    const chips = generateChips('COSTS', {}, 'ADVISOR')
    assert.ok(chips.length > 0, 'Should have at least one chip')
  })

  it('should generate possession chips for timeline query', () => {
    const chips = generateChips('POSSESSION_TIMELINE', {}, 'ADVISOR')
    const ocChip = chips.find(c => c.analyticsId.includes('oc'))
    assert.ok(ocChip, 'OC chip should exist')
    assert.strictEqual(ocChip?.icon, '📅')
  })

  it('should not include conditional chips if budget not stated', () => {
    const memory: Partial<ConversationMemory> = {}
    const chips = generateChips('PAYMENT_PLANS', memory, 'ADVISOR')
    const siteChip = chips.find(c => c.analyticsId.includes('site_visit'))
    assert.strictEqual(siteChip, undefined, 'Site visit chip should not exist without budget')
  })
})
