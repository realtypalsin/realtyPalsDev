// backend/scripts/ask.ts
// One query in, one answer + its real cost out.
//
//   npx tsx scripts/ask.ts "what is the average price per sq ft in noida"
//
// Cost is read back from ai_usage_events rather than estimated locally, so what
// it prints is the same number the daily-budget guard sees.

import { prisma } from '../src/lib/db'

const ENDPOINT = process.env.CHAT_ENDPOINT || 'http://localhost:3001/api/v1/chat'

async function main() {
  const message = process.argv.slice(2).join(' ').trim()
  if (!message) {
    console.error('usage: tsx scripts/ask.ts "<your question>"')
    process.exit(1)
  }

  const since = new Date()
  const t0 = Date.now()

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    // The route takes the question from action.payload.text only; a top-level
    // `message` is dropped by BodySchema.
    body: JSON.stringify({
      guestToken: `guest_ask_cli_${process.pid}`,
      action: { type: 'TEXT_MESSAGE', payload: { text: message } },
    }),
  })

  if (!res.ok || !res.body) {
    console.error(`HTTP ${res.status}: ${await res.text()}`)
    process.exit(1)
  }

  // The route streams SSE. We only need the concatenated text and the session id.
  let raw = ''
  let firstTokenMs: number | null = null
  const decoder = new TextDecoder()
  for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
    if (firstTokenMs === null) firstTokenMs = Date.now() - t0
    raw += decoder.decode(chunk, { stream: true })
  }
  const totalMs = Date.now() - t0

  let text = ''
  let sessionId: string | null = null
  for (const line of raw.split('\n')) {
    if (!line.startsWith('data:')) continue
    const body = line.slice(5).trim()
    if (!body || body === '[DONE]') continue
    try {
      const ev = JSON.parse(body)
      if (typeof ev.token === 'string') text += ev.token
      else if (typeof ev.content === 'string') text += ev.content
      else if (typeof ev.text === 'string') text += ev.text
      if (ev.sessionId) sessionId = ev.sessionId
    } catch {
      // Not JSON — a bare token frame.
      text += body
    }
  }

  console.log('\n─── ANSWER ───────────────────────────────────────────')
  console.log(text.trim() || '(no text frames parsed — raw head follows)\n' + raw.slice(0, 800))

  // Usage rows are written after the stream closes; give the write a beat.
  await new Promise((r) => setTimeout(r, 1500))

  const rows = await prisma.aiUsageEvent.findMany({
    where: { created_at: { gte: since } },
    orderBy: { created_at: 'asc' },
  })

  console.log('\n─── COST ─────────────────────────────────────────────')
  if (rows.length === 0) {
    console.log('no ai_usage_events rows — provider never billed, or recordUsage did not fire')
  }
  let totalUsd = 0
  let inTok = 0
  let outTok = 0
  for (const r of rows) {
    const usd = Number(r.cost_usd)
    totalUsd += usd
    inTok += r.prompt_tokens
    outTok += r.completion_tokens
    console.log(
      `  ${r.provider.padEnd(9)} ${r.model.padEnd(24)} in=${String(r.prompt_tokens).padStart(6)} out=${String(
        r.completion_tokens,
      ).padStart(5)} $${usd.toFixed(6)}  (${r.endpoint})`,
    )
  }
  console.log(`  ${'TOTAL'.padEnd(34)} in=${String(inTok).padStart(6)} out=${String(outTok).padStart(5)} $${totalUsd.toFixed(6)}`)
  console.log(`  calls=${rows.length}  ttft=${firstTokenMs}ms  total=${totalMs}ms  session=${sessionId ?? 'n/a'}`)
  console.log(`  at 1k queries/day: $${(totalUsd * 1000).toFixed(2)}/day  ·  $${(totalUsd * 30000).toFixed(2)}/month`)

  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
