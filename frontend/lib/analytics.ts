import posthog from 'posthog-js'

type EventName =
  | 'chat_started'
<<<<<<< HEAD
=======
  | 'message_sent'
  | 'chip_clicked'
  | 'answer_feedback'
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
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
<<<<<<< HEAD
=======
  | 'document_download'
  | 'ask_ai_tapped'
  | 'call_tapped'
  | 'share_tapped'
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172

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
<<<<<<< HEAD
=======

type PropertyAction = 'view' | 'save' | 'compare' | 'share' | 'whatsapp_inquiry' | 'call' | 'ask_ai' | 'site_visit' | 'image_viewed' | 'tab_opened' | 'floorplan_viewed' | 'document_download' | 'calculator_used' | 'card_click' | 'filter_applied'

export async function trackPropertyEvent(projectId: string, action: PropertyAction, sessionId?: string | null, userId?: string | null, guestToken?: string | null, metadata?: Record<string, unknown>) {
  try {
    const { API_BASE } = await import('@/lib/env')
    const { authHeaders } = await import('@/lib/authedFetch')
    const headers = await authHeaders()
    await fetch(`${API_BASE}/analytics/property-event`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, action, session_id: sessionId, user_id: userId, guest_token: guestToken, metadata }),
    })
  } catch {
    // never crash app on analytics failure
  }
}
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
