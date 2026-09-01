// Lazy PostHog loader.
//
// posthog-js is ~219 KB of raw JS. It used to be imported at module scope by
// lib/analytics.ts (which almost every interactive component pulls in) and by
// PostHogProvider in the root layout, so every route paid for it before first
// paint. Analytics must never block the first paint of a property page.
//
// Events fired before the library lands are buffered and replayed in order, so
// callers cannot lose an event by being early.

type PostHog = typeof import('posthog-js').default

type QueuedCall =
  | { kind: 'capture'; event: string; properties?: Record<string, unknown> }
  | { kind: 'identify'; userId: string; traits?: Record<string, unknown> }

let client: PostHog | null = null
let loading: Promise<void> | null = null
const queue: QueuedCall[] = []

// Bounded so a misconfigured deploy (no key, or a blocked CDN) cannot grow an
// unbounded array over a long session.
const MAX_QUEUE = 100

function flush() {
  if (!client) return
  for (const call of queue.splice(0, queue.length)) {
    if (call.kind === 'capture') client.capture(call.event, call.properties)
    else client.identify(call.userId, call.traits)
  }
}

function load(): Promise<void> | null {
  if (client || loading) return loading
  if (typeof window === 'undefined') return null
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY || 'phc_CxNVfVHUhdM7q8cQjUaRWcGBPHsY9JVfYdsZvUqJsbjV'
  if (!key) return null

  loading = import('posthog-js')
    .then(({ default: posthog }) => {
      const apiHost = typeof window !== 'undefined'
        ? `${window.location.origin}/ingest`
        : (process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com')

      posthog.init(key, {
        api_host: apiHost,
        ui_host: 'https://us.posthog.com',
        person_profiles: 'always',
        capture_pageview: true,
        autocapture: true,
        disable_session_recording: false,
        session_recording: {
          maskAllInputs: false,
          maskInputOptions: {
            password: true,
          },
        },
        loaded: () => {},
      })
      client = posthog
      flush()
    })
    .catch(() => {
      // Blocked by an ad blocker or offline — drop the buffer and stop retrying.
      queue.length = 0
    })

  return loading
}

/** Kick off the download without sending anything. Call from an idle callback. */
export function preloadPostHog() {
  load()
}

export function capture(event: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  if (client) {
    client.capture(event, properties)
    return
  }
  if (queue.length < MAX_QUEUE) queue.push({ kind: 'capture', event, properties })
  load()
}

export function identify(userId: string, traits?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  if (client) {
    client.identify(userId, traits)
    return
  }
  if (queue.length < MAX_QUEUE) queue.push({ kind: 'identify', userId, traits })
  load()
}
