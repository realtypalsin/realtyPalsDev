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

/** True when OPENAI_BASE_URL still points at GitHub Models, which is retired. */
const isRetiredGitHubModels = /models\.(inference\.ai\.azure|github\.ai)/.test(
  process.env.OPENAI_BASE_URL ?? '',
)

export const FALLBACK_CHAIN: FallbackKeyConfig[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 1: GOOGLE GEMINI (Primary Premium Paid Provider — Max Priority)
  // ═══════════════════════════════════════════════════════════════════════════
  { provider: 'gemini', envKey: 'GEMINI_API_KEY', model: MODELS.GEMINI_MAIN, supportsTools: GEMINI_TOOLS_ENABLED, label: 'Google Gemini 3.6 Flash (Key 1)' },
  // The lite tier on the SAME billed key comes before the second key.
  { provider: 'gemini', envKey: 'GEMINI_API_KEY', model: MODELS.GEMINI_LITE, supportsTools: GEMINI_TOOLS_ENABLED, label: 'Google Gemini 3.5 Flash Lite (Backup)' },
  // Flash-Lite rather than Flash on the free key: the free tier's per-day
  // request allowance is far higher on the lite model, so this leg keeps
  // answering after a Flash-shaped one would be spent for the day.
  { provider: 'gemini', envKey: 'GEMINI_API_KEY1', model: MODELS.GEMINI_LITE, supportsTools: GEMINI_TOOLS_ENABLED, label: 'Google Gemini 3.5 Flash Lite (Free key)', tier: 'free' },

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 2: MISTRAL & CEREBRAS (High-Speed Failover Layer)
  // ═══════════════════════════════════════════════════════════════════════════
  { provider: 'mistral', envKey: 'MISTRAL_API_KEY', model: 'mistral-small-latest', supportsTools: false, label: 'Mistral Small' },
  // `llama-3.3-70b` was returning 404 "Model does not exist or you do not have
  { provider: 'cerebras', envKey: 'CEREBRAS_API_KEY', model: 'gpt-oss-120b', supportsTools: false, label: 'Cerebras gpt-oss-120b (Key 1)' },
  { provider: 'cerebras', envKey: 'CEREBRAS_API_KEY1', model: 'gpt-oss-120b', supportsTools: false, label: 'Cerebras gpt-oss-120b (Key 2)' },

  // ═══════════════════════════════════════════════════════════════════════════
  { provider: 'groq', envKey: 'GROQ_API_KEY', model: MODELS.GROQ_SMART, supportsTools: false, label: 'Groq gpt-oss-120b (Key 1)' },
  { provider: 'groq', envKey: 'GROQ_API_KEY1', model: MODELS.GROQ_SMART, supportsTools: false, label: 'Groq gpt-oss-120b (Key 2)' },
  { provider: 'groq', envKey: 'GROQ_API_KEY2', model: MODELS.GROQ_SMART, supportsTools: false, label: 'Groq gpt-oss-120b (Key 3)' },
  { provider: 'groq', envKey: 'GROQ_API_KEY3', model: MODELS.GROQ_SMART, supportsTools: false, label: 'Groq gpt-oss-120b (Key 4)' },
  // GitHub Models (models.inference.ai.azure.com) is being retired — the endpoint
  ...(isRetiredGitHubModels
    ? []
    : ([
        { provider: 'openai', envKey: 'OPENAI_API_KEY', model: MODELS.MAIN, supportsTools: true, label: 'OpenAI (Key 1)' },
        { provider: 'openai', envKey: 'OPENAI_API_KEY1', model: MODELS.MAIN, supportsTools: true, label: 'OpenAI (Key 2)' },
        { provider: 'openai', envKey: 'OPENAI_API_KEY2', model: MODELS.MAIN, supportsTools: true, label: 'OpenAI (Key 3)' },
        { provider: 'openai', envKey: 'OPENAI_API_KEY3', model: MODELS.MAIN, supportsTools: true, label: 'OpenAI (Key 4)' },
      ] as FallbackKeyConfig[])),
]
