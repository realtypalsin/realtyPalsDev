// backend/scripts/verify-chain.ts
//
// Does every leg of the fallback chain actually answer?
//
//   npm run verify:chain          # one tiny call per leg
//   npm run verify:chain --dry    # configuration only, no calls
//
// The chain is the difference between a slow answer and no answer. On 29 Aug a
// corpus run returned "our AI services are out of service" on 25% of turns, and
// the log said 429. Two separate faults were behind it, and neither was a rate
// limit: the billed Gemini key had no credits left, and all four OpenAI legs —
// the backstop the chain is supposed to end on — were being dropped at startup
// because OPENAI_BASE_URL still pointed at the retired GitHub Models host.
//
// A chain that silently loses its last resort looks identical to a healthy one
// until the day everything above it fails. This makes each leg prove itself.

// dotenv must run before `config.ts` is evaluated, and a plain `import` would
// be hoisted above it — which is exactly what happened on the first run of this
// script: OPENAI_BASE_URL was still unset when the chain was built, so four
// OpenAI legs appeared here that the real server drops at startup, and the
// report described a chain the product does not have.
import { config } from 'dotenv'
config()

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { FALLBACK_CHAIN, isFreeTierKey } = require('../src/lib/config') as typeof import('../src/lib/config')

const DRY = process.argv.includes('--dry')
const PROMPT = 'Reply with the single word: ok'

interface LegResult {
  label: string
  provider: string
  envKey: string
  model: string
  status: 'ok' | 'no_key' | 'failed'
  ms?: number
  detail?: string
}

async function callGemini(key: string, model: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: PROMPT }] }],
        generationConfig: { maxOutputTokens: 8, temperature: 0 },
      }),
    },
  )
  if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 130)}`)
  return 'ok'
}

/** Mistral, Cerebras, Groq and OpenAI all speak the OpenAI chat schema. */
async function callOpenAICompatible(base: string, key: string, model: string): Promise<string> {
  const res = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: PROMPT }], max_tokens: 8, temperature: 0 }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 130)}`)
  return 'ok'
}

const BASE: Record<string, string> = {
  mistral: 'https://api.mistral.ai/v1',
  cerebras: 'https://api.cerebras.ai/v1',
  groq: 'https://api.groq.com/openai/v1',
  openai: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
}

async function probe(leg: (typeof FALLBACK_CHAIN)[number]): Promise<LegResult> {
  const base = { label: leg.label, provider: leg.provider, envKey: leg.envKey, model: leg.model }
  const key = process.env[leg.envKey]
  if (!key) return { ...base, status: 'no_key' }
  if (DRY) return { ...base, status: 'ok', detail: 'key present (not called)' }

  const t0 = Date.now()
  try {
    if (leg.provider === 'gemini') await callGemini(key, leg.model)
    else await callOpenAICompatible(BASE[leg.provider] ?? BASE.openai, key, leg.model)
    return { ...base, status: 'ok', ms: Date.now() - t0 }
  } catch (e) {
    return { ...base, status: 'failed', ms: Date.now() - t0, detail: e instanceof Error ? e.message : String(e) }
  }
}

async function main() {
  console.log(`\n═══ fallback chain — ${FALLBACK_CHAIN.length} legs${DRY ? ' (dry run)' : ''} ═══\n`)

  // The chain is built at import time, so a leg dropped by configuration never
  // appears here. Say so explicitly rather than letting a shorter list pass for
  // a healthy one.
  const openaiLegs = FALLBACK_CHAIN.filter((l) => l.provider === 'openai').length
  if (openaiLegs === 0) {
    console.log('  ⚠ NO OPENAI LEGS IN THE CHAIN.')
    console.log(`    OPENAI_BASE_URL = ${process.env.OPENAI_BASE_URL || '(unset)'}`)
    console.log('    config.ts drops every OpenAI leg when this points at the retired')
    console.log('    GitHub Models host. The chain has no final backstop: when Gemini,')
    console.log('    Mistral, Cerebras and Groq are all spent, the turn returns an error.')
    console.log('    Fix: point OPENAI_BASE_URL at a live Azure OpenAI deployment, or')
    console.log('    unset it to use api.openai.com with a standard key.\n')
  }

  const results: LegResult[] = []
  for (const leg of FALLBACK_CHAIN) {
    const r = await probe(leg)
    results.push(r)
    const mark = r.status === 'ok' ? '✓' : r.status === 'no_key' ? '·' : '✗'
    const tier = isFreeTierKey(r.envKey) ? ' [free tier]' : ''
    console.log(`  ${mark} ${String(results.length).padStart(2)}. ${r.label.padEnd(38)} ${r.envKey.padEnd(18)}${r.ms ? String(r.ms).padStart(6) + 'ms' : '      '}${tier}`)
    if (r.detail && r.status !== 'ok') console.log(`       ${r.detail}`)
  }

  const ok = results.filter((r) => r.status === 'ok').length
  const failed = results.filter((r) => r.status === 'failed')
  const noKey = results.filter((r) => r.status === 'no_key').length

  console.log(`\n  answering ${ok} / ${results.length}   failed ${failed.length}   no key ${noKey}`)
  const providersUp = new Set(results.filter((r) => r.status === 'ok').map((r) => r.provider))
  console.log(`  distinct providers answering: ${providersUp.size} (${[...providersUp].join(', ') || 'none'})\n`)

  // One provider answering is not a chain, it is a single point of failure that
  // happens to have spares.
  if (providersUp.size < 2 && !DRY) {
    console.log('  ⚠ fewer than two providers are answering — the chain cannot survive one outage\n')
  }
  process.exit(failed.length > 0 || providersUp.size < 2 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
