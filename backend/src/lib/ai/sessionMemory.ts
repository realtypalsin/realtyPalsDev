/**
 * Phase 0: Session Memory Store
 * Hydrates and persists conversation intent across turns
 *
 * ⚠️ DB-SAFE: Reads only. Writes via UPSERT with transaction safety.
 */

import { prisma } from '../db'
import type { Intent } from '../discovery'

export async function getSessionMemory(sessionId: string) {
  try {
    const memory = await prisma.sessionMemory.findUnique({
      where: { session_id: sessionId },
    })
    return memory
  } catch (err) {
    console.error(`[SESSION-MEMORY:GET] Error for session ${sessionId}:`, err)
    return null
  }
}

/**
 * Hydrate intent from session memory
 * Used at turn start to restore user preferences
 */
export async function hydrateIntentFromMemory(
  sessionId: string,
  currentIntent: Intent
): Promise<Intent> {
  const memory = await getSessionMemory(sessionId)
  if (!memory?.extracted_intent) return currentIntent

  const stored = memory.extracted_intent as Partial<Intent>
  const isSectorChanged = Boolean(currentIntent.sector && stored.sector && currentIntent.sector !== stored.sector)

  // Merge: stored intent as fallback, current intent overrides
  return {
    ...currentIntent,
    // Only fill gaps in current intent — do not resurrect stale budget when sector changes
    bhk: currentIntent.bhk ?? stored.bhk,
    sector: currentIntent.sector ?? stored.sector,
    budgetMin: isSectorChanged ? currentIntent.budgetMin : (currentIntent.budgetMin ?? stored.budgetMin),
    budgetMax: isSectorChanged ? currentIntent.budgetMax : (currentIntent.budgetMax ?? stored.budgetMax),
    purpose: currentIntent.purpose ?? stored.purpose,
    possession: currentIntent.possession ?? stored.possession,
    // The workplace is stated once and matters for the rest of the
    // conversation, so it has to survive every later turn.
    //
    // `extracted_intent` is written whole, so these were already being
    // persisted — this function just never read them back, and the list above
    // is an explicit allowlist rather than a spread. A buyer who said "my
    // office is in Sector 63" on turn 7 had lost it by turn 8, which is the
    // turn that asks for the shortlist.
    //
    // Unlike budget, a workplace is NOT reset when the sector changes: moving
    // the search from one belt to another does not move where they work.
    workplace: currentIntent.workplace ?? stored.workplace,
    workplace_belt: currentIntent.workplace_belt ?? stored.workplace_belt,
  }
}

/**
 * Persist intent to session memory after each turn
 * Safe UPSERT: creates if missing, updates if exists
 */
export async function persistIntentToMemory(
  sessionId: string,
  userId: string | undefined,
  intent: Intent
) {
  try {
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      select: { id: true },
    })
    if (!session) return

    await prisma.sessionMemory.upsert({
      where: { session_id: sessionId },
      create: {
        session_id: sessionId,
        user_id: userId,
        extracted_intent: intent as any,
      },
      update: {
        extracted_intent: intent as any,
        updated_at: new Date(),
      },
    })
  } catch (err) {
    console.error(`[SESSION-MEMORY:PERSIST] Error for session ${sessionId}:`, err)
    // Silent fail — memory is nice-to-have, not blocking
  }
}

/**
 * Track property reactions in session memory
 * Called when user shows interest/rejection signals
 * DEFENSIVE: Checks session exists before update to prevent FK violations
 */
export async function trackPropertyReaction(
  sessionId: string,
  projectId: string,
  sentiment: 'interested' | 'concerned' | 'rejected',
  signals: string[] = []
) {
  try {
    // Defensive: verify session exists first
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      select: { id: true },
    })
    if (!session) {
      console.warn(`[SESSION-MEMORY:REACTION] Session ${sessionId} not found, skipping reaction track`)
      return
    }

    const memory = await getSessionMemory(sessionId)
    const reactions = (memory?.property_reactions as any[] | null) ?? []

    // Remove if exists, re-add with new sentiment
    const filtered = reactions.filter((r: any) => r.projectId !== projectId)
    const updated = [
      ...filtered,
      {
        projectId,
        sentiment,
        signals,
        timestamp: new Date().toISOString(),
      },
    ]

    await prisma.sessionMemory.update({
      where: { session_id: sessionId },
      data: {
        property_reactions: updated,
        updated_at: new Date(),
      },
    })
  } catch (err) {
    console.error(`[SESSION-MEMORY:REACTION] Error for session ${sessionId}:`, err)
  }
}

/**
 * Get property reactions for display/export
 */
export async function getPropertyReactions(sessionId: string) {
  const memory = await getSessionMemory(sessionId)
  return (memory?.property_reactions as any[] | null) ?? []
}
