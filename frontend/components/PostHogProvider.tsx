'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, Suspense } from 'react'
import { capture, preloadPostHog } from '@/lib/posthogClient'

// posthog-js is loaded lazily (see lib/posthogClient.ts) — it is ~219 KB and
// used to sit in the root layout's chunk, so every route paid for it before
// first paint. The `posthog-js/react` context provider is gone with it: nothing
// in this codebase calls `usePostHog()`, so it was 100% overhead.

function PostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!pathname) return
    const qs = searchParams.toString()
    capture('$pageview', { $current_url: window.origin + pathname + (qs ? `?${qs}` : '') })
  }, [pathname, searchParams])

  return null
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  // Warm the library once the browser is idle so the first real event does not
  // pay the download latency.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const idle = typeof window.requestIdleCallback === 'function'
    const handle: number = idle
      ? window.requestIdleCallback(preloadPostHog, { timeout: 4000 })
      : window.setTimeout(preloadPostHog, 2000)
    return () => {
      if (idle) window.cancelIdleCallback(handle)
      else window.clearTimeout(handle)
    }
  }, [])

  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </>
  )
}
