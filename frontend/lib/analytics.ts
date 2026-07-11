import posthog from 'posthog-js'

type EventName =
  | 'chat_started'
  | 'message_sent'
  | 'chip_clicked'
  | 'answer_feedback'
  | 'recommendation_generated'
  | 'property_viewed'
  | 'property_saved'
  | 'comparison_used'
  | 'callback_requested'
  | 'site_visit_requested'
  | 'signup_started'
  | 'signup_completed'
  | 'whatsapp_handoff'
  | 'lead_created'
  | 'document_download'
  | 'ask_ai_tapped'
  | 'call_tapped'
  | 'share_tapped'

export function track(event: EventName, properties?: Record<string, unknown>) {
  try {
    if (typeof window === 'undefined') return
    posthog.capture(event, properties)
  } catch {
    // never let analytics crash the app
  }
}

export function identifyUser(userId: string, traits?: Record<string, unknown>) {
  try {
    if (typeof window === 'undefined') return
    posthog.identify(userId, traits)
  } catch {}
}

type PropertyAction = 'view' | 'save' | 'compare' | 'share' | 'whatsapp_inquiry'

export async function trackPropertyEvent(projectId: string, action: PropertyAction, sessionId?: string | null, userId?: string | null, guestToken?: string | null) {
  try {
    const { API_BASE } = await import('@/lib/env')
    const { authHeaders } = await import('@/lib/authedFetch')
    const headers = await authHeaders()
    await fetch(`${API_BASE}/analytics/property-event`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, action, session_id: sessionId, user_id: userId, guest_token: guestToken }),
    })
  } catch {
    // never crash app on analytics failure
  }
}
