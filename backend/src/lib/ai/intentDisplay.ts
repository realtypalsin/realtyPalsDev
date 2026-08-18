// Format intent snapshot into user-friendly confirmation prompt
import type { Intent } from '../discovery'

export interface IntentConfirmation {
  summary: string
  fields: Array<{
    label: string
    value: string | null
  }>
}

export function formatIntentForConfirmation(intent: Intent): IntentConfirmation {
  const fields = [
    {
      label: 'Property Type',
      value: intent.bhk?.[0] ? `${intent.bhk[0]}BHK` : null,
    },
    {
      label: 'Location',
      value: intent.sector || null,
    },
    {
      label: 'Budget',
      value: intent.budgetMin || intent.budgetMax
        ? `₹${intent.budgetMin || 0}-${intent.budgetMax || '∞'} Cr`
        : null,
    },
    {
      label: 'Possession',
      value: intent.possession || null,
    },
    {
      label: 'Purpose',
      value: intent.purpose ? (intent.purpose === 'endUse' ? 'Live' : 'Invest') : null,
    },
  ].filter(f => f.value !== null)

  const summary = fields.map(f => `${f.label}: ${f.value}`).join(' • ')

  return {
    summary,
    fields,
  }
}

export function intentToBrief(intent: Intent): string {
  const parts = []
  if (intent.bhk?.[0]) parts.push(`${intent.bhk[0]}BHK`)
  if (intent.sector) parts.push(`Sector ${intent.sector}`)
  if (intent.budgetMax) parts.push(`₹${intent.budgetMax}Cr`)
  if (intent.possession) parts.push(intent.possession === 'immediate' ? 'Ready now' : intent.possession)
  return parts.join(', ') || 'Property search'
}
