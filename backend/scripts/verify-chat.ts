#!/usr/bin/env node
/**
 * Behavioural regression suite for the chat pipeline.
 *
 * `npm run verify:chat -- --endpoint=https://…`   (defaults to localhost:3001)
 *
 * Why this exists, in the words of the review that prompted it: "every fix was
 * verified by you manually poking the chat once, and every new feature silently
 * re-broke something else." That was accurate, and it described how this
 * session worked too — each fix was checked with a probe script that was then
 * thrown away, so nothing stopped any of them regressing.
 *
 * `src/lib/eval/` already holds a golden set, but it is single-turn and asserts
 * on answer prose. Half of what broke here was multi-turn — focus carry,
 * ordinal and sector referents, transcript recall — and none of it was about
 * wording. So this asserts on observable signals: which project was answered
 * about, whether a figure appeared, how many questions were asked, whether any
 * chips were emitted. Never on phrasing, which a model is entitled to vary.
 *
 * Every case below is a bug that reached a real buyer. The `was` field is the
 * failure it replaces, printed on failure so whoever sees it red knows why the
 * case exists rather than deleting it.
 */
import { PILOT_SCOPE_LABEL } from '../src/lib/config/cities'

const endpointArg = process.argv.slice(2).find((a) => a.startsWith('--endpoint='))
const BASE = endpointArg ? endpointArg.split('=')[1] : 'http://localhost:3001'

interface Turn {
  text: string
  chips: string[]
  cards: number
  ms: number
  sessionId?: string
  /**
   * The resolved intent, carried on the `done` event.
   *
   * This is the structural signal, and preferring it over prose is the point of
   * the file. The sector-pointer case first asserted `/79/` against the answer
   * text and went red on a run where the resolution was perfect: the reply
   * opened "Sector 79 positions investors…", quoted a real price band and named
   * two real projects in that sector. A differently-worded run can simply omit
   * the digits.
   *
   * So the first failure this harness reported was its own bad assertion —
   * testing wording, which the header says it will not do. `intent.sector` is
   * what actually resolved, and the model cannot phrase it away.
   */
  intent?: Record<string, unknown>
}

function parseSse(raw: string): Turn {
  const tokens: string[] = []
  let chips: string[] = []
  let cards = 0
  let sessionId: string | undefined
  let intent: Record<string, unknown> | undefined

  for (const block of raw.split('\n\n')) {
    const event = /^event: (.+)$/m.exec(block)?.[1]
    const payload = block
      .split('\n')
      .filter((l) => l.startsWith('data: '))
      .map((l) => l.slice(6))
      .join('')
    if (!event || !payload) continue

    let data: Record<string, unknown>
    try {
      data = JSON.parse(payload) as Record<string, unknown>
    } catch {
      continue
    }

    if (event === 'token' && typeof data.token === 'string') tokens.push(data.token)
    if (event === 'ui_state' && Array.isArray(data.chips)) {
      chips = (data.chips as Array<{ label?: string }>).map((c) => String(c.label ?? ''))
    }
    if (event === 'properties') {
      cards += (data.exactResults as unknown[] | undefined)?.length ?? 0
    }
    if (event === 'done') {
      if (typeof data.sessionId === 'string') sessionId = data.sessionId
      if (data.intent && typeof data.intent === 'object') intent = data.intent as Record<string, unknown>
    }
  }

  return { text: tokens.join(''), chips, cards, ms: 0, sessionId, intent }
}

/**
 * One conversation. The session id and guest token are held across turns, which
 * is the whole point — the single-turn harness cannot express any of the
 * memory cases, and the ownership check rejects a session id sent without the
 * token that created it.
 */
function conversation(): (text: string) => Promise<Turn> {
  const guestToken = `verify-${Math.random().toString(36).slice(2)}`
  let sessionId: string | null = null

  return async function ask(text: string): Promise<Turn> {
    const started = Date.now()
    const body: Record<string, unknown> = {
      action: { type: 'TEXT_MESSAGE', payload: { text } },
      guestToken,
    }
    if (sessionId) body.sessionId = sessionId

    const res = await fetch(`${BASE}/api/v1/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(180_000),
    })
    const parsed = parseSse(await res.text())
    if (parsed.sessionId) sessionId = parsed.sessionId
    return { ...parsed, ms: Date.now() - started }
  }
}

const questionCount = (s: string): number => (s.match(/\?/g) ?? []).length

interface Case {
  name: string
  /** The failure this case replaces. Printed when it goes red. */
  was: string
  /** Returns null on pass, or the reason it failed. */
  run: (ask: (t: string) => Promise<Turn>) => Promise<string | null>
}

const CASES: Case[] = [
  {
    name: 'a prefix collision resolves to the specific project',
    was:
      '"cost sheet for Maxblis White House II" could return Maxblis White House — a different tower, ' +
      'different RERA number, possession years apart — decided by Postgres heap order. Eleven catalogue ' +
      'names are a prefix of another project’s.',
    run: async (ask) => {
      const two = await ask('what is the cost sheet for Maxblis White House II')
      const one = await ask('what is the cost sheet for Maxblis White House')
      const rateTwo = /₹([\d,]+)\/sqft/.exec(two.text)?.[1]
      const rateOne = /₹([\d,]+)\/sqft/.exec(one.text)?.[1]
      if (!rateTwo || !rateOne) return `no per-sqft rate rendered (II=${rateTwo}, base=${rateOne})`
      if (rateTwo === rateOne) {
        return `both variants returned ${rateTwo} — the specific project is being shadowed`
      }
      return null
    },
  },
  {
    name: 'a RERA number two projects claim is withheld',
    was:
      'Eighteen registration numbers are shared across 39 projects. UPRERAPRJ1504 sits on both Godrej ' +
      'Palm Retreat and Apex Golf Avenue. It is the one fact we tell buyers to verify themselves.',
    run: async (ask) => {
      const collided = await ask('Is Godrej Palm Retreat RERA registered?')
      if (/UPRERAPRJ/i.test(collided.text)) {
        return 'printed a registration number for a project whose number is shared'
      }
      const clean = await ask('Is Ace Parkway RERA registered?')
      if (!/UPRERAPRJ/i.test(clean.text)) {
        return 'withheld an unambiguous registration number — over-correction'
      }
      return null
    },
  },
  {
    name: 'no synthetic score reaches the buyer',
    was:
      'An answer showed "a STRONG_BUY recommendation tier with a buyer satisfaction rating of 4.7 out ' +
      'of 5". tier is STRONG_BUY on 280 of 280 rows; 92 of the 94 populated ratings are exactly 4.7.',
    run: async (ask) => {
      const t = await ask('Tell me about Lotus Arena in Sector 79')
      const leak = /STRONG_BUY|satisfaction rating|4\.7 out of 5/i.exec(t.text)
      return leak ? `leaked "${leak[0]}"` : null
    },
  },
  {
    name: 'a schema-default measurement is not presented as a spec',
    was:
      'ceiling_height_ft was exactly 10.2 on 190 of 280 projects — the schema default — and rendered as ' +
      'a measured specification. A buyer plans around a ceiling height.',
    run: async (ask) => {
      const t = await ask('What are the specs and ceiling height of Ace Parkway?')
      return /10\.2\s*ft/i.test(t.text) ? 'rendered the schema-default ceiling height as a fact' : null
    },
  },
  {
    name: 'an out-of-scope city is declined, with the real envelope',
    was:
      '"I have Gurgaon in mind" was answered with a confident tour of Gurgaon’s market — Golf Course ' +
      'Extension, the Dwarka Expressway — and never once said we do not cover the city.',
    run: async (ask) => {
      const t = await ask('I have Gurgaon in mind')
      const statesBoundary =
        t.text.includes(PILOT_SCOPE_LABEL) || /only serviceable|do not cover|don’t cover|can’t shortlist|cannot shortlist/i.test(t.text)
      if (!statesBoundary) return 'did not state the coverage boundary'
      if (!/\d+\s+projects/i.test(t.text)) return 'declined without naming what we do hold'
      return null
    },
  },
  {
    name: 'a commute to that same city is NOT declined',
    was:
      'The obvious over-correction of the case above. A stated workplace picks the corridor and is the ' +
      'most useful thing a Noida buyer can tell us.',
    run: async (ask) => {
      const t = await ask('I have a daily commute to Gurgaon — which Noida sectors suit that?')
      return /only serviceable|cannot shortlist|can’t shortlist|can't shortlist/i.test(t.text)
        ? 'declined a commute anchor as though it were a buying target'
        : null
    },
  },
  {
    name: 'a sector pointer resolves, and retrieval runs',
    was:
      '"Sector 62 Gurgaon vs Sector 79 Noida" then "The second one." answered "we do not track verified ' +
      'inventory directly inside Sector 79" — about a sector holding seventeen projects, one turn after ' +
      'our own table had printed its price band.',
    run: async (ask) => {
      await ask('Find me apartments in Sector 62 Gurgaon vs Sector 79 Noida.')
      const t = await ask('The second one.')
      if (t.text.trim().length === 0) return 'empty reply'
      // The resolution, not the wording. See the note on Turn.intent.
      const sector = String(t.intent?.sector ?? '')
      if (!/\b79\b/.test(sector)) return `resolved sector was "${sector || 'none'}", not Sector 79`
      // Gurgaon's Sector 62 must never become ours by this route.
      if (/gurgaon|62/i.test(sector)) return `resolved to the out-of-scope half: "${sector}"`
      if (/do not (track|cover)|not currently in our/i.test(t.text)) return 'denied inventory we hold'
      return null
    },
  },
  {
    name: 'the focus project survives a follow-up',
    was:
      '"what is the payment plan?" one turn after an ACE Parkway answer explained CLP and PLP generically ' +
      'and then asked which project the buyer meant.',
    run: async (ask) => {
      await ask('What all amenities are offered by Ace Parkway?')
      const t = await ask('what is the payment plan?')
      // Structural first: the carried project shows up on the resolved intent.
      const named = String((t.intent?.projectNames as string[] | undefined)?.join(', ') ?? '')
      if (/ace parkway/i.test(named)) return null
      if (/ace parkway/i.test(t.text)) return null
      return `lost the project between turns (intent: ${named || 'none'})`
    },
  },
  {
    name: 'an unverified payment schedule says so',
    was:
      '620 payment plan rows, 13 distinct milestone shapes, verified_at and source NULL on all 620 — ' +
      'rendered under a project’s own name as a milestone table with no qualifier.',
    run: async (ask) => {
      await ask('Tell me about Godrej Woods')
      const t = await ask('what is the payment plan?')
      if (!/Available Payment Schemes/i.test(t.text)) return 'the deterministic plan table did not render'
      return /not been confirmed against the developer/i.test(t.text)
        ? null
        : 'rendered an unverified schedule with no provenance qualifier'
    },
  },
  {
    name: 'off-topic is declined, with no chips and no cards',
    was:
      'A buyer alleging their booking token had been taken was offered "Top Rated Builders" and "Buyer ' +
      'Checklist Before Booking". Chips scored 4.4/10 across a 29-turn run, and an additive floor set ' +
      'was the largest single cause.',
    run: async (ask) => {
      const t = await ask('what are the top 3 authentic biryani places near Sector 137?')
      if (t.chips.length > 0) return `offered ${t.chips.length} chips on a refusal: ${t.chips.join(', ')}`
      if (t.cards > 0) return 'rendered property cards on an off-topic decline'
      return null
    },
  },
  {
    name: 'no assurance about the buyer’s own money',
    was:
      '"Please rest assured that your funds are securely processed through official builder channels" — ' +
      'said to someone alleging their token had been taken, about a booking we have no record of.',
    run: async (ask) => {
      const t = await ask(
        'I booked through RealtyPals and your rep took my booking token then stopped answering. This is a scam.',
      )
      const leak = /your (funds?|money|token|payment)[^.!?]{0,40}\b(secure|safe|protected|intact)/i.exec(t.text)
      return leak ? `assured the buyer about their own money: "${leak[0].trim()}"` : null
    },
  },
  {
    name: 'one question per turn',
    was:
      '"do you have a specific micro-market in mind, or would you like me to narrow down a shortlist ' +
      'based on your preferred budget and room configuration?" — three answers requested in one breath.',
    run: async (ask) => {
      const t = await ask('I might be interested in Noida properties')
      const n = questionCount(t.text)
      return n > 1 ? `asked ${n} questions in one reply` : null
    },
  },
  {
    name: 'the transcript is answered from the transcript',
    was:
      '"What did I ask you first?" answered "This is your first question to me in this conversation!" on ' +
      'turn four of a session whose twelve messages were sitting in the database.',
    run: async (ask) => {
      await ask('What amenities does Godrej Woods have?')
      await ask('and the payment plan?')
      const t = await ask('what did I ask you first?')
      if (/first question to me|start of our conversation/i.test(t.text)) {
        return 'claimed the session had just started'
      }
      return /amenit/i.test(t.text) ? null : 'did not recall the opening question'
    },
  },
]

async function main(): Promise<void> {
  console.log(`verify:chat — ${CASES.length} behavioural cases against ${BASE}\n`)
  const failures: Case[] = []
  const reasons = new Map<string, string>()

  for (const c of CASES) {
    const started = Date.now()
    let reason: string | null
    try {
      reason = await c.run(conversation())
    } catch (e) {
      reason = `threw: ${(e as Error).message}`
    }
    const secs = ((Date.now() - started) / 1000).toFixed(1).padStart(5)
    console.log(`${reason ? 'FAIL' : 'ok  '} ${secs}s  ${c.name}`)
    if (reason) {
      console.log(`             ${reason}`)
      failures.push(c)
      reasons.set(c.name, reason)
    }
  }

  console.log(`\n${CASES.length - failures.length}/${CASES.length} passed`)

  if (failures.length > 0) {
    console.log('\nEvery case here is a bug that reached a real buyer. What each one was:\n')
    for (const f of failures) {
      console.log(`  ${f.name}`)
      console.log(`    now: ${reasons.get(f.name)}`)
      console.log(`    was: ${f.was}\n`)
    }
    process.exitCode = 1
  }
}

void main()
