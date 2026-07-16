// Session-scoped chip deduplication.
// Keeps an in-memory Set per sessionId of chip IDs already emitted.
// LRU eviction after 500 sessions (prevents unbounded memory growth).

import { prisma } from '../db'

const MAX_SESSIONS = 500
const store = new Map<string, Set<string>>()

function evict() {
  if (store.size > MAX_SESSIONS) {
    const first = store.keys().next().value
    if (first) store.delete(first)
  }
}

export function getShownChips(sessionId: string): Set<string> {
  if (!store.has(sessionId)) {
    store.set(sessionId, new Set())
    evict()
  }
  return store.get(sessionId)!
}

export function markChipShown(sessionId: string, chipId: string): void {
  getShownChips(sessionId).add(chipId)
}

export function filterNewChips<T extends { id: string }>(sessionId: string, chips: T[]): T[] {
  const shown = getShownChips(sessionId)
  return chips.filter(c => !shown.has(c.id))
}

export function resetSession(sessionId: string): void {
  store.delete(sessionId)
}

// ── DB-backed functions (call these to persist across restarts) ──

/** Load shown chips from DB into in-memory store for a session */
export async function hydrateFromDb(sessionId: string): Promise<void> {
  try {
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      select: { shown_chip_ids: true }
    })
    if (session?.shown_chip_ids && Array.isArray(session.shown_chip_ids)) {
      const set = getShownChips(sessionId)
      for (const id of session.shown_chip_ids as string[]) {
        set.add(id)
      }
    }
  } catch (e) {
    // Non-fatal — fall back to in-memory only
    console.warn('[chipDedup] DB hydration failed, using in-memory only', e)
  }
}

/** Persist current shown chips to DB */
export async function persistToDb(sessionId: string): Promise<void> {
  try {
    const shown = Array.from(getShownChips(sessionId))
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { shown_chip_ids: shown }
    })
  } catch (e) {
    // Non-fatal
    console.warn('[chipDedup] DB persist failed', e)
  }
}
