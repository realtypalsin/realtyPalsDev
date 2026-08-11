/**
 * Test Factory: Creates parent records before child records to prevent FK violations
 * Ensures test data integrity without manual session creation in every test
 */

import { prisma } from '../../lib/db'
import crypto from 'crypto'

/**
 * Creates a test chat session with all required fields
 * MUST be called before any operations reference the session
 */
export async function createTestSession(overrides?: Partial<{
  id: string
  userId: string
  guestToken: string
}>) {
  const sessionId = overrides?.id || `test-session-${crypto.randomUUID()}`
  const guestToken = overrides?.guestToken || `guest-${crypto.randomUUID()}`

  return await prisma.chatSession.create({
    data: {
      id: sessionId,
      user_id: overrides?.userId ?? null,
      guest_token: guestToken,
      chat_phase: 'DISCOVERY',
      title: 'Test Session',
      created_at: new Date(),
      last_active: new Date(),
    },
  })
}

/**
 * Creates chat analytics WITH parent session validation
 * Validates session exists before creating child record
 */
export async function createTestAnalytics(
  sessionId: string,
  overrides?: Partial<{ userId: string; guestToken: string }>
) {
  // Verify session exists
  const session = await prisma.chatSession.findUnique({ where: { id: sessionId } })
  if (!session) {
    throw new Error(`Session ${sessionId} does not exist. Create it first with createTestSession()`)
  }

  return await prisma.chatAnalytics.create({
    data: {
      session_id: sessionId,
      user_id: overrides?.userId ?? session.user_id,
      guest_token: overrides?.guestToken ?? session.guest_token,
      chat_started_at: new Date(),
    },
  })
}

/**
 * Creates a test message for a session
 * Parent session must exist first
 */
export async function createTestMessage(
  sessionId: string,
  overrides?: Partial<{
    role: 'user' | 'assistant'
    content: string
  }>
) {
  // Verify session exists
  const session = await prisma.chatSession.findUnique({ where: { id: sessionId } })
  if (!session) {
    throw new Error(`Session ${sessionId} does not exist. Create it first with createTestSession()`)
  }

  return await prisma.chatMessage.create({
    data: {
      session_id: sessionId,
      role: overrides?.role ?? 'user',
      content: overrides?.content ?? 'Test message',
      created_at: new Date(),
    },
  })
}

/**
 * Cleanup: Delete session and all children (cascade handled by Prisma)
 * Also disconnects from database to prevent connection pool exhaustion in tests
 */
export async function deleteTestSession(sessionId: string) {
  try {
    await prisma.chatSession.delete({
      where: { id: sessionId },
    })
  } catch (err) {
    // Ignore if already deleted
    console.warn(`[testFactory] Failed to delete session ${sessionId}:`, (err as Error).message)
  } finally {
    // Disconnect to free connection pool
    await prisma.$disconnect().catch(() => {})
  }
}

/**
 * Verify no orphaned records exist for testing
 */
export async function verifyNoOrphanedRecords() {
  // Check for analytics without session
  const orphanedAnalytics = await (prisma as any).chatAnalytics.findMany({
    where: {
      NOT: {
        session: {
          isNot: null,
        },
      },
    },
  })

  if (orphanedAnalytics.length > 0) {
    throw new Error(`Found ${orphanedAnalytics.length} orphaned analytics records`)
  }
}
