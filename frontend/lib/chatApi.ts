// Chat API integration helpers
// Intent is represented as Record<string, unknown> throughout the codebase

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || ''

interface SessionItem {
  id: string
  title: string
  messageCount: number
  created_at: string
}

interface FeedbackPayload {
  sessionId: string
  projectId: string
  sentiment: 'good' | 'bad'
  reasons?: string[]
  rating?: number
  comment?: string
}

// Get chat history for user/guest
export async function fetchChatSessions(
  userId?: string | null,
  guestToken?: string | null
): Promise<SessionItem[]> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  if (userId) {
    const token = localStorage.getItem('supabase_token')
    if (token) headers.Authorization = `Bearer ${token}`
  } else if (guestToken) {
    headers['X-Guest-Token'] = guestToken
  }

  const response = await fetch(`${API_BASE}/api/chat/sessions/list`, { headers })
  if (!response.ok) throw new Error('Failed to fetch sessions')
  return (await response.json()).sessions || []
}

// Submit property feedback
export async function submitPropertyFeedback(
  payload: FeedbackPayload,
  userId?: string | null,
  guestToken?: string | null
): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  if (userId) {
    const token = localStorage.getItem('supabase_token')
    if (token) headers.Authorization = `Bearer ${token}`
  } else if (guestToken) {
    headers['X-Guest-Token'] = guestToken
  }

  const response = await fetch(`${API_BASE}/api/chat/feedback`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  if (!response.ok) throw new Error('Failed to submit feedback')
}

// Format intent for UI display
export function formatIntentForDisplay(intent: Record<string, unknown> | null | undefined) {
  if (!intent) return null

  const BHK_DISPLAY: Record<number, string> = {
    1: '1BHK',
    2: '2BHK',
    3: '3BHK',
    4: '4BHK',
    5: '5+ BHK',
  }

  const details = [
    {
      label: 'Property type',
      value: Array.isArray(intent?.bhk) ? (intent.bhk as number[]).map((b: number) => BHK_DISPLAY[b] || `${b}BHK`).join(' / ') : null,
    },
    { label: 'Location', value: intent.sector || intent.location || null },
    {
      label: 'Budget',
      value: intent.budgetMin || intent.budgetMax ? `₹${intent.budgetMin || 0}–${intent.budgetMax || '∞'}Cr` : null,
    },
    {
      label: 'Possession',
      value:
        intent.possession === 'immediate' ? 'Ready to move' : intent.possession === 'flexible' ? 'Flexible' : null,
    },
  ].filter((d) => d.value)

  return details
}

// Parse quick follow-up buttons from API response
export function parseQuickButtons(
  intent: Record<string, unknown> | null,
  shownProjects: any[]
): Array<{ label: string; emoji: string; action: string; description: string }> {
  if (!intent || !shownProjects.length) return []

  const buttons = []

  // More in same sector
  const sectors = new Set(shownProjects.map((p) => p.sector || p.location).filter(Boolean))
  if (sectors.size === 1) {
    const sector = [...sectors][0] as string
    buttons.push({
      label: `More in ${sector}`,
      emoji: '🔍',
      action: `sector:${sector}`,
      description: `Show more properties in ${sector}`,
    })
  }

  // Budget filters
  if (intent.budgetMax) {
    buttons.push({
      label: `Under ₹${intent.budgetMax}Cr`,
      emoji: '💰',
      action: `budget:max:${intent.budgetMax}`,
      description: 'Show properties under your budget',
    })

    const hasExpensive = shownProjects.some((p) => (p.price_min_cr || 0) > (intent.budgetMax as number))
    if (hasExpensive) {
      const newMax = Math.min(((intent.budgetMax as number) || 0) + 0.5, 5)
      buttons.push({
        label: `Up to ₹${newMax}Cr`,
        emoji: '📈',
        action: `budget:max:${newMax}`,
        description: 'Increase budget for more options',
      })
    }
  }

  // Possession filter
  const possessions = new Set(shownProjects.map((p) => p.possession_status).filter(Boolean))
  if (possessions.size > 1 || !intent.possession) {
    buttons.push({
      label: 'Ready to move',
      emoji: '⏱️',
      action: 'possession:immediate',
      description: 'Show only ready-to-move properties',
    })
  }

  // BHK variation
  const bhkArray = Array.isArray(intent.bhk) ? (intent.bhk as number[]) : null
  if (bhkArray?.[0] === 3) {
    buttons.push({
      label: '2BHK only',
      emoji: '🏠',
      action: 'bhk:2',
      description: 'Show 2BHK properties instead',
    })
  } else if (bhkArray?.[0] === 2) {
    buttons.push({
      label: '3BHK options',
      emoji: '🏠',
      action: 'bhk:3',
      description: 'Show 3BHK properties',
    })
  }

  return buttons.slice(0, 4)
}
