// backend/src/lib/ai/tools.ts
// Provider-neutral tool-calling schema, shared by every LLM provider (OpenAI, Gemini, ...)
// so the 10 tool definitions and their safety limits are defined exactly once.
import { FINANCIAL } from '../config'

export interface NeutralToolParam {
  type: string
  description?: string
}

export interface NeutralTool {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, NeutralToolParam>
    required?: string[]
  }
}

export const NEUTRAL_TOOLS: NeutralTool[] = [
  {
    name: 'payment_plan_lookup',
    description: 'Look up verified payment plan milestones and cost sheet parameters for a project from the RealtyPals database (e.g. Booking %, Agreement %, Registry %, CLP/DP plans). Use whenever the user asks about payment plans, payment schedules, offers, or cost sheet breakdown for a specific project.',
    parameters: {
      type: 'object',
      properties: { project_name: { type: 'string', description: 'Name of the project, e.g. "Ivy County", "Elite X", "Godrej Woods"' } },
      required: ['project_name'],
    },
  },
  {
    name: 'builder_lookup',
    description: 'Look up VERIFIED facts about a builder from the RealtyPals database — founding year, delivered units, projects, RERA, CREDAI membership, awards. Use when the user asks about a builder\'s reputation, track record, or projects. Never invent builder stats; use this.',
    parameters: {
      type: 'object',
      properties: { name: { type: 'string', description: 'Builder name, e.g. "Godrej", "ATS", "Gaur"' } },
      required: ['name'],
    },
  },
  {
    name: 'web_search',
    description: 'Search the live web for current information: builder news/controversies, RERA status, market/price trends, metro expansion, school/hospital quality, or anything time-sensitive RealtyPals does not store. Returns source-attributed snippets. Cite sources in your answer.',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Specific search query, e.g. "ATS Noida delivery track record complaints 2025"' } },
      required: ['query'],
    },
  },
  {
    name: 'area_info',
    description: 'Get background information about a Noida/Greater Noida sector or area from Wikipedia. Use for "tell me about Sector 150", "how is this area".',
    parameters: {
      type: 'object',
      properties: {
        sector: { type: 'string', description: 'Sector or area name, e.g. "Sector 150"' },
        city: { type: 'string', description: 'City, e.g. "Noida"' },
      },
      required: ['sector', 'city'],
    },
  },
  {
    name: 'rera_check',
    description: 'Fetch live RERA registration details from the UP-RERA portal. Use to verify a project\'s RERA status when asked.',
    parameters: {
      type: 'object',
      properties: {
        rera_number: { type: 'string', description: 'RERA registration number e.g. UPRERAPRJ12345' },
        rera_url: { type: 'string', description: 'Direct RERA project URL if known' },
      },
    },
  },
  {
    name: 'commute',
    description: 'Calculate driving time and distance between two places in India. Use for "how far is X from Y", "commute to office/metro/airport".',
    parameters: {
      type: 'object',
      properties: {
        origin: { type: 'string', description: 'Start address/location' },
        destination: { type: 'string', description: 'Destination address/location' },
      },
      required: ['origin', 'destination'],
    },
  },
  {
    name: 'calculate_emi',
    description: 'Calculate monthly home-loan EMI, total payment and total interest. Use for EMI / affordability questions.',
    parameters: {
      type: 'object',
      properties: {
        principalCr: { type: 'number', description: 'Loan amount in crore' },
        annualRate: { type: 'number', description: `Annual interest rate %, defaults to ${FINANCIAL.EMI_RATE}` },
        tenureYears: { type: 'number', description: `Tenure in years, defaults to ${FINANCIAL.LOAN_TENURE_YEARS}` },
      },
      required: ['principalCr'],
    },
  },
  {
    name: 'calculate_stamp_duty',
    description: 'Calculate UP/Noida stamp duty + registration charges. Rate depends on buyer gender.',
    parameters: {
      type: 'object',
      properties: {
        priceCr: { type: 'number', description: 'Property price in crore' },
        gender: { type: 'string', description: 'male, female, or joint' },
      },
      required: ['priceCr'],
    },
  },
  {
    name: 'calculate_gst',
    description: 'Calculate GST on a property purchase. 5% for under-construction, 0% for ready-to-move, 1% for affordable.',
    parameters: {
      type: 'object',
      properties: {
        priceCr: { type: 'number', description: 'Property price in crore' },
        status: { type: 'string', description: 'under_construction or ready_to_move' },
        carpetSqm: { type: 'number', description: 'Carpet area in sqm (for affordable-housing check)' },
      },
      required: ['priceCr', 'status'],
    },
  },
  {
    name: 'project_competitors',
    description: 'Get competitor comparisons for a specific project. Use when the user asks how a project compares to others, or asks for alternatives.',
    parameters: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The internal project ID (must be from the properties data)' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'project_documents',
    description: 'Get text extracted from project brochures and documents. Use to find highly specific details like floor plans, specifications, or marketing claims not present in the main data block.',
    parameters: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The internal project ID (must be from the properties data)' },
      },
      required: ['project_id'],
    },
  },
]

export function toOpenAITools() {
  return NEUTRAL_TOOLS.map((t) => ({
    type: 'function' as const,
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }))
}

// Gemini's function-declaration shape is a near-identical JSON-schema subset —
// same {name, description, parameters} triple, just not wrapped in {type:'function', function:{...}}.
export function toGeminiTools() {
  return [{ functionDeclarations: NEUTRAL_TOOLS.map((t) => ({ name: t.name, description: t.description, parameters: t.parameters })) }]
}

// ── Tool safety — shared by every provider's tool-call loop ─────────────────────
// Max chars for string args passed to each tool. Prevents the model from passing
// arbitrarily large strings that waste tokens or reach external services.
const TOOL_ARG_LIMITS: Record<string, Record<string, number>> = {
  web_search:     { query: 200 },
  builder_lookup: { name: 100 },
  area_info:      { sector: 100, city: 50 },
  rera_check:     { rera_number: 50, rera_url: 200 },
  commute:        { origin: 200, destination: 200 },
}

export function validateToolArgs(name: string, args: Record<string, unknown>): Record<string, unknown> {
  const limits = TOOL_ARG_LIMITS[name]
  if (!limits) return args
  const validated = { ...args }
  for (const [field, maxLen] of Object.entries(limits)) {
    if (typeof validated[field] === 'string' && (validated[field] as string).length > maxLen) {
      console.warn('[tools] tool arg truncated', { tool: name, field, originalLength: (validated[field] as string).length })
      validated[field] = (validated[field] as string).slice(0, maxLen)
    }
  }
  return validated
}

// Cap tool result size before injecting into the message history.
// Prevents a large web search or RERA page crawl from blowing the context window.
const TOOL_RESULT_MAX_CHARS = 6000

export function capToolResult(result: unknown, toolName: string): string {
  const str = typeof result === 'string' ? result : JSON.stringify(result)
  if (str.length <= TOOL_RESULT_MAX_CHARS) return str
  console.warn('[tools] tool result truncated', { tool: toolName, originalLength: str.length })
  return str.slice(0, TOOL_RESULT_MAX_CHARS) + '…[truncated for token budget]'
}
