/**
 * Analytics tracking hooks for chat and engagement
 * Handles drop-off detection, engagement tracking, and promotional tracking
 */

import { useEffect, useRef, useCallback } from 'react'

interface UseAnalyticsTrackingProps {
  sessionId: string
  userId?: string
  guestToken?: string
}

/**
 * Drop-off detection hook
 * Triggers analytics event after 45 seconds of inactivity
 */
export function useDropoffDetection({ sessionId }: UseAnalyticsTrackingProps) {
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const hasDroppedOff = useRef(false)

  const recordDropoff = useCallback(async (stage: string) => {
    if (hasDroppedOff.current) return

    hasDroppedOff.current = true

    try {
      await fetch('/api/v1/analytics/engagement', {
        method: 'POST',
        body: JSON.stringify({
          session_id: sessionId,
          event: 'drop_off',
          drop_off_stage: stage,
          idle_seconds: 45,
        })
      })
    } catch (err) {
      console.error('[analytics] Drop-off tracking failed:', err)
    }
  }, [sessionId])

  const startIdleTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(() => {
      recordDropoff('no_engagement')
    }, 45000) // 45 seconds
  }, [recordDropoff])

  const resetTimer = useCallback(() => {
    startIdleTimer()
  }, [startIdleTimer])

  useEffect(() => {
    // Start idle timer on mount
    startIdleTimer()

    // Reset timer on user interactions (clicks on interactive elements)
    const handleInteraction = (e: Event) => {
      if (e.target instanceof HTMLElement) {
        const isInteractive = e.target.matches('[data-interactive]') ||
          e.target.closest('[data-interactive]') ||
          e.target.matches('button, a, [role="button"]') ||
          e.target.closest('button, a, [role="button"]')

        if (isInteractive) {
          resetTimer()
        }
      }
    }

    document.addEventListener('click', handleInteraction, true)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      document.removeEventListener('click', handleInteraction, true)
    }
  }, [startIdleTimer, resetTimer])

  return { recordDropoff, hasDroppedOff: hasDroppedOff.current }
}

/**
 * Engagement tracking hook
 * Tracks first time user clicks a project
 */
export function useEngagementTracking({ sessionId }: UseAnalyticsTrackingProps) {
  const hasEngagedRef = useRef(false)

  const recordEngagement = useCallback(async (projectId?: string) => {
    if (hasEngagedRef.current) return

    hasEngagedRef.current = true

    try {
      await fetch('/api/v1/analytics/engagement', {
        method: 'POST',
        body: JSON.stringify({
          session_id: sessionId,
          event: 'first_engagement',
          project_id: projectId,
        })
      })
    } catch (err) {
      console.error('[analytics] Engagement tracking failed:', err)
    }
  }, [sessionId])

  return { recordEngagement, hasEngaged: hasEngagedRef.current }
}

/**
 * Promotional tracking hook
 * Tracks impressions and clicks on promotional content
 */
export function usePromotionalTracking({ sessionId, userId, guestToken }: UseAnalyticsTrackingProps) {
  const trackImpression = useCallback(async (promotionalId: string) => {
    try {
      await fetch('/api/v1/analytics/promotions', {
        method: 'POST',
        body: JSON.stringify({
          action: 'impression',
          promotional_id: promotionalId,
          session_id: sessionId,
          user_id: userId,
          guest_token: guestToken,
        })
      })
    } catch (err) {
      console.error('[analytics] Promo impression tracking failed:', err)
    }
  }, [sessionId, userId, guestToken])

  const trackClick = useCallback(async (promotionalId: string) => {
    try {
      await fetch('/api/v1/analytics/promotions', {
        method: 'POST',
        body: JSON.stringify({
          action: 'click',
          promotional_id: promotionalId,
          session_id: sessionId,
          user_id: userId,
          guest_token: guestToken,
        })
      })
    } catch (err) {
      console.error('[analytics] Promo click tracking failed:', err)
    }
  }, [sessionId, userId, guestToken])

  return { trackImpression, trackClick }
}
