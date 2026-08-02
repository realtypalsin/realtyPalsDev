/**
 * PostHog Analytics Client for Frontend
 * Tracks user interactions, performance, and feature usage
 */

import posthog from 'posthog-js'

/**
 * Initialize PostHog on frontend
 */
export function initPostHog(): void {
  if (typeof window === 'undefined') return

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_API_KEY
  if (!apiKey) {
    console.warn('NEXT_PUBLIC_POSTHOG_API_KEY not set; frontend analytics disabled')
    return
  }

  posthog.init(apiKey, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.posthog.com',
    loaded: (ph) => {
      // Enable debug mode in development
      if (process.env.NODE_ENV === 'development') {
        ph.debug()
      }
    },
  })
}

/**
 * Track event
 */
export function trackEvent(event: string, properties?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  try {
    posthog.capture(event, properties)
  } catch (err) {
    console.error('PostHog capture failed:', err)
  }
}

/**
 * Identify user
 */
export function identifyUser(userId: string, properties?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  try {
    posthog.identify(userId, properties)
  } catch (err) {
    console.error('PostHog identify failed:', err)
  }
}

/**
 * Reset user (logout)
 */
export function resetUser(): void {
  if (typeof window === 'undefined') return
  try {
    posthog.reset()
  } catch (err) {
    console.error('PostHog reset failed:', err)
  }
}

/**
 * Set group properties
 */
export function setGroupProperties(groupType: string, groupKey: string, properties: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  try {
    posthog.group(groupType, groupKey, properties)
  } catch (err) {
    console.error('PostHog group failed:', err)
  }
}

/**
 * Frontend analytics events
 */
export const FRONTEND_EVENTS = {
  // Navigation
  PAGE_VIEWED: 'page_viewed',
  SEARCH_STARTED: 'search_started',
  PROPERTY_CLICKED: 'property_clicked',
  PROPERTY_SAVED: 'property_saved',
  PROPERTY_REMOVED_FROM_SAVED: 'property_removed_from_saved',
  COMPARISON_STARTED: 'comparison_started',
  COMPARISON_ADDED_PROPERTY: 'comparison_added_property',

  // Chat interactions
  CHAT_MESSAGE_SENT: 'chat_message_sent',
  CHAT_CONFIDENCE_BADGE_VIEWED: 'chat_confidence_badge_viewed',
  COMPONENTS_RENDERED: 'components_rendered',
  COMPONENT_INTERACTED: 'component_interacted',

  // Forms
  CALLBACK_REQUEST_STARTED: 'callback_request_started',
  CALLBACK_REQUEST_SUBMITTED: 'callback_request_submitted',
  SITE_VISIT_REQUEST_STARTED: 'site_visit_request_started',
  SITE_VISIT_REQUEST_SUBMITTED: 'site_visit_request_submitted',

  // Performance
  COMPONENT_RENDER_TIME: 'component_render_time',
  PAGE_LOAD_TIME: 'page_load_time',
  API_LATENCY: 'api_latency',

  // Errors
  ERROR_OCCURRED: 'error_occurred',
} as const
