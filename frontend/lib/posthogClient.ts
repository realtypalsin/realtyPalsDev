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
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return null

  loading = import('posthog-js')
    .then(({ default: posthog }) => {
      posthog.init(key, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
        person_profiles: 'identified_only',
        // Pageviews are captured manually in PostHogProvider so they fire on
        // App Router navigations, which posthog-js does not see on its own.
        capture_pageview: false,
        // Feature flags are not enabled on this project: the flags endpoint
        // returns 401 and its remote-config asset 404s, producing 18 console
        // errors on every page load. Event capture is unaffected — the key was
        // verified good against the ingestion endpoint — but that volume of red
        // hides real errors from anyone looking at the console.
        //
        // Session Replay is deliberately NOT disabled here: it needs the decide
        // call, and it is the single most useful thing to turn on once enabled
        // in the PostHog project settings.
        advanced_disable_feature_flags: true,
        advanced_disable_feature_flags_on_first_load: true,
        disable_session_recording: true,
        disable_surveys: true,
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
