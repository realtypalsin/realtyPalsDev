// backend/src/lib/config.ts
// Centralized configuration module — env-overridable settings for AI, financial, discovery

export const MODELS = {
  MAIN: process.env.OPENAI_AZURE_MODEL || 'gpt-4o',
  FALLBACK: process.env.OPENAI_FALLBACK_MODEL || 'gpt-4o-mini',
  GEMINI_MAIN: process.env.GEMINI_MAIN_MODEL || 'gemini-3.6-flash',
  GEMINI_LITE: process.env.GEMINI_LITE_MODEL || 'gemini-3.5-flash-lite',
  OPENAI_AZURE: process.env.OPENAI_AZURE_MODEL || 'gpt-4o',
  OPENAI_FALLBACK: process.env.OPENAI_FALLBACK_MODEL || 'gpt-4o-mini',
  // llama-3.1-8b-instant and llama-3.3-70b-versatile were deprecated by Groq (June 2026,
  // free/developer tier). Groq's own migration guidance: gpt-oss-20b / gpt-oss-120b.
  GROQ_FAST: process.env.GROQ_FAST_MODEL || 'openai/gpt-oss-20b',
  GROQ_SMART: process.env.GROQ_SMART_MODEL || 'openai/gpt-oss-120b',
}

export const AI_CONFIG = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  AZURE_OPENAI_API_KEY: process.env.AZURE_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT || 'https://models.inference.ai.azure.com',
  AZURE_OPENAI_DEPLOYMENT: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o',
  GROQ_API_KEY: process.env.GROQ_API_KEY,
}

export const FINANCIAL = {
  EMI_RATE: parseFloat(process.env.EMI_RATE || '8.75'),
  LOAN_TENURE_YEARS: parseInt(process.env.LOAN_TENURE || '20', 10),
}

export const DISCOVERY = {
  DEFAULT_CITY: process.env.DEFAULT_CITY || 'Noida',
  SAFE_TOKEN_CEILING: parseInt(process.env.SAFE_TOKEN_CEILING || '2000', 10),
  MAX_TOKENS_RESPONSE: parseInt(process.env.MAX_TOKENS_RESPONSE || '1500', 10),
  MAX_TOKENS_ADVISORY: parseInt(process.env.MAX_TOKENS_ADVISORY || '400', 10),
  MAX_TOKENS_COMPARISON: parseInt(process.env.MAX_TOKENS_COMPARISON || '800', 10),
  CHIP_INVENTORY_CACHE_MINUTES: 10,
}

export const FEATURES = {
  ENABLE_GEMINI_FALLBACK: process.env.ENABLE_GEMINI_FALLBACK !== 'false', // Default: true
}

export const VALIDATION = {
  MIN_DISCOVERY_SCORE: 10, // Minimum score threshold for fallback results
}

export type ProviderType = 'cerebras' | 'groq' | 'mistral' | 'openai' | 'gemini'

export interface FallbackKeyConfig {
  provider: ProviderType
  envKey: string
  model: string
  supportsTools: boolean
  label: string
  /** Billing tier of the KEY, not the model. */
  tier?: 'paid' | 'free'
  /** Gemini API version for this leg. */
  apiVersion?: 'v1' | 'v1beta'
}

/**
 * Whether Gemini is allowed to call tools.
 *
 * Two switches used to control this independently and could disagree:
 * gemini.ts attaches the tool definitions when ENABLE_GEMINI_TOOLS === 'true',
 * while FALLBACK_CHAIN hardcoded supportsTools: false — and that flag is what
 * getBaseSystemPrompt(toolsEnabled) keys off. Setting the env var alone
 * therefore handed Gemini a tool catalogue together with a system prompt whose
 * NO LIVE LOOKUPS section states, verbatim, "You cannot call tools here."
 *
 * Deriving both from one constant makes that state unreachable. Default is
 * unchanged (off): Gemini is tier 1 and serves nearly all traffic, so turning
 * tools on there changes every response and wants a deliberate rollout.
 *
 * NOTE: while this is off, every tool-backed lookup — floor plans, price
 * history, cost sheets, amenities, builder records, RERA — is unreachable in
 * production, and the model answers from the NO LIVE LOOKUPS branch instead.
 */
export const GEMINI_TOOLS_ENABLED = process.env.ENABLE_GEMINI_TOOLS === 'true'

/**
 * Which Gemini keys are free-tier, by env-var name.
 *
 * A free key cannot hold a context cache, is limited per-minute rather than per
 * dollar, and gets no thinking budget and a tighter reply ceiling. Hardcoding
 * which key that is means topping up the OTHER key silently throttles it as
 * though it were free. Set GEMINI_FREE_TIER_KEYS to flip it without a deploy.
 */
const FREE_TIER_KEYS = new Set(
  (process.env.GEMINI_FREE_TIER_KEYS ?? 'GEMINI_API_KEY1,GEMINI_API_KEY2,GEMINI_API_KEY3')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
)

/** True when this env var names a key we know to be on the free tier. */
export const isFreeTierKey = (envKey: string): boolean => FREE_TIER_KEYS.has(envKey)

/**
 * The dead Azure host, as distinct from the current GitHub Models host.
 *
 * `models.inference.ai.azure.com` no longer resolves — probing it returns a
 * bare connection error. `models.github.ai/inference` is the live address and
 * currently answers `410 … scheduled retirement brownout`, which is a service
 * that may come back rather than an address that is wrong.
 *
 * So the two are treated differently: pointing at the dead address is a
 * misconfiguration worth rewriting, while a brownout is an outage the cooldown
 * already handles. Keys configured against the dead host are silently
 * redirected to the live one rather than dropped, because a leg that might
 * return is worth more at the end of the chain than no leg at all.
 */
const DEAD_AZURE_HOST = /models\.inference\.ai\.azure\.com/
const GITHUB_MODELS_HOST = 'https://models.github.ai/inference'

export const OPENAI_BASE_URL = (() => {
  const configured = process.env.OPENAI_BASE_URL?.trim()
  if (!configured) return undefined // the SDK default, api.openai.com
  if (DEAD_AZURE_HOST.test(configured)) {
    console.warn(
      `[CONFIG:CHAIN] OPENAI_BASE_URL points at ${configured}, which no longer resolves. ` +
      `Using ${GITHUB_MODELS_HOST} instead — set OPENAI_BASE_URL to that, or to a live ` +
      'Azure OpenAI deployment, to silence this.',
    )
    return GITHUB_MODELS_HOST
  }
  return configured
})()

export const FALLBACK_CHAIN: FallbackKeyConfig[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 1 — GEMINI. The only legs that can call a tool.
  // ═══════════════════════════════════════════════════════════════════════════
  // Every leg above the first tool-blind one can run sector_projects,
  // rera_check and the rest. That ordering is the difference between an answer
  // built from our rows and one a tool-blind model reasons out from memory,
  // which is where every fabrication in the 30 Aug corpus runs came from.
  //
  // Free keys lead. Flash-Lite rather than Flash on them: the free tier's
  // per-day request allowance is far higher on the lite model, so these legs
  // keep answering after a Flash-shaped one is spent for the day. The empty
  // replies that once made this ordering dangerous are fixed at the root —
  // fallbackChain forces thinkingBudget = 0 and a FREE_TIER_MAX_TOKENS ceiling
  // for any key isFreeTierKey() names.
  //
  // Probed 30 Aug: KEY1 and KEY2 answer, KEY3 is not set yet and is skipped
  // without cost, the billed KEY is out of prepay credit. It stays in place so
  // that a top-up is picked up without a deploy.
  { provider: 'gemini', envKey: 'GEMINI_API_KEY1', model: MODELS.GEMINI_LITE, supportsTools: GEMINI_TOOLS_ENABLED, label: 'Gemini 3.5 Flash Lite (free 1)' },
  { provider: 'gemini', envKey: 'GEMINI_API_KEY2', model: MODELS.GEMINI_LITE, supportsTools: GEMINI_TOOLS_ENABLED, label: 'Gemini 3.5 Flash Lite (free 2)' },
  { provider: 'gemini', envKey: 'GEMINI_API_KEY3', model: MODELS.GEMINI_LITE, supportsTools: GEMINI_TOOLS_ENABLED, label: 'Gemini 3.5 Flash Lite (free 3)' },
  { provider: 'gemini', envKey: 'GEMINI_API_KEY', model: MODELS.GEMINI_MAIN, supportsTools: GEMINI_TOOLS_ENABLED, label: 'Gemini 3.6 Flash (billed)' },
  { provider: 'gemini', envKey: 'GEMINI_API_KEY', model: MODELS.GEMINI_LITE, supportsTools: GEMINI_TOOLS_ENABLED, label: 'Gemini 3.5 Flash Lite (billed)' },

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 2 — OPENAI-COMPATIBLE, TOOL-CAPABLE.
  // ═══════════════════════════════════════════════════════════════════════════
  // These sit above Mistral and Groq because they can call tools, not because
  // they are faster. GitHub Models answers 410 during its retirement brownout
  // today, so in practice each of these fails once and then cools for an hour;
  // that is four cheap probes a day against the chance of a tool-capable
  // backstop returning. Point OPENAI_BASE_URL at any live OpenAI-compatible
  // deployment and they become real legs with no other change.
  { provider: 'openai', envKey: 'OPENAI_API_KEY', model: MODELS.MAIN, supportsTools: true, label: 'OpenAI-compatible (key 1)' },
  { provider: 'openai', envKey: 'OPENAI_API_KEY1', model: MODELS.MAIN, supportsTools: true, label: 'OpenAI-compatible (key 2)' },
  { provider: 'openai', envKey: 'OPENAI_API_KEY2', model: MODELS.MAIN, supportsTools: true, label: 'OpenAI-compatible (key 3)' },
  { provider: 'openai', envKey: 'OPENAI_API_KEY3', model: MODELS.MAIN, supportsTools: true, label: 'OpenAI-compatible (key 4)' },

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 3 — TOOL-BLIND. Prose only; toolBlindGuard checks whatever they write.
  // ═══════════════════════════════════════════════════════════════════════════
  // Both Mistral keys answer (probed 30 Aug). Two keys rather than one matters:
  // Mistral's free tier rate-limits per key, so the second is a full extra
  // allowance rather than a duplicate.
  { provider: 'mistral', envKey: 'MISTRAL_API_KEY', model: 'mistral-small-latest', supportsTools: false, label: 'Mistral Small (key 1)' },
  { provider: 'mistral', envKey: 'MISTRAL_API_KEY1', model: 'mistral-small-latest', supportsTools: false, label: 'Mistral Small (key 2)' },

  // Four keys, four separate per-minute allowances. Groq is the fastest leg in
  // the chain, so it carries the load when Gemini's free quota is spent.
  { provider: 'groq', envKey: 'GROQ_API_KEY', model: MODELS.GROQ_SMART, supportsTools: false, label: 'Groq gpt-oss-120b (key 1)' },
  { provider: 'groq', envKey: 'GROQ_API_KEY1', model: MODELS.GROQ_SMART, supportsTools: false, label: 'Groq gpt-oss-120b (key 2)' },
  { provider: 'groq', envKey: 'GROQ_API_KEY2', model: MODELS.GROQ_SMART, supportsTools: false, label: 'Groq gpt-oss-120b (key 3)' },
  { provider: 'groq', envKey: 'GROQ_API_KEY3', model: MODELS.GROQ_SMART, supportsTools: false, label: 'Groq gpt-oss-120b (key 4)' },

  // Last: both keys are unpaid (402, probed 30 Aug). One probe an hour each.
  { provider: 'cerebras', envKey: 'CEREBRAS_API_KEY', model: 'gpt-oss-120b', supportsTools: false, label: 'Cerebras gpt-oss-120b (key 1)' },
  { provider: 'cerebras', envKey: 'CEREBRAS_API_KEY1', model: 'gpt-oss-120b', supportsTools: false, label: 'Cerebras gpt-oss-120b (key 2)' },
]
