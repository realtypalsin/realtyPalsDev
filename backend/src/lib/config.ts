// backend/src/lib/config.ts
// Centralized configuration module — env-overridable settings for AI, financial, discovery

export const MODELS = {
  MAIN: process.env.OPENAI_AZURE_MODEL || 'gpt-4o',
  FALLBACK: process.env.OPENAI_FALLBACK_MODEL || 'gpt-4o-mini',
  GEMINI_MAIN: process.env.GEMINI_MAIN_MODEL || 'gemini-1.5-flash',
  GEMINI_LITE: process.env.GEMINI_LITE_MODEL || 'gemini-1.5-flash-lite',
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

export type ProviderType = 'gemini' | 'openai' | 'groq'

export interface FallbackKeyConfig {
  provider: ProviderType
  envKey: string
  model: string
  supportsTools: boolean
  label: string
}

export const FALLBACK_CHAIN: FallbackKeyConfig[] = [
  // { provider: 'gemini', envKey: 'GEMINI_API_KEY', model: MODELS.GEMINI_MAIN, supportsTools: true, label: 'Gemini (Primary)' },
  { provider: 'openai', envKey: 'OPENAI_API_KEY', model: MODELS.MAIN, supportsTools: true, label: 'GitHub Models (Primary)' },
  { provider: 'groq', envKey: 'GROQ_API_KEY', model: MODELS.GROQ_SMART, supportsTools: false, label: 'Groq (Primary)' },
  { provider: 'openai', envKey: 'OPENAI_API_KEY1', model: MODELS.MAIN, supportsTools: true, label: 'GitHub Models (Key 1)' },
  { provider: 'groq', envKey: 'GROQ_API_KEY1', model: MODELS.GROQ_SMART, supportsTools: false, label: 'Groq (Key 1)' },
  { provider: 'openai', envKey: 'OPENAI_API_KEY2', model: MODELS.MAIN, supportsTools: true, label: 'GitHub Models (Key 2)' },
  { provider: 'groq', envKey: 'GROQ_API_KEY2', model: MODELS.GROQ_SMART, supportsTools: false, label: 'Groq (Key 2)' },
  { provider: 'openai', envKey: 'OPENAI_API_KEY3', model: MODELS.MAIN, supportsTools: true, label: 'GitHub Models (Key 3)' },
  { provider: 'groq', envKey: 'GROQ_API_KEY3', model: MODELS.GROQ_SMART, supportsTools: false, label: 'Groq (Key 3)' },
]

