import type { ConversationMemory } from './types'

export interface Chip {
  id: string
  actionType: 'TEXT_MESSAGE' | 'NAVIGATE' | 'OPEN_MODAL'
  label: string
  icon: string
  analyticsId: string
  priority: number
  payload: Record<string, unknown>
}

function makeChip(
  action: string,
  label: string,
  icon: string,
  priority: number = 1,
  payload: Record<string, unknown> = {}
): Chip {
  return {
    id: `chip_${action}_${Date.now()}`,
    actionType: 'TEXT_MESSAGE',
    label,
    icon,
    analyticsId: `chip_${action}`,
    priority,
    payload
  }
}

export function generateChips(
  intentType: string,
  memory: Partial<ConversationMemory>,
  phase: 'DISCOVERY' | 'ADVISOR'
): Chip[] {
  // Only show chips in ADVISOR phase (conversation is underway, user has refined intent)
  if (phase === 'DISCOVERY') return []

  const chips: Chip[] = []
  let priority = 1

  // Intent-specific chips: always show for relevant intent types
  switch (intentType) {
    case 'PAYMENT_PLANS':
      chips.push(makeChip('calculate_emi', 'Calculate EMI', '🧮', priority++))
      chips.push(makeChip('ask_flexibility', 'Ask about flexibility', '💬', priority++))
      break

    case 'BUILDER_HISTORY':
      chips.push(makeChip('verify_rera', 'Verify RERA', '✅', priority++))
      chips.push(makeChip('view_complaints', 'View complaints', '📋', priority++))
      break

    case 'LOCATION':
      chips.push(makeChip('show_map', 'View on map', '🗺️', priority++))
      chips.push(makeChip('show_metro', 'Metro distance', '🚇', priority++))
      break

    case 'COSTS':
      chips.push(makeChip('compare_costs', 'Compare costs', '💵', priority++))
      break

    case 'POSSESSION_TIMELINE':
      chips.push(makeChip('check_oc', 'Check OC status', '📅', priority++))
      break
  }

  // Conditional: show site visit if user has stated budget
  if (memory.user_budget_min_cr && memory.user_budget_max_cr) {
    chips.push(makeChip('site_visit_request', 'Schedule site visit', '🏗️', priority++))
  }

  // Conditional: show comparison if multiple options discussed or multiple chips
  if (chips.length >= 2) {
    chips.push(makeChip('compare_start', 'Compare options', '⚖️', priority++))
  }

  return chips
}
