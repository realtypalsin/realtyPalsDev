// backend/src/lib/config.ts
// Centralized configuration module — env-overridable settings for AI, financial, discovery

export const MODELS = {
  MAIN: process.env.AI_MAIN_MODEL || 'gpt-4o',
  FALLBACK: process.env.AI_FALLBACK_MODEL || 'gpt-4o-mini',
  GROQ_FAST: process.env.GROQ_FAST_MODEL || 'llama-3.1-8b-instant',
  GROQ_SMART: process.env.GROQ_SMART_MODEL || 'llama-3.3-70b-versatile',
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
