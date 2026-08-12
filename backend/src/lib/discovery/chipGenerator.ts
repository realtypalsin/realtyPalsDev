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
      chips.push(makeChip('clp_plan', 'CLP (Construction-Linked Plan)', '🏗️', priority++))
      chips.push(makeChip('investor_plan', 'Investor Plan (20-80 Slabs)', '📈', priority++))
      chips.push(makeChip('flexi_plan', 'Flexi Payment Slabs', '💬', priority++))
      chips.push(makeChip('full_payment', 'Full Payment Discount Plan', '🏷️', priority++))
      chips.push(makeChip('calculate_emi', 'Calculate EMI', '🧮', priority++))
      break

    case 'COSTS':
      chips.push(makeChip('base_price', 'Base Price & Per Sqft', '🏷️', priority++))
      chips.push(makeChip('plc_charges', 'PLC & Club Membership', '🏆', priority++))
      chips.push(makeChip('statutory_taxes', 'Stamp Duty & GST (Taxes)', '🏛️', priority++))
      chips.push(makeChip('cost_sheet_full', 'Full Cost Sheet Breakdown', '💵', priority++))
      break

    case 'FLOOR_PLANS':
      chips.push(makeChip('floor_2bhk', '2 BHK Floor Plans', '🛏️', priority++))
      chips.push(makeChip('floor_3bhk', '3 BHK Floor Plans', '🛏️', priority++))
      chips.push(makeChip('floor_4bhk', '4 BHK / Duplex Plans', '👑', priority++))
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
