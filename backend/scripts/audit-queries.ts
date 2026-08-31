// backend/scripts/audit-queries.ts
//
//   npx tsx scripts/audit-queries.ts
//
// Ten deliberately DIFFERENT questions — one per shape the product has to
// handle — captured in full: the answer, the cards, and the chips.
//
// Every earlier run graded pass/fail against a regex, and the last one passed
// 8/8 while two answers were wrong. So this one grades nothing. It captures
// everything and prints it for a human to judge, which is the only thing that
// caught those two.

import { setTimeout as sleep } from 'node:timers/promises'
import { writeFileSync } from 'node:fs'

const ENDPOINT = process.env.CHAT_ENDPOINT || 'http://localhost:3001/api/v1/chat'

/** One per shape. Nothing here duplicates another's path through the router. */
const QUERIES: Array<{ q: string; shape: string }> = [
  { q: 'How much have prices in Sector 150 appreciated over the last few years?', shape: 'APPRECIATION — price_history' },
  { q: 'What are the hidden costs beyond the sticker price in Noida?', shape: 'COST — statutory + market band' },
  { q: 'Which Noida sector gives the best rental yield?', shape: 'INVESTMENT — yield ranking' },
  { q: 'Which builder in Noida has the best delivery record?', shape: 'BUILDER — cross-builder ranking' },
  { q: 'Should I buy under construction or ready to move in Noida?', shape: 'ADVISORY — a real trade-off' },
  { q: 'What is the maintenance charge for Godrej Nest?', shape: 'DRILLDOWN — a single cost column' },
  { q: 'Which sector is best for families with school-going kids?', shape: 'LIFESTYLE — schools + safety' },
  { q: 'Is Sector 128 worth the premium over Sector 137?', shape: 'COMPARISON — value judgement' },
  { q: 'Which projects in Noida have zero litigation and clear title?', shape: 'LEGAL — the honesty filter' },
  { q: 'What is the cheapest 3BHK I can buy in Noida right now?', shape: 'DISCOVERY — superlative, city-wide' },
]

interface Captured {
  q: string
  shape: string
  ms: number
  text: string
  cards: string[]
  chips: string[]
  error?: string
}

async function ask(message: string): Promise<Captured['text'] extends never ? never : Omit<Captured, 'q' | 'shape'>> {
  const t0 = Date.now()
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
    body: JSON.stringify({
      guestToken: `guest_audit_${process.pid}_${Math.random().toString(36).slice(2, 8)}`,
      action: { type: 'TEXT_MESSAGE', payload: { text: message } },
    }),
    signal: AbortSignal.timeout(150_000),
  })
  if (!res.ok || !res.body) {
    return { ms: Date.now() - t0, text: '', cards: [], chips: [], error: `HTTP ${res.status}` }
  }

  let text = ''
  const cards: string[] = []
  let chips: string[] = []
  const dec = new TextDecoder()
  let buf = ''
  let event = ''

  for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
    buf += dec.decode(chunk, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const line of lines) {
      if (line.startsWith('event:')) { event = line.slice(6).trim(); continue }
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (!payload) continue
      try {
        const e = JSON.parse(payload) as Record<string, unknown>
        if (typeof e.token === 'string') text += e.token
        if (event === 'properties' || Array.isArray(e.exactResults)) {
          for (const p of (e.exactResults as Array<{ name?: string }> ?? [])) {
            if (p?.name && !cards.includes(p.name)) cards.push(p.name)
          }
        }
        // ui_state carries the chips; the last one wins.
        if (Array.isArray(e.chips) && e.chips.length) {
          chips = (e.chips as Array<{ label?: string; payload?: { projects?: unknown[] } }>).map((c) => {
            const n = c?.payload?.projects?.length ?? 0
            return `${c?.label ?? '?'}${n > 1 ? ` [picker ×${n}]` : ''}`
          })
        }
      } catch { /* keepalives */ }
    }
  }
  return { ms: Date.now() - t0, text, cards, chips }
}

function endsCleanly(t: string): boolean {
  const s = t.trimEnd()
  return Boolean(s) && /[.!?:)\]"'`]$|\|$/.test(s)
}

async function main() {
  const out: Captured[] = []
  console.log(`\n═══ query audit — ${QUERIES.length} shapes ═══\n`)

  for (const [i, { q, shape }] of QUERIES.entries()) {
    console.log(`${String(i + 1).padStart(2)}. [${shape}]`)
    console.log(`    Q: ${q}`)
    try {
      const r = await ask(q)
      out.push({ q, shape, ...r })
      console.log(`    ${r.ms}ms · ${r.text.length} chars · ${r.cards.length} cards · ${r.chips.length} chips${endsCleanly(r.text) ? '' : '  ⚠ ENDS MID-SENTENCE'}`)
      console.log(`    cards: ${r.cards.slice(0, 6).join(' | ') || '—'}`)
      console.log(`    chips: ${r.chips.join(' | ') || '—'}`)
      console.log(`    A: ${r.text.replace(/\s+/g, ' ').slice(0, 260)}…\n`)
    } catch (e) {
      out.push({ q, shape, ms: 0, text: '', cards: [], chips: [], error: (e as Error).message })
      console.log(`    ✗ ${(e as Error).message}\n`)
    }
    if (i < QUERIES.length - 1) await sleep(3500)
  }

  writeFileSync('audit-output.json', JSON.stringify(out, null, 2))
  const times = out.map((o) => o.ms).filter(Boolean).sort((a, b) => a - b)
  console.log('─'.repeat(60))
  console.log(`  ${out.filter((o) => o.text && endsCleanly(o.text)).length}/${out.length} answered and ended cleanly`)
  console.log(`  ${out.filter((o) => o.cards.length).length}/${out.length} rendered cards`)
  console.log(`  p50 ${times[Math.floor(times.length / 2)]}ms   max ${times[times.length - 1]}ms`)
  console.log('  full capture -> backend/audit-output.json\n')
}

main().catch((e) => { console.error(e); process.exit(1) })
