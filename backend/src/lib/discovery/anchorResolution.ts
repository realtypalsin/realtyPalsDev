/**
 * Phase 0: Conversation Anchor
 *
 * Resolves pronouns like "its", "that one", "the previous one" by tracking
 * the current focus project in the chat session (focus_project_id).
 *
 * Rules:
 * - SET focus when: user names exactly one project, discovery returns exactly one match,
 *   or user detail-opens a property
 * - CHANGE focus when: user names a different project
 * - CLEAR focus when: new discovery with multiple results (no explicit name)
 * - RESOLVE for DRILLDOWN: explicit name → focus_project_id → property_events
 */

import { prisma } from '../db'
import type { ScoredProject } from './types'
import type { QueryKind } from './queryClassifier'

export interface AnchorResolution {
  focusProjectId: string | null
  resolvedProjectName: string | null
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  action: 'SET' | 'CHANGE' | 'CLEAR' | 'KEEP' | 'NEED_CLARIFICATION'
  reason: string
}

/**
 * Get the current anchor (focus project) from session.
 */
export async function getCurrentAnchor(sessionId: string): Promise<string | null> {
  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    select: { focus_project_id: true },
  })
  return session?.focus_project_id ?? null
}

/**
 * Update anchor in session.
 */
export async function setAnchor(sessionId: string, projectId: string | null): Promise<void> {
  await prisma.chatSession.update({
    where: { id: sessionId },
    data: {
      focus_project_id: projectId,
      focus_set_at: projectId ? new Date() : null,
    },
  })
}

/**
 * Resolve anchor for a DRILLDOWN query.
 *
 * Returns: (1) resolved project ID, (2) whether caller needs to ask for clarification
 */
export async function resolveDrilldownAnchor(
  userMessage: string,
  sessionId: string,
  explicitProjectName: string | null,
): Promise<{ projectId: string | null; needsClarification: boolean }> {
  // 1. Explicit name in message → use it
  if (explicitProjectName) {
    const project = await prisma.project.findFirst({
      where: {
        name: { contains: explicitProjectName, mode: 'insensitive' },
      },
      select: { id: true },
    })
    if (project) {
      return { projectId: project.id, needsClarification: false }
    }
  }

  // 2. Fall back to focus_project_id
  const currentFocus = await getCurrentAnchor(sessionId)
  if (currentFocus) {
    return { projectId: currentFocus, needsClarification: false }
  }

  // 3. Last resort: check property_events for most recent view in this session
  const lastEvent = await prisma.propertyEvent.findFirst({
    where: {
      session_id: sessionId,
      action: 'view',
    },
    orderBy: { created_at: 'desc' },
    select: { project_id: true },
  })
  if (lastEvent?.project_id) {
    return { projectId: lastEvent.project_id, needsClarification: false }
  }

  // 4. No anchor found → ask which project
  return { projectId: null, needsClarification: true }
}

/**
 * Determine anchor action based on discovery results.
 *
 * Evaluates:
 * - User named exactly 1 project
 * - Discovery returned exactly 1 exact match
 * - Discovery returned multiple results (no explicit name)
 */
export async function determineAnchorAction(
  userMessage: string,
  projectNames: string[] | undefined,
  discoveredExact: ScoredProject[],
  discoveredNearby: ScoredProject[],
  currentFocusId: string | null,
  queryKind: QueryKind,
): Promise<AnchorResolution> {
  // Case 1: User named exactly one project
  if (projectNames?.length === 1) {
    const projectId = discoveredExact[0]?.id ?? null
    if (projectId && projectId !== currentFocusId) {
      return {
        focusProjectId: projectId,
        resolvedProjectName: discoveredExact[0]?.name ?? null,
        confidence: 'HIGH',
        action: 'CHANGE',
        reason: 'User named a different project',
      }
    }
    if (projectId && projectId === currentFocusId) {
      return {
        focusProjectId: projectId,
        resolvedProjectName: discoveredExact[0]?.name ?? null,
        confidence: 'HIGH',
        action: 'KEEP',
        reason: 'User re-referenced the same project',
      }
    }
  }

  // Case 2: Discovery returned exactly 1 exact match (auto-set focus)
  if (discoveredExact.length === 1 && (projectNames?.length ?? 0) === 0) {
    const projectId = discoveredExact[0].id
    if (projectId !== currentFocusId) {
      return {
        focusProjectId: projectId,
        resolvedProjectName: discoveredExact[0].name,
        confidence: 'MEDIUM',
        action: 'SET',
        reason: 'Exactly one match from discovery',
      }
    }
  }

  // Case 3: Discovery returned multiple results (no explicit name) → CLEAR focus
  if ((discoveredExact.length > 1 || discoveredNearby.length > 0) && (projectNames?.length ?? 0) === 0) {
    return {
      focusProjectId: null,
      resolvedProjectName: null,
      confidence: 'HIGH',
      action: 'CLEAR',
      reason: 'Multiple discovery results, no explicit project name',
    }
  }

  // Case 4: DRILLDOWN with no discovery (detail query, no explicit name)
  if (queryKind === 'DRILLDOWN' && discoveredExact.length === 0 && (projectNames?.length ?? 0) === 0) {
    // Keep current focus if it exists
    if (currentFocusId) {
      return {
        focusProjectId: currentFocusId,
        resolvedProjectName: null,
        confidence: 'MEDIUM',
        action: 'KEEP',
        reason: 'Detail query with no discovery, keeping current focus',
      }
    }
    // Otherwise need clarification
    return {
      focusProjectId: null,
      resolvedProjectName: null,
      confidence: 'LOW',
      action: 'NEED_CLARIFICATION',
      reason: 'Detail query but no project in focus or mentioned',
    }
  }

  // Case 5: Default → keep current
  return {
    focusProjectId: currentFocusId,
    resolvedProjectName: null,
    confidence: 'MEDIUM',
    action: 'KEEP',
    reason: 'No change criteria met',
  }
}

/**
 * Apply anchor resolution to session.
 */
export async function applyAnchorResolution(
  sessionId: string,
  resolution: AnchorResolution,
): Promise<void> {
  if (resolution.action === 'SET' || resolution.action === 'CHANGE') {
    await setAnchor(sessionId, resolution.focusProjectId)
  } else if (resolution.action === 'CLEAR') {
    await setAnchor(sessionId, null)
  }
  // KEEP and NEED_CLARIFICATION don't modify the anchor
}

/**
 * Main entry point: resolve anchor for the current turn.
 */
export async function resolveAnchor(
  sessionId: string,
  userMessage: string,
  projectNames: string[] | undefined,
  discoveredExact: ScoredProject[],
  discoveredNearby: ScoredProject[],
  queryKind: QueryKind,
): Promise<AnchorResolution> {
  const currentFocus = await getCurrentAnchor(sessionId)

  const resolution = await determineAnchorAction(
    userMessage,
    projectNames,
    discoveredExact,
    discoveredNearby,
    currentFocus,
    queryKind,
  )

  // Apply resolution
  await applyAnchorResolution(sessionId, resolution)

  return resolution
}
