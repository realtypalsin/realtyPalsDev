// backend/src/lib/config.ts
// Centralized configuration module — env-overridable settings for AI, financial, discovery

export const MODELS = {
  MAIN: process.env.OPENAI_AZURE_MODEL || 'gpt-4o',
  FALLBACK: process.env.OPENAI_FALLBACK_MODEL || 'gpt-4o-mini',
  GEMINI_MAIN: process.env.GEMINI_MAIN_MODEL || 'gemini-flash-latest',
  GEMINI_LITE: process.env.GEMINI_LITE_MODEL || 'gemini-flash-latest',
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
}

export const FALLBACK_CHAIN: FallbackKeyConfig[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 1: GOOGLE GEMINI 3.5 FLASH (Primary Premium Paid Provider)
  // ═══════════════════════════════════════════════════════════════════════════
  { provider: 'gemini', envKey: 'GEMINI_API_KEY', model: MODELS.GEMINI_MAIN, supportsTools: false, label: 'Google Gemini 3.5 Flash (Primary)' },

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 2: MISTRAL & GROQ (High-Speed Backup Chain)
  // ═══════════════════════════════════════════════════════════════════════════
  { provider: 'mistral', envKey: 'MISTRAL_API_KEY', model: 'mistral-small-latest', supportsTools: false, label: 'Mistral Small (Verified)' },
  { provider: 'groq', envKey: 'GROQ_API_KEY', model: 'llama-3.3-70b-versatile', supportsTools: false, label: 'Groq 70B (Key 1)' },
  { provider: 'groq', envKey: 'GROQ_API_KEY1', model: 'llama-3.3-70b-versatile', supportsTools: false, label: 'Groq 70B (Key 2)' },
  { provider: 'groq', envKey: 'GROQ_API_KEY2', model: 'llama-3.3-70b-versatile', supportsTools: false, label: 'Groq 70B (Key 3)' },

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 3: OPENAI & CEREBRAS (Failover Resilience Layer)
  // ═══════════════════════════════════════════════════════════════════════════
  { provider: 'openai', envKey: 'OPENAI_API_KEY', model: MODELS.MAIN, supportsTools: true, label: 'GitHub Models (Key 1)' },
  { provider: 'openai', envKey: 'OPENAI_API_KEY1', model: MODELS.MAIN, supportsTools: true, label: 'GitHub Models (Key 2)' },
  { provider: 'cerebras', envKey: 'CEREBRAS_API_KEY', model: 'llama3.3-70b', supportsTools: false, label: 'Cerebras Llama 70B (Key 1)' },
  { provider: 'cerebras', envKey: 'CEREBRAS_API_KEY1', model: 'llama3.3-70b', supportsTools: false, label: 'Cerebras Llama 70B (Key 2)' },
]
