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
  chatHistory: any[],
  usedProvider?: { provider: string; envKey: string }
): Promise<ChipAction[]> {
  const coreChips: ChipAction[] = []

  if (!results || results.length === 0) {
    // Fallback static chips if no results
    return [
      chip('TEXT_MESSAGE:general_advice:noida', 'TEXT_MESSAGE', 'Buying guide', '', { text: 'What should I look for before buying a property in Noida?' }, 1),
      chip('TEXT_MESSAGE:popular_areas:noida', 'TEXT_MESSAGE', 'Popular areas', '', { text: 'Show me the most popular areas to invest in.' }, 2)
    ]
  }

  const projectsList = results.slice(0, 4).map(r => ({ id: r.id, name: r.name }))
  const topProject = results[0]

  // Compare Mode: Add comparison chip if there are multiple results
  if (mode === 'compare' && results.length >= 2) {
    const topNames = results.slice(0, 2).map(r => r.name).join(' and ') || 'these properties'
    const pIds = results.slice(0, 3).map(r => r.id).join(':')
    coreChips.push(
      chip(`COMPARE_PROPERTIES:final_compare:${pIds}`, 'COMPARE_PROPERTIES', 'Final comparison', '', { mode: 'multi' }, 0),
      chip(`TEXT_MESSAGE:legal_compare:${pIds}`, 'TEXT_MESSAGE', 'Compare Legal', '', { text: `How do ${topNames} compare in terms of RERA standing and legal safety?` }, 1)
    )
  }

  let project = null
  try {
    project = await prisma.project.findUnique({
      where: { id: topProject.id },
      include: { builder: true }
    })
  } catch {
    // Database connection error fallback
  }

  if (!project) {
    if (coreChips.length === 0) {
      const pIds = projectsList.map(p => p.id).join(':')
      coreChips.push(chip(`TEXT_MESSAGE:tell_more:${pIds}`, 'TEXT_MESSAGE', 'Tell me more', '', { actionPrefix: 'Tell me more about', projects: projectsList }, 1))
    }
    return coreChips
  }

  const pIds = projectsList.map(p => p.id).join(':')

  // Legal / RERA chip
  if (project.builder?.rera_compliance_score !== null && project.builder?.rera_compliance_score !== undefined) {
    coreChips.push(
      chip(`TEXT_MESSAGE:legal_check:${pIds}`, 'TEXT_MESSAGE', 'Check RERA & Legal status', '',
        { actionPrefix: 'Check RERA compliance and legal clearances for', projects: projectsList }, coreChips.length + 1)
    )
  }

  // Booking chip
  if (project.builder?.legal_flag?.includes('booking')) {
    coreChips.push(
      chip(`TEXT_MESSAGE:booking_process:${pIds}`, 'TEXT_MESSAGE', 'Explain booking steps', '',
        { actionPrefix: 'Explain typical initial booking amounts and next steps for', projects: projectsList }, coreChips.length + 1)
    )
  }

  // Exit strategy chip
  if (topProject.price_min_cr) {
    coreChips.push(
      chip(`TEXT_MESSAGE:exit_strategy:${pIds}`, 'TEXT_MESSAGE', '5-year exit strategy', '',
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
      chip(`TEXT_MESSAGE:payment_plan:${pIds}`, 'TEXT_MESSAGE', 'Review payment plans', '',
        { actionPrefix: 'Show payment-plan options for', projects: projectsList }, coreChips.length + 1)
    )
  }

  // Amenities chip
  const amenCount = await prisma.amenity.count({ where: { project_id: topProject.id } })
  if (amenCount > 0) {
    coreChips.push(
      chip(`TEXT_MESSAGE:amenities:${pIds}`, 'TEXT_MESSAGE', 'Explore amenities', '',
        { actionPrefix: 'What amenities are available in', projects: projectsList }, coreChips.length + 1)
    )
  }

  // Connectivity chip
  const connectivity = await prisma.connectivity.findFirst({
    where: { project_id: topProject.id }
  })
  if (connectivity) {
    coreChips.push(
      chip(`TEXT_MESSAGE:connectivity:${pIds}`, 'TEXT_MESSAGE', 'Check connectivity', '',
        { actionPrefix: 'Show nearest metro stations and highway access for', projects: projectsList }, coreChips.length + 1)
    )
  }

  if (coreChips.length === 0) {
    coreChips.push(chip(`TEXT_MESSAGE:tell_more:${pIds}`, 'TEXT_MESSAGE', 'Tell me more', '', { actionPrefix: 'Tell me more about', projects: projectsList }, 1))
  }

  // Filter out any chips that were already discussed OR match topics recently discussed
  const userMessages = chatHistory
    .filter((m: any) => m?.role === 'user')
    .map((m: any) => String(m.content ?? '').toLowerCase())
  const historyText = userMessages.join(' ')

  const recentlyAskedPayment = userMessages.some(msg => /payment|cost|pricing|emi|loan|plan|financial/.test(msg))
  const recentlyAskedAmenities = userMessages.some(msg => /amenit|facility|clubhouse|gym|pool/.test(msg))
  const recentlyAskedLegal = userMessages.some(msg => /rera|legal|clearance|approval/.test(msg))

  const filteredCoreChips = coreChips.filter(c => {
    const labelLower = c.label.toLowerCase()
    const prefixLower = ((c.payload as any)?.actionPrefix ?? '').toLowerCase()
    const textLower = ((c.payload as any)?.text ?? '').toLowerCase()

    if (historyText.includes(labelLower) || (prefixLower && historyText.includes(prefixLower))) return false

    // Progressive topic filtering: do not suggest the same topic that was just discussed
    if (recentlyAskedPayment && /payment|cost|price|emi|financial/i.test(labelLower + ' ' + prefixLower + ' ' + textLower)) {
      return false
    }
    if (recentlyAskedAmenities && /amenit|facility|clubhouse/i.test(labelLower + ' ' + prefixLower + ' ' + textLower)) {
      return false
    }
    if (recentlyAskedLegal && /rera|legal|clearance/i.test(labelLower + ' ' + prefixLower + ' ' + textLower)) {
      return false
    }

    return true
  })

  // Optionally fetch LLM chips if there is a conversation history
  const finalChips: ChipAction[] = []
  if (chatHistory.length > 0) {
    try {
      const { generateContextualLLMChips } = await import('../ai/prompts/chips')
      const llmChips = await generateContextualLLMChips(chatHistory, 0, usedProvider)

      // Filter LLM chips to guarantee no repetition AND ground against available data
      const filteredLlmChips = llmChips.filter(c => {
        const labelLower = c.label.toLowerCase()
        const isDiscussed = historyText.includes(labelLower)
        const isPaymentRepeat = recentlyAskedPayment && /payment|cost|price|emi|financial/i.test(labelLower)
        const isAmenitiesRepeat = recentlyAskedAmenities && /amenit|facility|clubhouse/i.test(labelLower)
        // Ground: drop comparison suggestions if <2 results
        const isCompareSuggestion = ['compare', 'versus', 'vs ', 'difference'].some(word => labelLower.includes(word))
        const cannotCompare = isCompareSuggestion && results.length < 2
        return !isDiscussed && !isPaymentRepeat && !isAmenitiesRepeat && !cannotCompare
      })
      finalChips.push(...filteredLlmChips)
    } catch (err) {
      console.error('[CHIPS] LLM chip generation failed', err)
    }
  }

  // Fill the rest with the filtered database chips or coreChips
  if (finalChips.length < 4) {
    const existingLabels = new Set(finalChips.map(c => c.label.toLowerCase()))
    for (const chipItem of coreChips) {
      if (!existingLabels.has(chipItem.label.toLowerCase())) {
        finalChips.push(chipItem)
        existingLabels.add(chipItem.label.toLowerCase())
      }
      if (finalChips.length >= 4) break
    }
  }

  // Backup static high-value chips if still under 3 chips
  if (finalChips.length < 3) {
    const backupChips: ChipAction[] = [
      chip(`TEXT_MESSAGE:backup_rera_${Date.now()}`, 'TEXT_MESSAGE', 'Check RERA & Legal status', '', { text: 'Show RERA numbers and legal safety for top projects in Sector 79' }, 1),
      chip(`TEXT_MESSAGE:backup_payment_${Date.now()}`, 'TEXT_MESSAGE', 'Review payment plans', '', { text: 'Show payment plan options and CLP schedules' }, 2),
      chip(`TEXT_MESSAGE:backup_builders_${Date.now()}`, 'TEXT_MESSAGE', 'Famous builders in Noida', '', { text: 'Which builders are famous in Noida?' }, 3),
      chip(`TEXT_MESSAGE:backup_amenities_${Date.now()}`, 'TEXT_MESSAGE', 'Explore amenities', '', { text: 'What amenities are available in top projects?' }, 4)
    ]
    const existingLabels = new Set(finalChips.map(c => c.label.toLowerCase()))
    for (const bChip of backupChips) {
      if (!existingLabels.has(bChip.label.toLowerCase())) {
        finalChips.push(bChip)
        existingLabels.add(bChip.label.toLowerCase())
      }
      if (finalChips.length >= 4) break
    }
  }

  return finalChips.slice(0, 4)
}
