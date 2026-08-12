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

export function markChipShown(sessionId: string, chipId: string, label?: string): void {
  const set = getShownChips(sessionId)
  set.add(chipId)
  if (label) {
    const cleanLabel = label.trim().toLowerCase()
    set.add(`label:${cleanLabel}`)

    // Semantic alias deduplication
    if (cleanLabel.includes('payment plan')) {
      set.add('topic:payment_plans')
    }
    if (cleanLabel.includes('amenit')) {
      set.add('topic:amenities')
    }
  }
}

export function suppressTopicChips(sessionId: string, topic: 'payment_plans' | 'amenities' | 'price' | 'builder'): void {
  const set = getShownChips(sessionId)
  set.add(`topic:${topic}`)

  if (topic === 'payment_plans') {
    set.add('label:review payment plans')
    set.add('label:payment plans available')
    set.add('label:are there any payment plans available?')
    set.add('label:payment plans')
    set.add('label:show payment plans')
    set.add('label:show payment-plan options for ace hanei')
  } else if (topic === 'amenities') {
    set.add('label:what are the amenities provided')
    set.add('label:what amenities are offered')
    set.add('label:what are the amenities?')
    set.add('label:amenities')
    set.add('label:show amenities')
  }
}

export function filterNewChips<T extends { id: string; label?: string }>(sessionId: string, chips: T[]): T[] {
  const shown = getShownChips(sessionId)
  const seenLabels = new Set<string>()

  return chips.filter(c => {
    if (shown.has(c.id)) return false
    
    if (c.label) {
      const cleanLabel = c.label.trim().toLowerCase()
      if (shown.has(`label:${cleanLabel}`)) return false

      // Check intra-batch label duplicate
      if (seenLabels.has(cleanLabel)) return false
      seenLabels.add(cleanLabel)

      // Topic suppression check
      if (shown.has('topic:payment_plans') && cleanLabel.includes('payment plan')) return false
      if (shown.has('topic:amenities') && cleanLabel.includes('amenit')) return false
    }

    return true
  })
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
    if (!session) {
      console.warn('[chipDedup] Session not found during hydration:', sessionId)
      return
    }
    if (session.shown_chip_ids && Array.isArray(session.shown_chip_ids)) {
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
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      select: { id: true },
    })
    if (!session) {
      console.warn('[chipDedup] Session not found:', sessionId)
      return
    }

    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { shown_chip_ids: shown }
    })
  } catch (e) {
    // Non-fatal
    console.warn('[chipDedup] DB persist failed', e)
  }
}

export function filterNewChipsWithFloor<T extends { id: string; label?: string }>(
  sessionId: string,
  chips: T[],
  _floor = 3,
): T[] {
  if (!chips || chips.length === 0) return []
  return filterNewChips(sessionId, chips)
}
