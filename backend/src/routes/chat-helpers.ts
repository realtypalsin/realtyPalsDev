// backend/src/routes/chat-helpers.ts
import { Response } from 'express'
import { Prisma } from '@prisma/client'
import type { Intent, ScoredProject } from '../lib/discovery'
import { matchesProjectName, isCityLevel, getIntentState } from '../lib/discovery'
import { estimateTokensReal } from '../lib/ai/tokenizer'
import { DEFAULT_CITY } from '../lib/config/cities'
import { getChipInventory } from '../lib/discovery/chipInventory'
import { computeConversationState } from '../lib/discovery/conversationEngine'
import { hydrateFromDb } from '../lib/discovery/chipDedup'

// ── Fix 8: order-independent array comparison
export function sameSet(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) return false
  const sa = [...a].map(String).sort()
  const sb = [...b].map(String).sort()
  return sa.every((v, i) => v === sb[i])
}

// ── Fix 12: structured routing observability
export function logRouting(
  event:
    | 'CACHE_REUSED' | 'CACHE_REJECTED' | 'CACHE_PROJECT_MISS'
    | 'CACHE_SECTOR_MISS' | 'DISCOVERY_TRIGGERED' | 'DISCOVERY_SKIPPED'
    | 'SHORTLISTED_ENTERED',
  detail: Record<string, unknown>,
): void {
  console.log(`[ROUTING:${event}]`, detail)
}

// Honest fallback when LLM pipeline fails entirely
export function generateHighTrafficFallback(): string {
  return "We're experiencing high traffic right now. Please try again in a moment — your query should go through shortly. Feel free to ask about any properties, builders, or specific project details."
}

export type CacheDecision = {
  reuse: boolean
  reason: 'CACHE_REUSED' | 'CACHE_REJECTED' | 'CACHE_PROJECT_MISS' | 'CACHE_SECTOR_MISS'
  budgetOnly: boolean
}

// ── Fix 9: centralized cache validation — priority: project > sector > builder > BHK > budget > reuse
export function canReuseCache(
  intent: Intent,
  prevIntent: Record<string, unknown>,
  cached: ScoredProject[],
): CacheDecision {
  const prev = prevIntent as Partial<Intent>

  // Fix 1/3: project named but absent from cache → must discover (uses shared matchesProjectName)
  if ((intent.projectNames?.length ?? 0) > 0) {
    const missing = (intent.projectNames ?? []).filter(
      (n) => !cached.some((p) => matchesProjectName(n, p.name)),
    )
    if (missing.length > 0) {
      return { reuse: false, reason: 'CACHE_PROJECT_MISS', budgetOnly: false }
    }
  }

  // Fix 2: search-signal changes evaluated in priority order — sector first.
  // City-level terms ("Noida", "Greater Noida") are not search signals — do not invalidate cache.
  if (
    intent.sector !== undefined &&
    intent.sector !== prev.sector &&
    !isCityLevel(intent.sector)
  ) {
    return { reuse: false, reason: 'CACHE_SECTOR_MISS', budgetOnly: false }
  }
  if (intent.builderName !== undefined && intent.builderName !== prev.builderName) {
    return { reuse: false, reason: 'CACHE_REJECTED', budgetOnly: false }
  }
  // Fix 8: order-independent BHK comparison
  if ((intent.bhk?.length ?? 0) > 0 && !sameSet(intent.bhk!, (prev.bhk as number[] | undefined) ?? [])) {
    return { reuse: false, reason: 'CACHE_REJECTED', budgetOnly: false }
  }

  // Budget changed → filter existing set, no re-discovery
  const budgetChanged = intent.budgetMax !== prev.budgetMax || intent.budgetMin !== prev.budgetMin
  if (budgetChanged) return { reuse: true, reason: 'CACHE_REUSED', budgetOnly: true }

  // No search-signal change → safe to reuse (reasoning, follow-ups, etc.)
  return { reuse: true, reason: 'CACHE_REUSED', budgetOnly: false }
}

// ── Issue 4: Token budget protection — prevent OpenAI 413 ────────────────────

const SAFE_TOKEN_CEILING = 100_000
const estimateTokens = estimateTokensReal

export function trimMessagesToBudget(
  systemPrompt: string,
  msgs: Array<{ role: 'user' | 'assistant'; content: string }>,
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const remaining = SAFE_TOKEN_CEILING - estimateTokens(systemPrompt)
  if (remaining <= 0) return msgs.slice(-2)

  let trimmed = [...msgs]
  while (
    trimmed.length > 2 &&
    estimateTokens(trimmed.map((m) => m.content).join(' ')) > remaining
  ) {
    // drop oldest user+assistant pair (priority: old history first)
    trimmed = trimmed.slice(2)
  }
  return trimmed
}

export function sseWrite(res: Response, event: string, data: Record<string, unknown>): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

export function formatSessionList(sessions: Array<{ id: string; title: string | null; last_active: Date }>) {
  return sessions.map((s) => ({
    id: s.id,
    label:
      s.title ??
      `Chat ${new Date(s.last_active).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
    last_active: s.last_active,
  }))
}

export function formatMessages(
  messages: Array<{
    id: string
    role: string
    content: string
    created_at: Date
    artifacts?: Prisma.JsonValue | null
  }>
) {
  return messages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    created_at: m.created_at,
    artifacts: Array.isArray(m.artifacts) ? m.artifacts : [],
  }))
}

// Session restore (GET /chat/session) never runs the Conversation Engine, so
// without this the progressive suggestion chips only exist after the user
// sends a fresh message — a restored session with a shortlist and history
// shows no chips at all until then. Recompute the same ui_state a live POST
// /chat turn would emit, from the restored intent/projects/history.
export async function buildRestoreUiState(
  lastIntent: Prisma.JsonValue | null,
  lastProjects: Prisma.JsonValue | null,
  messages: Array<{ role: string; content: string }>,
  currentSessionId?: string,
  rlKey?: string
) {
  // computeConversationState and hydrateFromDb imported at top of file
  const intent = (lastIntent ?? {}) as Intent
  const projects = (lastProjects as unknown as ScoredProject[]) ?? []
  const chatHistory = messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
  const intentState = getIntentState(intent, projects.length > 0)
  const chipInventory = await getChipInventory(DEFAULT_CITY)

  if (currentSessionId) {
    await hydrateFromDb(currentSessionId)
  }

  const uiState = await computeConversationState(intent, intentState, projects, intent.is_comparison_query ?? false, chatHistory, undefined, undefined, undefined, chipInventory, true)

  if (currentSessionId) {
    const { filterNewChips } = await import('../lib/discovery/chipDedup')
    uiState.chips = filterNewChips(currentSessionId, uiState.chips)
  }

  return uiState
}
