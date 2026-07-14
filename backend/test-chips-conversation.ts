import { computeConversationState } from './src/lib/discovery/conversationEngine'
import type { Intent, ScoredProject } from './src/lib/discovery/types'
import type { ChipInventory } from './src/lib/discovery/chipInventory'
import { generateDynamicChips } from './src/lib/db/chipProvider'
import { prisma } from './src/lib/db'

async function runTest() {
  console.log('Testing Chip Repetition and Conversational flow...')
  
  // Fake results and history
  const mockProjects: ScoredProject[] = [
    {
      id: '349b6868-bc2b-46d2-ab91-97c11c3ad1c8', // 3C Lotus 300
      slug: '3c-lotus-300-sector-107-noida',
      name: '3C Lotus 300',
      sector: 'Sector 107',
      city: 'Noida',
      builder: { name: 'The 3C Group', slug: '3c-group' },
      status: 'ready_to_move',
      price_range_label: '₹3.11–5.70 Cr',
      unit_types: [],
      top_amenities: [],
      top_connectivity: [],
      images: [],
      possession_date: null,
      marketing_claims: [],
      matchScore: 95,
      matchReason: 'Budget + BHK match',
      matchReasons: ['3 BHK', 'Under ₹2Cr'],
      concerns: [],
    }
  ]

  let chatHistory: any[] = []
  const seenChips = new Set<string>()
  let lastUserQuestion = "What is the price?"

  // Simulate 10 turns
  for (let i = 0; i < 10; i++) {
    chatHistory.push({ role: 'user', content: lastUserQuestion })
    
    // Assistant replies to the user's last question
    let assistantReply = "Here is the information you requested."
    if (lastUserQuestion.toLowerCase().includes("price")) assistantReply = "The price ranges from 1.5 Cr to 3 Cr depending on the unit size."
    else if (lastUserQuestion.toLowerCase().includes("amenities")) assistantReply = "It has a swimming pool, clubhouse, and a large gym."
    else if (lastUserQuestion.toLowerCase().includes("rera")) assistantReply = "Yes, it is fully RERA registered. The registration number is UPRERAPRJ1234."
    else if (lastUserQuestion.toLowerCase().includes("payment")) assistantReply = "The payment plan is construction-linked. You pay 10% on booking."
    else if (lastUserQuestion.toLowerCase().includes("possession")) assistantReply = "The expected possession date is December 2026."
    else if (lastUserQuestion.toLowerCase().includes("floor")) assistantReply = "There are 3BHK and 4BHK layouts. I can show you the specific plans."
    
    chatHistory.push({ role: 'assistant', content: assistantReply })
    
    const chips = await generateDynamicChips('research', mockProjects, chatHistory)
    console.log(`\nTurn ${i} Chips (After answering: "${lastUserQuestion}"):`)
    let repeats = 0
    chips.forEach(c => {
      console.log(`  - ${c.label}`)
      if (seenChips.has(c.label)) {
        repeats++
      }
      seenChips.add(c.label)
    })
    
    if (repeats > 0) {
      console.log(`  ⚠️ FOUND ${repeats} REPEATED CHIPS IN THIS TURN!`)
    }
    
    // Simulate user clicking the first chip
    if (chips.length > 0) {
       lastUserQuestion = chips[0].label
    } else {
       lastUserQuestion = `Generic follow-up`
    }
  }
}

runTest()
