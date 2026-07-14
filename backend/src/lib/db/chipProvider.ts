import { prisma } from '../db'
import { ScoredProject } from '../discovery/types'
import { ChipAction, chip } from '../discovery/conversationEngine'

/**
 * Generate a set of chips based on the requested mode and the project data.
 * Mode can be: 'research' | 'compare' | 'decide'
 */
export async function generateDynamicChips(
  mode: 'research' | 'compare' | 'decide',
  results: ScoredProject[],
  chatHistory: any[]
): Promise<ChipAction[]> {
  const coreChips: ChipAction[] = []
  
  if (!results || results.length === 0) {
    // Fallback static chips if no results
    return [
      chip('general_advice', 'TEXT_MESSAGE', 'Buying guide', '', { text: 'What should I look for before buying a property in Noida?' }, 1),
      chip('popular_areas', 'TEXT_MESSAGE', 'Popular areas', '', { text: 'Show me the most popular areas to invest in.' }, 2)
    ]
  }

  const projectsList = results.slice(0, 4).map(r => ({ id: r.id, name: r.name }))
  const topProject = results[0]

  // Compare Mode: Add comparison chip if there are multiple results
  if (mode === 'compare' && results.length >= 2) {
    const topNames = results.slice(0, 2).map(r => r.name).join(' and ') || 'these properties'
    coreChips.push(
      chip('final_compare', 'COMPARE_PROPERTIES', 'Final comparison', '', { mode: 'multi' }, 0),
      chip('legal_compare', 'TEXT_MESSAGE', 'Compare Legal', '', { text: `How do ${topNames} compare in terms of RERA standing and legal safety?` }, 1)
    )
  }

  const project = await prisma.project.findUnique({
    where: { id: topProject.id },
    include: { builder: true }
  })

  if (!project) {
    if (coreChips.length === 0) {
      coreChips.push(chip('tell_more', 'TEXT_MESSAGE', 'Tell me more', '', { actionPrefix: 'Tell me more about', projects: projectsList }, 1))
    }
    return coreChips
  }

  // Legal / RERA chip
  if (project.builder?.rera_compliance_score !== null && project.builder?.rera_compliance_score !== undefined) {
    coreChips.push(
      chip('legal_check', 'TEXT_MESSAGE', 'Check RERA & Legal status', '',
        { actionPrefix: 'Check RERA compliance and legal clearances for', projects: projectsList }, coreChips.length + 1)
    )
  }

  // Booking chip
  if (project.builder?.legal_flag?.includes('booking')) {
    coreChips.push(
      chip('booking_process', 'TEXT_MESSAGE', 'Explain booking steps', '',
        { actionPrefix: 'Explain typical initial booking amounts and next steps for', projects: projectsList }, coreChips.length + 1)
    )
  }

  // Exit strategy chip
  if (topProject.price_min_cr) {
    coreChips.push(
      chip('exit_strategy', 'TEXT_MESSAGE', '5-year exit strategy', '',
        { actionPrefix: 'Analyze market liquidity if I want to sell', projects: projectsList, actionSuffix: 'in 5 years.' }, coreChips.length + 1)
    )
  }

  // Payment plan chip
  const unitTypes = await prisma.unitType.findMany({
    where: { project_id: topProject.id },
    select: { bhk: true }
  })
  
  if (unitTypes.length > 0) {
    const bhks = [...new Set(unitTypes.map((u: { bhk: number }) => u.bhk))].sort()
    coreChips.push(
      chip('payment_plan', 'TEXT_MESSAGE', 'Review payment plans', '',
        { actionPrefix: 'Show payment-plan options for', projects: projectsList }, coreChips.length + 1)
    )
  }

  // Amenities chip
  const amenCount = await prisma.amenity.count({ where: { project_id: topProject.id } })
  if (amenCount > 0) {
    coreChips.push(
      chip('amenities', 'TEXT_MESSAGE', 'Explore amenities', '',
        { actionPrefix: 'List key amenities for', projects: projectsList }, coreChips.length + 1)
    )
  }

  // Connectivity chip
  const connectivity = await prisma.connectivity.findFirst({
    where: { project_id: topProject.id }
  })
  if (connectivity) {
    coreChips.push(
      chip('connectivity', 'TEXT_MESSAGE', 'Check connectivity', '',
        { actionPrefix: 'Show nearest metro stations and highway access for', projects: projectsList }, coreChips.length + 1)
    )
  }

  if (coreChips.length === 0) {
    coreChips.push(chip('tell_more', 'TEXT_MESSAGE', 'Tell me more', '', { actionPrefix: 'Tell me more about', projects: projectsList }, 1))
  }

  // Filter out any chips that were already discussed
  const historyText = chatHistory.map((m: any) => m.content.toLowerCase()).join(' ')
  const filteredCoreChips = coreChips.filter(c => {
    const labelLower = c.label.toLowerCase()
    const prefixLower = (c.payload as any)?.actionPrefix?.toLowerCase()
    const isDiscussed = historyText.includes(labelLower) || (prefixLower && historyText.includes(prefixLower))
    return !isDiscussed
  })

  // Optionally fetch LLM chips if there is a conversation history
  const finalChips: ChipAction[] = []
  if (chatHistory.length > 0) {
    try {
      const { generateContextualLLMChips } = await import('../ai/prompts/chips')
      const llmChips = await generateContextualLLMChips(chatHistory, 0)
      
      // Filter LLM chips to guarantee no repetition
      const filteredLlmChips = llmChips.filter(c => {
        const labelLower = c.label.toLowerCase()
        return !historyText.includes(labelLower)
      })
      finalChips.push(...filteredLlmChips)
    } catch (err) {
      console.error('[CHIPS] LLM chip generation failed', err)
    }
  }

  // Fill the rest with the filtered database chips
  const needed = 4 - finalChips.length
  if (needed > 0) {
    const turn = Math.floor(chatHistory.length / 2)
    const maxStartIndex = Math.max(0, filteredCoreChips.length - needed)
    const startIndex = maxStartIndex > 0 ? (turn % maxStartIndex) : 0
    finalChips.push(...filteredCoreChips.slice(startIndex, startIndex + needed))
  }

  return finalChips
}
