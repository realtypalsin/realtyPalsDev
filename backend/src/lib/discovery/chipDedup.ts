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

    // Semantic alias & topic deduplication
    if (cleanLabel.includes('payment plan') || cleanLabel.includes('payment schedule') || cleanLabel.includes('clp')) {
      set.add('topic:payment_plans')
    }
    if (cleanLabel.includes('amenit') || cleanLabel.includes('clubhouse') || cleanLabel.includes('sports')) {
      set.add('topic:amenities')
    }
    if (cleanLabel.includes('ready to move') || cleanLabel.includes('ready-to-move') || cleanLabel.includes('rtm') || cleanLabel.includes('move in')) {
      set.add('topic:ready_to_move')
    }
    if (cleanLabel.includes('rera') || cleanLabel.includes('legal status') || cleanLabel.includes('check rera')) {
      set.add('topic:rera')
    }
    if (cleanLabel.includes('cost sheet') || cleanLabel.includes('all-inclusive') || cleanLabel.includes('price breakdown')) {
      set.add('topic:cost_sheet')
    }
    if (cleanLabel.includes('stamp duty') || cleanLabel.includes('gst') || cleanLabel.includes('registration fee')) {
      set.add('topic:statutory_tax')
    }
    // Money-planning chips are written a dozen ways — "Set my budget", "Help me
    // set a budget", "Help me work out a realistic EMI budget". Exact-label
    // dedup treats those as three different offers, so the buyer was asked to
    // set a budget again two turns after setting one.
    if (BUDGET_CHIP.test(cleanLabel)) {
      set.add('topic:budget')
    }
  }
}

/** Any chip whose real question is "what can you afford, monthly or in total". */
const BUDGET_CHIP = /\bbudget\b|\bemi\b|afford|monthly (payment|outgo)|loan eligib/i

export function suppressTopicChips(sessionId: string, topic: 'payment_plans' | 'amenities' | 'price' | 'builder' | 'ready_to_move' | 'rera' | 'cost_sheet'): void {
  const set = getShownChips(sessionId)
  set.add(`topic:${topic}`)
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

      // Topic suppression check — prevent repeating questions the user already explored
      if (shown.has('topic:payment_plans') && (cleanLabel.includes('payment plan') || cleanLabel.includes('payment schedule'))) return false
      if (shown.has('topic:amenities') && (cleanLabel.includes('amenit') || cleanLabel.includes('clubhouse'))) return false
      if (shown.has('topic:ready_to_move') && (cleanLabel.includes('ready to move') || cleanLabel.includes('ready-to-move') || cleanLabel.includes('rtm') || cleanLabel.includes('move in'))) return false
      if (shown.has('topic:rera') && (cleanLabel.includes('rera') || cleanLabel.includes('legal status'))) return false
      if (shown.has('topic:cost_sheet') && (cleanLabel.includes('cost sheet') || cleanLabel.includes('all-inclusive'))) return false
      if (shown.has('topic:statutory_tax') && (cleanLabel.includes('stamp duty') || cleanLabel.includes('tax rate'))) return false
      if (shown.has('topic:budget') && BUDGET_CHIP.test(cleanLabel)) return false
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
