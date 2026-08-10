// backend/src/lib/config.ts
// Centralized configuration module — env-overridable settings for AI, financial, discovery

export const MODELS = {
  MAIN: process.env.OPENAI_AZURE_MODEL || 'gpt-4o',
  FALLBACK: process.env.OPENAI_FALLBACK_MODEL || 'gpt-4o-mini',
  GEMINI_MAIN: process.env.GEMINI_MAIN_MODEL || 'gemini-1.5-flash',
  GEMINI_LITE: process.env.GEMINI_LITE_MODEL || 'gemini-1.5-flash',
  OPENAI_AZURE: process.env.OPENAI_AZURE_MODEL || 'gpt-4o',
  OPENAI_FALLBACK: process.env.OPENAI_FALLBACK_MODEL || 'gpt-4o-mini',
  GROQ_FAST: process.env.GROQ_FAST_MODEL || 'llama-3.1-8b-instant',
  GROQ_SMART: process.env.GROQ_SMART_MODEL || 'llama-3.3-70b-versatile',
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
  CHIP_INVENTORY_CACHE_MINUTES: 10,
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
}

export const FALLBACK_CHAIN: FallbackKeyConfig[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 1: CEREBRAS (Quality Pyramid)
  // 1M free tokens/day, 2000 tok/sec. Start small, escalate to reasoning.
  // Data flows unchanged through all 4 models if prior fails pre-first-token.
  // ═══════════════════════════════════════════════════════════════════════════
  { provider: 'cerebras', envKey: 'CEREBRAS_API_KEY', model: 'qwen-3-32b', supportsTools: false, label: 'Cerebras Qwen 32B (fast)' },
  { provider: 'cerebras', envKey: 'CEREBRAS_API_KEY', model: 'llama-3.3-70b', supportsTools: false, label: 'Cerebras Llama 70B (balanced)' },
  { provider: 'cerebras', envKey: 'CEREBRAS_API_KEY', model: 'llama-4-scout-17b-16e-instruct', supportsTools: false, label: 'Cerebras Scout (reasoning)' },
  { provider: 'cerebras', envKey: 'CEREBRAS_API_KEY', model: 'gpt-oss-120b', supportsTools: false, label: 'Cerebras GPT-OSS 120B (reasoning+)' },

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 2: MISTRAL (Lower latency fallback)
  // 180K free tokens/day. Minimal rate limit friction. Fast enough for chip gen.
  // ═══════════════════════════════════════════════════════════════════════════
  { provider: 'mistral', envKey: 'MISTRAL_API_KEY', model: 'mistral-small-latest', supportsTools: false, label: 'Mistral Small (fast)' },
  { provider: 'mistral', envKey: 'MISTRAL_API_KEY', model: 'magistral-small-latest', supportsTools: false, label: 'Mistral Magistral (enhanced)' },

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 3: GROQ (High throughput, multi-key rotation)
  // Aggressive rotation across 4 keys for quota distribution.
  // Lower latency but tighter per-key rate limits.
  // ═══════════════════════════════════════════════════════════════════════════
  { provider: 'groq', envKey: 'GROQ_API_KEY', model: 'llama-3.3-70b-versatile', supportsTools: false, label: 'Groq (Key 1)' },
  { provider: 'groq', envKey: 'GROQ_API_KEY1', model: 'llama-3.3-70b-versatile', supportsTools: false, label: 'Groq (Key 2)' },
  { provider: 'groq', envKey: 'GROQ_API_KEY2', model: 'llama-3.3-70b-versatile', supportsTools: false, label: 'Groq (Key 3)' },
  { provider: 'groq', envKey: 'GROQ_API_KEY3', model: 'llama-3.3-70b-versatile', supportsTools: false, label: 'Groq (Key 4)' },

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 4: OPENAI / GITHUB MODELS (Tool support, fallback to premium)
  // Azure OpenAI with 4-key rotation. Most restrictive quotas.
  // Last resort before database fallback.
  // ═══════════════════════════════════════════════════════════════════════════
  { provider: 'openai', envKey: 'OPENAI_API_KEY', model: MODELS.MAIN, supportsTools: true, label: 'GitHub Models (Key 1)' },
  { provider: 'openai', envKey: 'OPENAI_API_KEY1', model: MODELS.MAIN, supportsTools: true, label: 'GitHub Models (Key 2)' },
  { provider: 'openai', envKey: 'OPENAI_API_KEY2', model: MODELS.MAIN, supportsTools: true, label: 'GitHub Models (Key 3)' },
  { provider: 'openai', envKey: 'OPENAI_API_KEY3', model: MODELS.MAIN, supportsTools: true, label: 'GitHub Models (Key 4)' },

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 5: GEMINI (Last resort, restrictive quotas)
  // 50K/day. Most aggressive rate limiting.
  // ═══════════════════════════════════════════════════════════════════════════
  { provider: 'gemini', envKey: 'GEMINI_API_KEY', model: MODELS.GEMINI_MAIN, supportsTools: true, label: 'Google Gemini (50K/day)' },
]

