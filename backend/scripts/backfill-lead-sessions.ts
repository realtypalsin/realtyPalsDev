// backend/scripts/backfill-lead-sessions.ts
//
// Links historical CallbackRequest rows to the conversation they came from.
//
//   npx tsx scripts/backfill-lead-sessions.ts --dry
//   npx tsx scripts/backfill-lead-sessions.ts
//
// chat_session_id was only ever set from a session_id the client had to send,
// and nothing sent it: every stored callback had it null. The sales handoff
// CLAUDE.md describes — open a lead, read the transcript — therefore worked for
// no lead at all.
//
// Matching is on guest_token, then user_id, taking the session closest in time
// before the callback. A callback is made from inside a conversation, so the
// session active when it arrived is the right one.

import { prisma } from '../src/lib/db'

const DRY = process.argv.includes('--dry')

async function main() {
  const orphans = await prisma.callbackRequest.findMany({
    where: { chat_session_id: null },
    select: { id: true, user_id: true, guest_token: true, created_at: true, name: true },
    orderBy: { created_at: 'asc' },
  })

  console.log(`${orphans.length} callbacks with no conversation linked`)
  if (orphans.length === 0) return

  let linked = 0
  let unmatchable = 0

  for (const cb of orphans) {
    if (!cb.user_id && !cb.guest_token) {
      unmatchable++
      continue
    }

    const session = await prisma.chatSession.findFirst({
      where: {
        ...(cb.user_id ? { user_id: cb.user_id } : { guest_token: cb.guest_token }),
        // The conversation must have started before the callback was made.
        created_at: { lte: cb.created_at },
        // A session with no messages has no transcript to offer.
        message_count: { gt: 0 },
      },
      orderBy: { created_at: 'desc' },
      select: { id: true, message_count: true },
    })

    if (!session) {
      unmatchable++
      continue
    }

    if (!DRY) {
      await prisma.callbackRequest.update({
        where: { id: cb.id },
        data: { chat_session_id: session.id },
      })
    }
    linked++
  }

  console.log(`${DRY ? 'would link' : 'linked'}: ${linked}`)
  console.log(`no matching conversation: ${unmatchable}`)
  if (DRY) console.log('\ndry run — nothing written. Re-run without --dry to apply.')
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
