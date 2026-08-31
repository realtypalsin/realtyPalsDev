// backend/scripts/smoke-queries.ts
//
//   npx tsx scripts/smoke-queries.ts
//
// A small, deliberately cheap live run. Eight questions, one at a time, spaced
// out — chosen because each one previously produced a specific wrong answer, so
// a pass here means something rather than just "it replied".
//
// This is NOT the corpus runner. It costs real money on a real balance, so it
// stays small and it never runs in a loop.

import { setTimeout as sleep } from 'node:timers/promises'

const ENDPOINT = process.env.CHAT_ENDPOINT || 'http://localhost:3001/api/v1/chat'

interface Probe {
  q: string
  /** What was wrong before, and what to look for now. */
  expect: string
  /** Must NOT appear. */
  forbid?: RegExp
  /** Should appear. */
  want?: RegExp
}

const PROBES: Probe[] = [
  {
    q: 'Show me 3BHK in Sector 150 under 2 crore',
    expect: 'names real projects; previously claimed we track none',
    forbid: /do not track|don'?t track|no verified 3\s?bhk/i,
  },
  {
    q: 'best society in sector 137',
    expect: 'discusses the shelf; no markdown table above the cards',
    forbid: /^\s*\|.*\|/m,
  },
  {
    q: 'Which is better for a family: Sector 74, 75, 76 or 78?',
    expect: 'no city-wide corridor table; finishes its last sentence',
    forbid: /General Corridor|Gateway Sector to Gr/i,
  },
  {
    q: 'Is Ajnara Daffodil RERA registered?',
    expect: 'answers from our rows, points at our own page',
    forbid: /up-?rera\.in|rera\.up\.gov|state rera portal/i,
  },
  {
    q: 'What is the average price per sq ft in Noida right now?',
    expect: 'market answer carrying its qualifier',
  },
  {
    q: 'Tell me about Godrej Woods',
    expect: 'not in our DB — should say so, no card, no outside link',
    forbid: /up-?rera\.in|99acres|magicbricks/i,
  },
  {
    q: 'Does Ace Hanei have a swimming pool?',
    expect: 'project-specific yes/no from our rows, never a market average',
  },
  {
    q: 'What is the maintenance cost for Supertech Ecociti?',
    expect: 'that project cost sheet, not a generic statutory table',
  },
]

/** Reads the SSE stream and returns the assembled answer. */
async function ask(message: string): Promise<{ text: string; ms: number }> {
  const t0 = Date.now()
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
    // The route reads the question from action.payload.text; a top-level
    // `message` is dropped by its Zod schema.
    body: JSON.stringify({
      guestToken: `guest_smoke_${process.pid}`,
      action: { type: 'TEXT_MESSAGE', payload: { text: message } },
    }),
    signal: AbortSignal.timeout(120_000),
  })
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 120)}`)

  let text = ''
  const dec = new TextDecoder()
  let buf = ''
  for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
    buf += dec.decode(chunk, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data:')) continue
      try {
        const evt = JSON.parse(line.slice(5).trim()) as { token?: string }
        if (typeof evt.token === 'string') text += evt.token
      } catch { /* keepalives and non-JSON frames */ }
    }
  }
  return { text, ms: Date.now() - t0 }
}

/** An answer that stops mid-sentence is the failure mode this run exists to catch. */
function endsCleanly(t: string): boolean {
  const s = t.trimEnd()
  if (!s) return false
  return /[.!?:)\]"'`]$|\|$/.test(s)
}

async function main() {
  console.log(`\n═══ smoke run — ${PROBES.length} queries against ${ENDPOINT} ═══\n`)
  let pass = 0
  const times: number[] = []

  for (const [i, p] of PROBES.entries()) {
    process.stdout.write(`${String(i + 1).padStart(2)}. ${p.q}\n`)
    try {
      const { text, ms } = await ask(p.q)
      times.push(ms)
      const problems: string[] = []
      if (!text.trim()) problems.push('EMPTY ANSWER')
      if (text.trim() && !endsCleanly(text)) problems.push(`ENDS MID-SENTENCE: …${JSON.stringify(text.slice(-60))}`)
      if (p.forbid && p.forbid.test(text)) problems.push(`FORBIDDEN: ${p.forbid}`)
      if (p.want && !p.want.test(text)) problems.push(`MISSING: ${p.want}`)

      if (problems.length === 0) {
        pass++
        console.log(`    ✓ ${ms}ms, ${text.length} chars — ${p.expect}`)
      } else {
        console.log(`    ✗ ${ms}ms, ${text.length} chars`)
        problems.forEach((x) => console.log(`      ${x}`))
      }
      console.log(`      ${text.slice(0, 150).replace(/\s+/g, ' ')}…\n`)
    } catch (e) {
      console.log(`    ✗ ERROR ${(e as Error).message}\n`)
    }
    // Spaced deliberately: this shares a per-minute allowance with everything
    // else, and the point of the run is to observe normal behaviour, not to
    // find out what a burst does.
    if (i < PROBES.length - 1) await sleep(3000)
  }

  times.sort((a, b) => a - b)
  console.log(`─────────────────────────────────────────────`)
  console.log(`  ${pass}/${PROBES.length} clean`)
  if (times.length) {
    console.log(`  p50 ${times[Math.floor(times.length / 2)]}ms   max ${times[times.length - 1]}ms`)
  }
  console.log('')
}

main().catch((e) => { console.error(e); process.exit(1) })
