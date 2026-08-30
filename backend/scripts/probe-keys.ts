// backend/scripts/probe-keys.ts
//
// Sends EXACTLY ONE tiny request per key, sequentially, and reports what each
// one is worth. Nothing here retries, and nothing runs in parallel: a probe
// that spams a free tier turns a healthy key into a rate-limited one and then
// reports it as broken.
//
//   npx tsx scripts/probe-keys.ts              # every key in .env
//   npx tsx scripts/probe-keys.ts --openai     # one provider only
//
// Run it after rotating keys, before trusting the fallback chain.
import 'dotenv/config'
import { GoogleGenAI } from '@google/genai'
import OpenAI from 'openai'
import { MODELS } from '../src/lib/config'

type Verdict = 'ok' | 'rate_limited' | 'no_credit' | 'bad_key' | 'bad_model' | 'no_key' | 'error'

interface Probe {
  provider: string
  envKey: string
  model: string
  baseURL?: string
}

interface Result extends Probe {
  verdict: Verdict
  ms: number
  detail: string
}

/** The GitHub Models host moved; both are probed so the right one can be kept. */
const GITHUB_HOSTS = [
  'https://models.github.ai/inference',
  'https://models.inference.ai.azure.com',
]

const PROBES: Probe[] = [
  { provider: 'gemini', envKey: 'GEMINI_API_KEY', model: MODELS.GEMINI_MAIN },
  { provider: 'gemini', envKey: 'GEMINI_API_KEY1', model: MODELS.GEMINI_LITE },
  { provider: 'gemini', envKey: 'GEMINI_API_KEY2', model: MODELS.GEMINI_LITE },
  { provider: 'gemini', envKey: 'GEMINI_API_KEY3', model: MODELS.GEMINI_LITE },
  { provider: 'mistral', envKey: 'MISTRAL_API_KEY', model: 'mistral-small-latest', baseURL: 'https://api.mistral.ai/v1' },
  { provider: 'mistral', envKey: 'MISTRAL_API_KEY1', model: 'mistral-small-latest', baseURL: 'https://api.mistral.ai/v1' },
  { provider: 'cerebras', envKey: 'CEREBRAS_API_KEY', model: 'gpt-oss-120b', baseURL: 'https://api.cerebras.ai/v1' },
  { provider: 'cerebras', envKey: 'CEREBRAS_API_KEY1', model: 'gpt-oss-120b', baseURL: 'https://api.cerebras.ai/v1' },
  { provider: 'groq', envKey: 'GROQ_API_KEY', model: MODELS.GROQ_SMART, baseURL: 'https://api.groq.com/openai/v1' },
  { provider: 'groq', envKey: 'GROQ_API_KEY1', model: MODELS.GROQ_SMART, baseURL: 'https://api.groq.com/openai/v1' },
  { provider: 'groq', envKey: 'GROQ_API_KEY2', model: MODELS.GROQ_SMART, baseURL: 'https://api.groq.com/openai/v1' },
  { provider: 'groq', envKey: 'GROQ_API_KEY3', model: MODELS.GROQ_SMART, baseURL: 'https://api.groq.com/openai/v1' },
]

/** Classifies a provider failure into something actionable. */
function classify(err: unknown): { verdict: Verdict; detail: string } {
  const raw = err instanceof Error ? err.message : String(err ?? '')
  const m = raw.toLowerCase()
  const short = raw.replace(/\s+/g, ' ').slice(0, 110)
  if (m.includes('429') || m.includes('rate limit') || m.includes('resource_exhausted')) {
    if (m.includes('credit') || m.includes('prepay') || m.includes('billing')) {
      return { verdict: 'no_credit', detail: short }
    }
    return { verdict: 'rate_limited', detail: short }
  }
  if (m.includes('402') || m.includes('payment')) return { verdict: 'no_credit', detail: short }
  if (m.includes('401') || m.includes('403') || m.includes('invalid') || m.includes('unauthor') || m.includes('permission')) {
    return { verdict: 'bad_key', detail: short }
  }
  if (m.includes('404') || m.includes('model') && m.includes('exist')) return { verdict: 'bad_model', detail: short }
  return { verdict: 'error', detail: short }
}

const PROMPT = 'Reply with the single word: ok'

async function probeGemini(p: Probe, key: string): Promise<Result> {
  const t0 = Date.now()
  try {
    const client = new GoogleGenAI({ apiKey: key })
    const res = await client.models.generateContent({
      model: p.model,
      contents: [{ role: 'user', parts: [{ text: PROMPT }] }],
      // No thinkingConfig: the lite models reject it with a bare
      // 400 INVALID_ARGUMENT, which a probe then reports as a dead key. The
      // first version of this script did exactly that and condemned two
      // working keys. Budget is controlled by maxOutputTokens alone here.
      config: { maxOutputTokens: 64, temperature: 0 },
    })
    const text = (res.text ?? '').trim()
    return { ...p, verdict: text ? 'ok' : 'error', ms: Date.now() - t0, detail: text || 'answered with no text' }
  } catch (err) {
    return { ...p, ...classify(err), ms: Date.now() - t0 }
  }
}

async function probeOpenAICompatible(p: Probe, key: string): Promise<Result> {
  const t0 = Date.now()
  try {
    const client = new OpenAI({ apiKey: key, baseURL: p.baseURL })
    const res = await client.chat.completions.create({
      model: p.model,
      messages: [{ role: 'user', content: PROMPT }],
      // 256, not 16. gpt-oss-120b on Groq is a reasoning model: it spends its
      // budget thinking before it emits a visible token, so a tight ceiling
      // returns an empty string and the probe calls a working key broken. The
      // first version of this script did that to all four Groq keys.
      max_tokens: 256,
      temperature: 0,
    })
    const choice = res.choices[0]?.message as { content?: string | null; reasoning?: string | null } | undefined
    // Groq returns the visible answer in `content`, but a reply that is all
    // reasoning still proves the key works.
    const text = (choice?.content ?? choice?.reasoning ?? '').trim()
    return { ...p, verdict: text ? 'ok' : 'error', ms: Date.now() - t0, detail: text || 'answered with no text' }
  } catch (err) {
    return { ...p, ...classify(err), ms: Date.now() - t0 }
  }
}

const ICON: Record<Verdict, string> = {
  ok: '  ok  ', rate_limited: ' 429  ', no_credit: ' PAID ',
  bad_key: ' KEY  ', bad_model: 'MODEL ', no_key: ' --   ', error: ' ERR  ',
}

async function main() {
  const only = process.argv.find(a => a.startsWith('--'))?.slice(2)

  // OpenAI probes are built here so every configured key is tried against
  // whichever GitHub Models host answers, rather than the one in .env alone.
  const openaiKeys = ['OPENAI_API_KEY', 'OPENAI_API_KEY1', 'OPENAI_API_KEY2', 'OPENAI_API_KEY3']
    .filter(k => process.env[k])
  const envHost = process.env.OPENAI_BASE_URL
  const hosts = envHost && !GITHUB_HOSTS.includes(envHost) ? [envHost, ...GITHUB_HOSTS] : GITHUB_HOSTS

  const probes = [...PROBES]
  // Only the FIRST OpenAI key is tried against each candidate host — that is
  // enough to learn which host is alive without spending three more keys on a
  // host that is dead. The rest are probed against the winner.
  for (const host of hosts) {
    if (openaiKeys[0]) probes.push({ provider: 'openai', envKey: openaiKeys[0], model: MODELS.MAIN, baseURL: host })
  }

  const selected = only ? probes.filter(p => p.provider === only) : probes
  const results: Result[] = []

  console.log(`probing ${selected.length} keys, one request each, sequentially\n`)

  for (const p of selected) {
    const key = process.env[p.envKey]
    if (!key) {
      results.push({ ...p, verdict: 'no_key', ms: 0, detail: 'not set in .env' })
      continue
    }
    const r = p.provider === 'gemini' ? await probeGemini(p, key) : await probeOpenAICompatible(p, key)
    results.push(r)
    const where = r.baseURL ? `  ${new URL(r.baseURL).host}` : ''
    console.log(
      `[${ICON[r.verdict]}] ${r.envKey.padEnd(18)} ${r.model.padEnd(22)} ${String(r.ms).padStart(5)}ms${where}` +
      (r.verdict === 'ok' ? '' : `\n            ${r.detail}`),
    )
  }

  // A live OpenAI host means the remaining keys are worth probing too.
  const liveHost = results.find(r => r.provider === 'openai' && r.verdict === 'ok')?.baseURL
  if (liveHost && openaiKeys.length > 1 && (!only || only === 'openai')) {
    console.log(`\n  ${new URL(liveHost).host} answers — probing the remaining OpenAI keys\n`)
    for (const envKey of openaiKeys.slice(1)) {
      const r = await probeOpenAICompatible(
        { provider: 'openai', envKey, model: MODELS.MAIN, baseURL: liveHost },
        process.env[envKey]!,
      )
      results.push(r)
      console.log(`[${ICON[r.verdict]}] ${r.envKey.padEnd(18)} ${r.model.padEnd(22)} ${String(r.ms).padStart(5)}ms` +
        (r.verdict === 'ok' ? '' : `\n            ${r.detail}`))
    }
  }

  const ok = results.filter(r => r.verdict === 'ok')
  const byProvider = new Set(ok.map(r => r.provider))
  console.log(`\n─────────────────────────────────────────────`)
  console.log(`  answering ${ok.length} / ${results.length} keys · ${byProvider.size} providers: ${[...byProvider].join(', ') || 'none'}`)
  for (const v of ['rate_limited', 'no_credit', 'bad_key', 'bad_model', 'error', 'no_key'] as Verdict[]) {
    const hit = results.filter(r => r.verdict === v)
    if (hit.length) console.log(`  ${v.padEnd(13)} ${hit.map(r => r.envKey).join(', ')}`)
  }
  if (liveHost) console.log(`  OPENAI_BASE_URL that answers: ${liveHost}`)
  process.exit(ok.length ? 0 : 1)
}

void main()
