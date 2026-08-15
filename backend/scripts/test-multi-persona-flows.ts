// backend/scripts/test-multi-persona-flows.ts
import { classifyIntent } from '../src/lib/ai/intentClassifier'
import { computeConversationState } from '../src/lib/discovery/conversationEngine'
import { getCityMicroMarkets, buildCityMicroMarketsContext } from '../src/lib/discovery/sectorDataGateway'
import type { Intent } from '../src/lib/discovery/types'

async function runTests() {
  console.log('=================================================================')
  console.log('🧪 RUNNING REAL ESTATE ADVISORY MULTI-PERSONA CONVERSATION TESTS')
  console.log('=================================================================\n')

  // ─── TEST 1: Relocator to Noida ─────────────────────────────────────────────
  console.log('▶ TEST 1: Relocator Query')
  const q1 = "I am moving to Noida. I am looking to purchase a flat in Noida. Tell me some good areas in Noida, just like someone who is relocating."
  const c1 = classifyIntent(q1)
  console.log('Classification Result:', c1)
  if (c1.category === 'project_detail') {
    throw new Error('❌ TEST 1 FAILED: Relocator query was falsely classified as project_detail!')
  }
  console.log('✅ TEST 1 Passed: Query was NOT hijacked as project_detail.')

  const intent1: Intent = { journeyStage: 'relocation' }
  const state1 = await computeConversationState(
    intent1,
    'COLD',
    [],
    false,
    [{ role: 'user', content: q1 }],
    undefined,
    undefined,
    undefined,
    null,
    true
  )
  console.log('Generated Chips for Relocator:', state1.chips.map(c => c.label))
  const hasCorridorChips = state1.chips.some(c => c.label.includes('Expressway') || c.label.includes('Central'))
  if (!hasCorridorChips) {
    throw new Error('❌ TEST 1 FAILED: Relocator did not receive corridor/lifestyle chips!')
  }
  console.log('✅ TEST 1 Passed: Relocator received rich corridor & commute chips.\n')

  // ─── TEST 2: Yield-Focused Investor ─────────────────────────────────────────
  console.log('▶ TEST 2: Yield-Focused Investor Query')
  const q2 = "I have some liquidity and want to invest in Noida for rental income and high ROI."
  const intent2: Intent = { journeyStage: 'yield_investor', purpose: 'investment' }
  const state2 = await computeConversationState(
    intent2,
    'COLD',
    [],
    false,
    [{ role: 'user', content: q2 }],
    undefined,
    undefined,
    undefined,
    null,
    true
  )
  console.log('Generated Chips for Investor:', state2.chips.map(c => c.label))
  const hasYieldChips = state2.chips.some(c => c.label.includes('Commercial') || c.label.includes('Jewar') || c.label.includes('ROI'))
  if (!hasYieldChips) {
    throw new Error('❌ TEST 2 FAILED: Investor did not receive yield/commercial chips!')
  }
  console.log('✅ TEST 2 Passed: Investor received yield & macro-catalyst chips.\n')

  // ─── TEST 3: Overseas NRI Buyer ─────────────────────────────────────────────
  console.log('▶ TEST 3: Overseas NRI Security Query')
  const q3 = "I am based in Dubai and looking to buy in Sector 79. How do I know my money is safe?"
  const intent3: Intent = { riskProfile: 'nri', journeyStage: 'nri_investor', sector: 'Sector 79' }
  const state3 = await computeConversationState(
    intent3,
    'COLD',
    [],
    false,
    [{ role: 'user', content: q3 }],
    undefined,
    undefined,
    undefined,
    null,
    true
  )
  console.log('Generated Chips for NRI:', state3.chips.map(c => c.label))
  const hasNriChips = state3.chips.some(c => c.label.includes('Form-7') || c.label.includes('Tripartite') || c.label.includes('SPA'))
  if (!hasNriChips) {
    throw new Error('❌ TEST 3 FAILED: NRI did not receive Form-7/Tripartite chips!')
  }
  console.log('✅ TEST 3 Passed: NRI received Form-7 escrow & Tripartite agreement chips.\n')

  // ─── TEST 4: Market Evaluator ───────────────────────────────────────────────
  console.log('▶ TEST 4: Market Evaluator / Sector Comparison Query')
  const q4 = "Why is Sector 75 so much more expensive than Sector 76 when they are right next to each other?"
  const c4 = classifyIntent(q4)
  console.log('Classification Result for Sec 75 vs 76:', c4)
  if (c4.category === 'project_detail') {
    throw new Error('❌ TEST 4 FAILED: Sector comparison was hijacked as project_detail!')
  }
  const intent4: Intent = { journeyStage: 'market_evaluator' }
  const state4 = await computeConversationState(
    intent4,
    'COLD',
    [],
    false,
    [{ role: 'user', content: q4 }],
    undefined,
    undefined,
    undefined,
    null,
    true
  )
  console.log('Generated Chips for Market Evaluator:', state4.chips.map(c => c.label))
  const hasMarketChips = state4.chips.some(c => c.label.includes('Delta') || c.label.includes('Carpet') || c.label.includes('Circle Rate'))
  if (!hasMarketChips) {
    throw new Error('❌ TEST 4 FAILED: Market Evaluator did not receive valuation chips!')
  }
  console.log('✅ TEST 4 Passed: Market evaluator received price delta & circle rate chips.\n')

  // ─── TEST 5: Database Micro-Markets Context Retrieval ───────────────────────
  console.log('▶ TEST 5: Database Micro-Markets Aggregation')
  const microMarkets = await getCityMicroMarkets('Noida')
  console.log(`Found ${microMarkets.length} micro-markets in database:`, microMarkets.map(m => m.microMarket))
  if (microMarkets.length === 0) {
    throw new Error('❌ TEST 5 FAILED: No micro-markets found in database!')
  }
  const contextBlock = await buildCityMicroMarketsContext('Noida')
  console.log('\nSample Injected Micro-Market Context:\n', contextBlock.substring(0, 400) + '...\n')
  console.log('✅ TEST 5 Passed: Dynamic database micro-market context generated successfully.\n')

  console.log('🎉 ALL MULTI-PERSONA REAL ESTATE ADVISORY TESTS PASSED!')
}

runTests()
  .catch(e => {
    console.error('❌ TEST FAILED:', e)
    process.exit(1)
  })
