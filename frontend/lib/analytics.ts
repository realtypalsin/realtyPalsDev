import posthog from 'posthog-js'

type EventName =
  | 'chat_started'
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
