// Generate context-aware quick follow-up buttons based on recommendations and intent
import type { Intent, ScoredProject } from '../discovery'

export interface QuickButton {
  label: string
  emoji: string
  action: Partial<Intent>
  description: string
}

export function generateQuickFollowUps(
  lastIntent: Intent,
  shownProjects: ScoredProject[]
): QuickButton[] {
  if (!shownProjects.length) return []

  const buttons: QuickButton[] = []

  // 1. More in same sector
  const sectors = new Set(shownProjects.map((p) => (p as any).sector || (p as any).location).filter(Boolean))
  if (sectors.size === 1) {
    const sector = [...sectors][0] as string
    buttons.push({
      label: `More in ${sector}`,
      emoji: '🔍',
      action: { sector, spatialScope: 'EXACT' },
      description: `Show more properties in ${sector}`,
    })
  }

  // 2. Different budget range
  if (lastIntent.budgetMax) {
    buttons.push({
      label: `Under ₹${lastIntent.budgetMax}Cr`,
      emoji: '💰',
      action: { budgetMax: lastIntent.budgetMax },
      description: `Show properties under your budget`,
    })

    // Offer budget up if there are expensive properties
    const hasExpensive = shownProjects.some((p) => ((p as any).price_min_cr || 0) > lastIntent.budgetMax!)
    if (hasExpensive) {
      buttons.push({
        label: `Up to ₹${Math.min((lastIntent.budgetMax || 0) + 0.5, 5)}Cr`,
        emoji: '📈',
        action: { budgetMax: Math.min((lastIntent.budgetMax || 0) + 0.5, 5) },
        description: `Increase budget for more options`,
      })
    }
  }

  // 3. Possession filter
  const possessions = new Set(shownProjects.map((p) => (p as any).possession_status).filter(Boolean))
  if (possessions.size > 1 || !lastIntent.possession) {
    buttons.push({
      label: 'Ready to move',
      emoji: '⏱️',
      action: { possession: 'immediate' },
      description: 'Show only ready-to-move properties',
    })
  }

  // 4. BHK variation
  if (lastIntent.bhk?.[0] === 3) {
    buttons.push({
      label: '2BHK only',
      emoji: '🏠',
      action: { bhk: [2] },
      description: 'Show 2BHK properties instead',
    })
  } else if (lastIntent.bhk?.[0] === 2) {
    buttons.push({
      label: '3BHK options',
      emoji: '🏠',
      action: { bhk: [3] },
      description: 'Show 3BHK properties',
    })
  }

  // 5. Lifestyle keywords
  if (!lastIntent.lifestyleKeywords?.length && shownProjects.length > 0) {
    buttons.push({
      label: 'With gym & pool',
      emoji: '🏊',
      action: { lifestyleKeywords: ['gym', 'swimming_pool'] },
      description: 'Show properties with fitness amenities',
    })
  }

  return buttons.slice(0, 4) // Limit to 4 buttons
}

export function formatButtonForUI(button: QuickButton): {
  label: string
  action: Partial<Intent>
} {
  return {
    label: `${button.emoji} ${button.label}`,
    action: button.action,
  }
}
