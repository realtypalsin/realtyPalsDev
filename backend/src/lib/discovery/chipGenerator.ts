import type { ConversationMemory } from './types'

export interface Chip {
  label: string
  emoji: string
  action: string
}

export function generateChips(
  intentType: string,
  memory: Partial<ConversationMemory>,
  phase: 'DISCOVERY' | 'ADVISOR'
): Chip[] {
  // Only show chips in ADVISOR phase (conversation is underway, user has refined intent)
  if (phase === 'DISCOVERY') return []

  const chips: Chip[] = []

  // Intent-specific chips: always show for relevant intent types
  switch (intentType) {
    case 'PAYMENT_PLANS':
      chips.push({
        emoji: '🧮',
        label: 'Calculate EMI',
        action: 'calculate_emi'
      })
      chips.push({
        emoji: '💬',
        label: 'Ask about flexibility',
        action: 'ask_flexibility'
      })
      break

    case 'BUILDER_HISTORY':
      chips.push({
        emoji: '✅',
        label: 'Verify RERA',
        action: 'verify_rera'
      })
      chips.push({
        emoji: '📋',
        label: 'View complaints',
        action: 'view_complaints'
      })
      break

    case 'LOCATION':
      chips.push({
        emoji: '🗺️',
        label: 'View on map',
        action: 'show_map'
      })
      chips.push({
        emoji: '🚇',
        label: 'Metro distance',
        action: 'show_metro'
      })
      break

    case 'COSTS':
      chips.push({
        emoji: '💵',
        label: 'Compare costs',
        action: 'compare_costs'
      })
      break

    case 'POSSESSION_TIMELINE':
      chips.push({
        emoji: '📅',
        label: 'Check OC status',
        action: 'check_oc'
      })
      break
  }

  // Conditional: show site visit if user has stated budget
  if (memory.user_budget_min_cr && memory.user_budget_max_cr) {
    chips.push({
      emoji: '🏗️',
      label: 'Schedule site visit',
      action: 'site_visit_request'
    })
  }

  // Conditional: show comparison if multiple options discussed or multiple chips
  if (chips.length >= 2) {
    chips.push({
      emoji: '⚖️',
      label: 'Compare options',
      action: 'compare_start'
    })
  }

  return chips
}
