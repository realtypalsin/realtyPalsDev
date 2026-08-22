import { prisma } from '../db'

// USD per 1M tokens. Update when provider pricing changes.
const PRICE: Record<string, { in: number; out: number }> = {
  'llama-3.1-8b-instant': { in: 0.05, out: 0.08 }, // deprecated by Groq June 2026, kept for historical usage rows
  'llama-3.3-70b-versatile': { in: 0.59, out: 0.79 }, // deprecated by Groq June 2026, kept for historical usage rows
  'openai/gpt-oss-20b': { in: 0.075, out: 0.3 }, // Groq — replaces llama-3.1-8b-instant
  'openai/gpt-oss-120b': { in: 0.15, out: 0.6 }, // Groq — replaces llama-3.3-70b-versatile
  'gpt-4o': { in: 2.5, out: 10.0 },
  'gpt-4o-mini': { in: 0.15, out: 0.6 },
  'claude-3-5-sonnet-20241022': { in: 3.0, out: 15.0 },
  'gemini-3.6-flash': { in: 0.075, out: 0.3 },
  'gemini-3.5-flash': { in: 0.075, out: 0.3 },
  'gemini-3.5-flash-lite': { in: 0.0375, out: 0.15 },
  'gemini-2.0-flash': { in: 0.075, out: 0.3 },
  'gemini-2.5-flash': { in: 0.075, out: 0.3 },
  'gemini-2.5-flash-lite': { in: 0.0375, out: 0.15 },
  'gemini-flash-latest': { in: 0.075, out: 0.3 },
  'mistral-small-latest': { in: 0.14, out: 0.42 },
  'llama3.3-70b': { in: 0.5, out: 1.5 },
}

export async function recordUsage(args: {
  provider: string
  model: string
  promptTokens: number
  completionTokens: number
  endpoint: string
  userId?: string | null
  sessionId?: string | null
}): Promise<void> {
  const p = PRICE[args.model] ?? { in: 0, out: 0 }
  const cost = (args.promptTokens * p.in + args.completionTokens * p.out) / 1_000_000
  try {
    const aiUsageEventModel = (prisma as any).aiUsageEvent
    if (!aiUsageEventModel) return
    await aiUsageEventModel.create({
      data: {
        user_id: args.userId ?? null,
        session_id: args.sessionId ?? null,
        provider: args.provider,
        model: args.model,
        prompt_tokens: args.promptTokens,
        completion_tokens: args.completionTokens,
        cost_usd: cost,
        endpoint: args.endpoint,
      },
    })
  } catch (err) {
    // Never let telemetry break a chat response.
    console.error('[cost] recordUsage failed:', err instanceof Error ? err.message : err)
  }
}

const DAILY_USER_LIMIT_USD = Number(process.env.DAILY_USER_LIMIT_USD ?? '0.50')

export async function isOverDailyBudget(userId: string | null): Promise<boolean> {
  if (!userId) return false // anonymous users are already IP-rate-limited globally
  const since = new Date()
  since.setHours(0, 0, 0, 0)
  try {
    const aiUsageEventModel = (prisma as any).aiUsageEvent
    if (!aiUsageEventModel) return false
    const agg = await aiUsageEventModel.aggregate({
      _sum: { cost_usd: true },
      where: { user_id: userId, created_at: { gte: since } },
    })
    const spent = Number(agg?._sum?.cost_usd ?? 0)
    return spent >= DAILY_USER_LIMIT_USD
  } catch (err) {
    console.error('[cost] isOverDailyBudget failed:', err instanceof Error ? err.message : err)
    return false
  }
}
