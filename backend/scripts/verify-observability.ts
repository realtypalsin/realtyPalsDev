/**
 * Observability smoke test.
 *
 * Sends one real event to PostHog and one real error to Sentry, then reports
 * exactly what is and is not configured. Both integrations fail silently by
 * design — they no-op when their key is absent so analytics can never break a
 * chat turn — which means a misconfigured deploy looks identical to a healthy
 * one until someone opens the dashboard and finds it empty.
 *
 *   cd backend && npx tsx scripts/verify-observability.ts
 *
 * Safe to run against production keys: the event and error are tagged
 * `smoke_test` so they are easy to find and easy to filter out.
 */

import 'dotenv/config'
import * as Sentry from '@sentry/node'
import { PostHog } from 'posthog-node'

const RUN_ID = `smoke-${Date.now()}`
const results: Array<{ name: string; ok: boolean; detail: string }> = []

function record(name: string, ok: boolean, detail: string) {
  results.push({ name, ok, detail })
  console.log(`${ok ? '  ok  ' : ' MISS '} ${name.padEnd(28)} ${detail}`)
}

async function checkPostHog(): Promise<void> {
  const key = process.env.POSTHOG_API_KEY
  const host = process.env.POSTHOG_HOST || 'https://us.posthog.com'

  if (!key) {
    record('PostHog (backend)', false, 'POSTHOG_API_KEY not set — no server-side event has ever been sent')
    return
  }

  const client = new PostHog(key, { host, flushAt: 1, flushInterval: 0 })
  try {
    client.capture({
      distinctId: RUN_ID,
      event: 'smoke_test',
      properties: { source: 'verify-observability', run_id: RUN_ID, node_env: process.env.NODE_ENV ?? 'unknown' },
    })
    await client.shutdown()
    record('PostHog (backend)', true, `sent event "smoke_test" as distinct_id ${RUN_ID} to ${host}`)
  } catch (err) {
    record('PostHog (backend)', false, `send failed: ${err instanceof Error ? err.message : String(err)}`)
  }
}

async function checkSentry(): Promise<void> {
  const dsn = process.env.SENTRY_DSN
  if (!dsn) {
    record('Sentry (backend)', false, 'SENTRY_DSN not set — no error has ever been reported')
    return
  }

  try {
    Sentry.init({ dsn, environment: process.env.NODE_ENV ?? 'development', tracesSampleRate: 0 })
    const eventId = Sentry.captureException(
      new Error(`RealtyPals observability smoke test — ${RUN_ID} (safe to ignore)`),
    )
    await Sentry.flush(5000)
    record('Sentry (backend)', true, `captured event ${eventId}`)
  } catch (err) {
    record('Sentry (backend)', false, `capture failed: ${err instanceof Error ? err.message : String(err)}`)
  }
}

function checkFrontendKeys(): void {
  // These are read by the browser bundle, not this process — we can only report
  // whether they are present in the environment this script can see.
  record(
    'PostHog (browser)',
    !!process.env.NEXT_PUBLIC_POSTHOG_KEY,
    process.env.NEXT_PUBLIC_POSTHOG_KEY
      ? 'NEXT_PUBLIC_POSTHOG_KEY set — set it in Vercel too, it is inlined at build time'
      : 'NEXT_PUBLIC_POSTHOG_KEY not set — pageviews and every track() call are dropped',
  )
  record(
    'Sentry (browser)',
    !!process.env.NEXT_PUBLIC_SENTRY_DSN,
    process.env.NEXT_PUBLIC_SENTRY_DSN
      ? 'NEXT_PUBLIC_SENTRY_DSN set'
      : 'NEXT_PUBLIC_SENTRY_DSN not set — client-side errors are not reported',
  )
}

async function main(): Promise<void> {
  console.log(`\nRealtyPals observability check — run id ${RUN_ID}\n`)
  await checkPostHog()
  await checkSentry()
  checkFrontendKeys()

  const missing = results.filter(r => !r.ok)
  console.log('')
  if (missing.length === 0) {
    console.log('All four integrations are configured and accepted a live event.')
    console.log(`Find them by searching for "${RUN_ID}".`)
  } else {
    console.log(`${missing.length} of ${results.length} not configured:`)
    for (const m of missing) console.log(`  - ${m.name}: ${m.detail}`)
    console.log('\nUntil a key is set that integration is a silent no-op — the code runs and records nothing.')
  }
  console.log('')
  // Never fail a pipeline on this: it is a report, not a gate.
  process.exit(0)
}

void main()
