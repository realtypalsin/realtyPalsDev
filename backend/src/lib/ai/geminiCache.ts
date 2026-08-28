/**
 * Explicit context caching for the stable half of the system prompt.
 *
 * Implicit caching does nothing for us. Measured directly: two byte-identical
 * requests sent back to back against gemini-3.6-flash both reported
 * `cachedContentTokenCount: 0`. Whatever the docs promise, the automatic path
 * is not hitting for this model on this key, so the ~6.3k-token head of every
 * prompt was being billed at full rate on every single turn.
 *
 * Explicit caching does work, at the cost of a resource we have to own:
 *
 *   - It bills storage per hour for as long as the entry lives, so an entry
 *     nobody uses is money burnt. One entry is created lazily on the first turn
 *     that needs it, and its TTL is extended only while traffic keeps arriving.
 *   - It keys on exact bytes. The prompt's per-turn tail (the filtered tool
 *     catalogue, the verbose budget override) is therefore NOT cached — caching
 *     the whole prompt would mint an entry per tool-filter variant and hit
 *     almost none of them. See splitSystemPrompt.
 *   - A cached entry belongs to one model and one API key. The chain fails over
 *     between numbered keys, so the map is keyed on both.
 *
 * Every failure path here returns null, and null means "send the full prompt
 * as usual". A caching problem must never cost a buyer their answer.
 */

import { createHash } from 'node:crypto'
import type { GoogleGenAI } from '@google/genai'

/** How long a freshly created or refreshed entry lives. */
const TTL_SECONDS = 3600

/**
 * Refresh when this much of the TTL remains, rather than on every call.
 * Extending on each turn would issue an update per request for no benefit.
 */
const REFRESH_WHEN_REMAINING_MS = 10 * 60 * 1000

/**
 * Below this, Gemini rejects the create call outright. The exact floor varies
 * by model; this is the conservative one, and being wrong here is harmless —
 * the create fails, we log once and fall back to the uncached path.
 */
const MIN_CACHEABLE_TOKENS = 1024

/** Rough token estimate. Only used to skip a create that would certainly fail. */
const estimateTokens = (text: string) => Math.ceil(text.length / 4)

interface Entry {
  /** Resource name Gemini returns, e.g. "cachedContents/abc123". */
  name: string
  /** Local clock estimate of expiry, used to decide on refresh. */
  expiresAt: number
}

const entries = new Map<string, Entry>()

/** Set when a create fails, so we try once per prompt/model and not per turn. */
const failed = new Set<string>()

function keyFor(model: string, apiKey: string, head: string): string {
  const h = createHash('sha256').update(head).digest('hex').slice(0, 16)
  const k = createHash('sha256').update(apiKey).digest('hex').slice(0, 8)
  return `${model}:${k}:${h}`
}

/**
 * Off unless explicitly asked for. This default was inverted, and the reason it
 * flipped is worth keeping:
 *
 * The header of this file says implicit caching "does nothing for us", measured
 * as `cachedContentTokenCount: 0`. That measurement was taken on a free-tier
 * key. On the billed account it is simply false — every turn now reports
 * 8095/10346 prompt tokens served from the implicit cache (78.2%), which is
 * MORE than the 6196-token head this module can store, because implicit caching
 * also covers the stable start of the per-turn tail.
 *
 * Meanwhile explicit caching was failing 100% of turns. Gemini rejects
 * CachedContent alongside `system_instruction` or `tools` in the same request:
 *
 *   "CachedContent can not be used with GenerateContent request setting
 *    system_instruction, tools or tool_config."
 *
 * Our prompt always carries a per-turn tail as systemInstruction, and tools are
 * on, so every request that attached a cache 400'd. The chain rolled the turn
 * onto GEMINI_API_KEY1 — a free-tier key that cannot store caches at all
 * ("TotalCachedContentStorageTokensPerModelFreeTier ... limit=0"). The paid
 * primary was therefore never answering a single request, and the only visible
 * symptom was a ROLLOVER line with no reason attached.
 *
 * So this stays off: it costs storage, it breaks the paid leg, and it caches
 * less than the free implicit path. Turning it on again requires moving both
 * the tools and the whole system instruction into the cache entry first.
 */
export function explicitCacheEnabled(): boolean {
  return process.env.GEMINI_EXPLICIT_CACHE === 'true'
}

/**
 * The cached-content resource name for this prompt head, or null.
 *
 * Null is the normal, safe answer: caching disabled, prompt too small, create
 * rejected, or anything unexpected. The caller sends systemInstruction as usual.
 */
export async function getCachedPrefix(
  client: GoogleGenAI,
  model: string,
  apiKey: string,
  head: string,
): Promise<string | null> {
  if (!explicitCacheEnabled()) return null
  if (!head) return null
  if (estimateTokens(head) < MIN_CACHEABLE_TOKENS) return null

  const key = keyFor(model, apiKey, head)
  if (failed.has(key)) return null

  const now = Date.now()
  const existing = entries.get(key)

  if (existing) {
    if (existing.expiresAt > now + REFRESH_WHEN_REMAINING_MS) return existing.name
    // Close to expiry and still in use: extend rather than recreate, which
    // keeps the same entry (and the same stored tokens) alive.
    try {
      await client.caches.update({ name: existing.name, config: { ttl: `${TTL_SECONDS}s` } })
      existing.expiresAt = now + TTL_SECONDS * 1000
      return existing.name
    } catch {
      // Expired server-side already, or gone. Drop it and fall through to create.
      entries.delete(key)
    }
  }

  try {
    const created = await client.caches.create({
      model,
      config: {
        systemInstruction: head,
        ttl: `${TTL_SECONDS}s`,
        displayName: 'realtypals-system-prompt',
      },
    })
    if (!created?.name) return null
    entries.set(key, { name: created.name, expiresAt: now + TTL_SECONDS * 1000 })
    console.log(
      `[gemini:cache] created ${created.name} for ${model} (~${estimateTokens(head)} tokens, ttl ${TTL_SECONDS}s)`,
    )
    return created.name
  } catch (err) {
    // One line, once per prompt/model — not on every turn.
    failed.add(key)
    console.warn(
      `[gemini:cache] explicit cache unavailable for ${model}; continuing uncached:`,
      err instanceof Error ? err.message : err,
    )
    return null
  }
}

/** Test seam. Also useful if a deploy needs to force fresh entries. */
export function resetGeminiCacheState(): void {
  entries.clear()
  failed.clear()
}

/** Introspection for the health check and tests. */
export function cachedPrefixCount(): number {
  return entries.size
}
