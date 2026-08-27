import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { trackEvent, ANALYTICS_EVENTS } from '../monitoring/posthog'

const SRC = join(__dirname, '../..')
const read = (p: string) => readFileSync(join(SRC, p), 'utf8')

describe('PostHog wiring', () => {
  it('trackEvent is called as (userId, event, properties) everywhere', () => {
    // fallbackChain.ts called trackEvent('fallback_response_generated', userId, …),
    // so that event reached PostHog with distinctId set to the event name and the
    // user id recorded as the event. Guard the argument order at every call site.
    const eventNames = new Set<string>(Object.values(ANALYTICS_EVENTS))
    const offenders: string[] = []

    for (const file of ['lib/ai/fallbackChain.ts', 'routes/chat-router.ts']) {
      const source = read(file)
      for (const match of source.matchAll(/trackEvent\(\s*(['"`])([^'"`]+)\1/g)) {
        const firstArg = match[2]
        // A string literal in first position is only ever an event name, and the
        // first parameter is the distinctId.
        if (eventNames.has(firstArg) || /^[a-z][a-z0-9_]*$/.test(firstArg)) {
          offenders.push(`${file}: trackEvent('${firstArg}', …) — first argument must be the userId`)
        }
      }
    }

    assert.deepEqual(offenders, [])
  })

  it('never throws when PostHog is unconfigured', () => {
    // Analytics must not be able to break a chat turn.
    assert.doesNotThrow(() => trackEvent(null, ANALYTICS_EVENTS.LLM_ERROR, { provider: 'test' }))
    assert.doesNotThrow(() => trackEvent('user-1', 'custom_event'))
  })

  it('flushes on shutdown so a deploy does not drop batched events', () => {
    // posthog-node batches on a 30s flushInterval.
    const index = read('index.ts')
    assert.match(index, /flushPostHog\(\)/, 'shutdown must flush PostHog')
    const shutdownBlock = index.slice(index.indexOf('async function shutdown'))
    assert.match(shutdownBlock, /flushPostHog/, 'flush must happen inside shutdown')
  })
})

describe('boot guards', () => {
  it('accepts any configured FALLBACK_CHAIN provider, not a hardcoded pair', () => {
    const index = read('index.ts')
    assert.match(index, /FALLBACK_CHAIN\.filter/, 'provider guard should derive from FALLBACK_CHAIN')
    assert.ok(
      !/!process\.env\.OPENAI_API_KEY\s*&&\s*!process\.env\.GROQ_API_KEY/.test(index),
      'guard must not name a hardcoded provider pair — a Gemini-only deploy is valid',
    )
  })

  it('logs whether the primary provider and observability keys are present', () => {
    const index = read('index.ts')
    for (const key of ['GEMINI_API_KEY', 'SENTRY_DSN', 'POSTHOG_API_KEY']) {
      assert.ok(index.includes(key), `${key} should appear in the startup key report`)
    }
  })
})

describe('Sentry wiring', () => {
  it('initialises only when a DSN is set, and scrubs noisy network errors', () => {
    const index = read('index.ts')
    assert.match(index, /if \(process\.env\.SENTRY_DSN\)/)
    assert.match(index, /ignoreErrors/)
  })

  it('samples traces down in production', () => {
    // Full tracing in production burns the free-tier quota within days.
    assert.match(read('index.ts'), /tracesSampleRate:[^\n]*production[^\n]*0\.1/)
  })
})
