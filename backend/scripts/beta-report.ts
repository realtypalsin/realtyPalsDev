// backend/scripts/beta-report.ts
//
// The morning read on a running beta, from the terminal.
//
//   npx tsx scripts/beta-report.ts            last 7 days
//   npx tsx scripts/beta-report.ts --days=1   yesterday
//
// Same data as the admin Conversations tab, in the form you want before coffee:
// did anyone use it, where did they stop, what did it cost, and what did we
// have to tell them we do not hold.

import { prisma } from '../src/lib/db'

const days = Number((process.argv.find((a) => a.startsWith('--days=')) ?? '--days=7').split('=')[1])
const since = new Date(Date.now() - days * 86_400_000)

/** Our own "we do not hold that" phrasing. Every hit is a coverage gap a real user found. */
const COVERAGE_GAP = /not recorded|do not (currently )?track|we do not hold|nothing verified/i

const inr = (usd: number) => `₹${(usd * 88).toFixed(2)}`
const bar = (n: number, max: number, width = 24) =>
  '█'.repeat(Math.round((n / Math.max(max, 1)) * width)).padEnd(width, '·')

async function main() {
  const [sessions, empty, userMsgs, botMsgs, leads, spend] = await Promise.all([
    prisma.chatSession.findMany({
      where: { created_at: { gte: since }, message_count: { gt: 0 } },
      select: { id: true, message_count: true },
    }),
    prisma.chatSession.count({ where: { created_at: { gte: since }, message_count: 0 } }),
    prisma.chatMessage.findMany({
      where: { created_at: { gte: since }, role: 'user' },
      select: { session_id: true, content: true },
    }),
    prisma.chatMessage.findMany({
      where: { created_at: { gte: since }, role: 'assistant' },
      select: { session_id: true, content: true },
    }),
    prisma.callbackRequest.findMany({
      where: { created_at: { gte: since } },
      select: { chat_session_id: true, lead_tier: true },
    }),
    prisma.aiUsageEvent.aggregate({
      where: { created_at: { gte: since } },
      _sum: { cost_usd: true },
      _count: { _all: true },
    }),
  ])

  const cost = Number(spend._sum.cost_usd ?? 0)
  const linkedLeads = leads.filter((l) => l.chat_session_id).length

  console.log(`\n═══ RealtyPals beta — last ${days} day${days === 1 ? '' : 's'} ═══\n`)

  console.log('USE')
  console.log(`  conversations       ${sessions.length}`)
  console.log(`  questions asked     ${userMsgs.length}`)
  console.log(
    `  per conversation    ${sessions.length ? (userMsgs.length / sessions.length).toFixed(1) : '0'}`,
  )
  if (empty > 0) {
    console.log(`  empty sessions      ${empty}  (opened, never asked — excluded above)`)
  }

  // Where they stop. A one-turn session is a bounce and the shape of this is
  // the clearest read on whether anything holds a buyer.
  const hist = new Map<number, number>()
  for (const s of sessions) {
    const t = Math.min(Math.floor(s.message_count / 2), 8)
    hist.set(t, (hist.get(t) ?? 0) + 1)
  }
  const maxBucket = Math.max(...hist.values(), 1)
  console.log('\nWHERE THEY STOP')
  for (const [turns, n] of [...hist.entries()].sort((a, b) => a[0] - b[0])) {
    console.log(`  ${String(turns).padStart(2)} turns  ${bar(n, maxBucket)} ${n}`)
  }

  console.log('\nMONEY')
  console.log(`  total               ${inr(cost)}  (${spend._count._all} model calls)`)
  console.log(
    `  per conversation    ${sessions.length ? inr(cost / sessions.length) : '—'}`,
  )
  console.log(`  leads               ${leads.length}  (${linkedLeads} linked to a conversation)`)
  if (linkedLeads < leads.length) {
    console.log(`  ⚠ ${leads.length - linkedLeads} lead(s) have no conversation attached`)
  }
  console.log(`  per lead            ${leads.length ? inr(cost / leads.length) : '—'}`)

  // What they actually typed.
  const counts = new Map<string, number>()
  for (const m of userMsgs) {
    const k = m.content.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim()
    if (k.length > 2) counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  console.log('\nWHAT THEY ASKED')
  for (const [q, n] of [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
    console.log(`  ${String(n).padStart(3)}×  ${q.slice(0, 68)}`)
  }

  // The list worth acting on: questions where our own answer admitted a gap.
  const gapSessions = new Set(botMsgs.filter((m) => COVERAGE_GAP.test(m.content)).map((m) => m.session_id))
  const gapQuestions = userMsgs.filter((m) => gapSessions.has(m.session_id)).map((m) => m.content)
  console.log('\nWHERE WE HAD NOTHING')
  console.log(
    `  ${gapSessions.size} of ${sessions.length} conversations (${
      sessions.length ? ((gapSessions.size / sessions.length) * 100).toFixed(0) : 0
    }%)`,
  )
  for (const q of [...new Set(gapQuestions)].slice(0, 10)) {
    console.log(`  · ${q.slice(0, 68)}`)
  }
  console.log('\n  ^ this is the seeding backlog: real users, real gaps.\n')

  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
