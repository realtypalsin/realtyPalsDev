// backend/scripts/test-dynamic-chips.ts
import { computeConversationState } from '../src/lib/discovery/conversationEngine'
import type { Intent } from '../src/lib/discovery/types'

async function runChipTests() {
  console.log('=================================================================')
  console.log('🎯 TESTING DYNAMIC CONTEXT-AWARE CHIP GENERATION & ADAPTATION')
  console.log('=================================================================\n')

  // Case 1: Broad Relocator (No sector selected yet)
  console.log('Case 1: Broad Relocator ("I am moving to Noida...")')
  const intent1: Intent = { journeyStage: 'relocation' }
  const state1 = await computeConversationState(intent1, 'COLD', [], false, [{ role: 'user', content: 'I am moving to Noida' }], undefined, undefined, undefined, null, true)
  console.log('Chips:', state1.chips.map(c => c.label))
  if (!state1.chips.some(c => c.label.includes('Expressway'))) throw new Error('Failed Case 1')
  console.log('✅ Case 1 Passed: Corridor orientation chips generated.\n')

  // Case 2: Relocator mentions a specific sector ("I want to relocate to Sector 76")
  console.log('Case 2: Specific Sector ("I want to relocate to Sector 76")')
  const intent2: Intent = { journeyStage: 'relocation', sector: 'Sector 76' }
  const state2 = await computeConversationState(intent2, 'COLD', [], false, [{ role: 'user', content: 'I want to relocate to Sector 76' }], undefined, undefined, undefined, null, true)
  console.log('Chips:', state2.chips.map(c => c.label))
  if (!state2.chips.some(c => c.label.includes('in Sector 76'))) throw new Error('Failed Case 2')
  console.log('✅ Case 2 Passed: Sector-specific BHK configuration chips generated.\n')

  // Case 3: Sector + BHK specified ("Looking for a 3 BHK in Sector 76")
  console.log('Case 3: Sector + BHK ("Looking for a 3 BHK in Sector 76")')
  const intent3: Intent = { sector: 'Sector 76', bhk: [3] }
  const state3 = await computeConversationState(intent3, 'COLD', [], false, [{ role: 'user', content: 'Looking for a 3 BHK in Sector 76' }], undefined, undefined, undefined, null, true)
  console.log('Chips:', state3.chips.map(c => c.label))
  if (!state3.chips.some(c => c.label.includes('Cr') || c.label.includes('Pros & Cons'))) throw new Error('Failed Case 3')
  console.log('✅ Case 3 Passed: Realistic budget brackets and pros/cons chips generated.\n')

  // Case 4: Yield Investor
  console.log('Case 4: Yield Investor ("I want high rental yield")')
  const intent4: Intent = { journeyStage: 'yield_investor' }
  const state4 = await computeConversationState(intent4, 'COLD', [], false, [{ role: 'user', content: 'I want high rental yield' }], undefined, undefined, undefined, null, true)
  console.log('Chips:', state4.chips.map(c => c.label))
  if (!state4.chips.some(c => c.label.includes('Commercial Retail'))) throw new Error('Failed Case 4')
  console.log('✅ Case 4 Passed: Commercial yield & ROI chips generated.\n')

  // Case 5: NRI Buyer
  console.log('Case 5: NRI Buyer ("I live in Dubai and want safe projects")')
  const intent5: Intent = { journeyStage: 'nri_investor', riskProfile: 'nri' }
  const state5 = await computeConversationState(intent5, 'COLD', [], false, [{ role: 'user', content: 'I live in Dubai and want safe projects' }], undefined, undefined, undefined, null, true)
  console.log('Chips:', state5.chips.map(c => c.label))
  if (!state5.chips.some(c => c.label.includes('Form-7'))) throw new Error('Failed Case 5')
  console.log('✅ Case 5 Passed: Form-7 escrow and Tripartite agreement chips generated.\n')

  console.log('🎉 ALL DYNAMIC CHIP ADAPTATION TESTS PASSED!')
}

runChipTests().catch(e => {
  console.error('❌ CHIP TEST FAILED:', e)
  process.exit(1)
})
