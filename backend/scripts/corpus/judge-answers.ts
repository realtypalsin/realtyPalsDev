// backend/scripts/corpus/judge-answers.ts
//
// Score answers a corpus run already produced.
//
//   npx tsx scripts/corpus/judge-answers.ts results-longtail2.json
//   npx tsx scripts/corpus/judge-answers.ts results-longtail2.json --limit=20
//
// `run-corpus.ts` says in its own header that grading there is mechanical on
// purpose and "leaves quality judgement to a separate judge pass". That pass
// never existed, so the only quality reading we have ever had came from a
// person reading answers one by one — which is how 120 answers were reported as
// 100% correct on a day when a quarter of them were outages.
//
// The rubric is adapted from Microsoft's promptflow evaluators
// (examples/flows/evaluation/eval-qna-rag-metrics), which score a RAG answer on
// separate axes rather than one blurred number:
//
//   relevance   does it answer the question that was asked
//   usefulness  does it advise, or does it dump fields
//   honesty     does it claim things it cannot know
//
// It runs against a saved results file, never live, so judging costs nothing
// until you choose to spend it, and re-judging the same run is free to repeat.

process.env.NODE_ENV = 'test'

import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { meteredClient } from '../../src/lib/ai/geminiMeter'
import { prisma } from '../../src/lib/db'

const HERE = dirname(fileURLToPath(import.meta.url))
const file = process.argv.find((a) => a.endsWith('.json')) ?? 'results-longtail2.json'
const limit = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 0)

/** Cheapest model that can hold a rubric. The judge is not the product. */
const JUDGE_MODEL = process.env.JUDGE_MODEL || 'gemini-3.5-flash-lite'

interface Row {
  id: string
  query: string
  class: string
  answer: string
  chips?: string[]
}

interface Verdict {
  relevance: number
  usefulness: number
  honesty: number
  note: string
}

const RUBRIC = `You are grading a property advisor's answers to Indian home buyers.

Score three things, each 1 to 5, then give one short note.

relevance  — does it answer the question that was actually asked?
  5 the question is answered directly and completely
  3 partly answered, or answered alongside things nobody asked for
  1 answers a different question

usefulness — does it help a buyer decide, or is it a field dump?
  5 gives the fact AND what it means for the buyer
  3 correct facts, no interpretation
  1 a bare table of values with no sentence of advice

honesty    — does it claim only what it can know?
  5 states what is held, names what is not, no invented figures
  3 vague or hedged where it should be definite
  1 states a figure or fact it could not have, or answers a question about
    somewhere it does not cover as though it did

Reply with JSON only: {"relevance":n,"usefulness":n,"honesty":n,"note":"…"}
The note is at most 15 words and names the single biggest problem, or "none".`

async function judge(client: ReturnType<typeof meteredClient>, row: Row): Promise<Verdict | null> {
  const prompt = `${RUBRIC}

## Question
${row.query}

## Answer
${row.answer.slice(0, 2600)}

## JSON`
  try {
    const res = await client.models.generateContent({
      model: JUDGE_MODEL,
      contents: prompt,
      config: { temperature: 0, maxOutputTokens: 200 },
    })
    const text = res.text ?? ''
    const m = /\{[\s\S]*\}/.exec(text)
    if (!m) return null
    const v = JSON.parse(m[0]) as Partial<Verdict>
    if (typeof v.relevance !== 'number') return null
    return {
      relevance: v.relevance,
      usefulness: Number(v.usefulness ?? 0),
      honesty: Number(v.honesty ?? 0),
      note: String(v.note ?? '').slice(0, 90),
    }
  } catch (e) {
    console.warn(`  judge failed on ${row.id}:`, e instanceof Error ? e.message.slice(0, 90) : e)
    return null
  }
}

const avg = (ns: number[]) => (ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : 0)

async function main() {
  const rows: Row[] = JSON.parse(readFileSync(join(HERE, file), 'utf8'))
  // An outage is not an answer, and averaging it in makes the model look worse
  // than it is while hiding the availability problem behind a quality number.
  const answerable = rows.filter((r) => !/high traffic|out of service/i.test(r.answer) && r.answer.trim())
  const queue = limit > 0 ? answerable.slice(0, limit) : answerable

  console.log(`\njudging ${queue.length} of ${rows.length} answers from ${file}`)
  console.log(`skipped ${rows.length - answerable.length} outage(s), model ${JUDGE_MODEL}\n`)

  // The judge is not the product and should never compete with it for the
  // billed key. `JUDGE_GEMINI_KEY` lets it run on a spare or free-tier key —
  // the first attempt at this run came back "your prepayment credits are
  // depleted" on all six calls, which is also the real cause of the outages the
  // corpus run recorded as rate limiting.
  const judgeKeyName = process.env.JUDGE_GEMINI_KEY || 'GEMINI_API_KEY'
  const apiKey = process.env[judgeKeyName] || process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error(`no key: set ${judgeKeyName} or GEMINI_API_KEY`)
    process.exit(1)
  }
  console.log(`key: ${judgeKeyName}\n`)
  const client = meteredClient({ endpoint: 'judge', apiKey, timeoutMs: 30_000 })
  const scored: Array<Row & { verdict: Verdict }> = []

  for (const [i, row] of queue.entries()) {
    const verdict = await judge(client, row)
    if (verdict) scored.push({ ...row, verdict })
    if ((i + 1) % 20 === 0) console.log(`  ${i + 1}/${queue.length}`)
  }

  const rel = scored.map((s) => s.verdict.relevance)
  const use = scored.map((s) => s.verdict.usefulness)
  const hon = scored.map((s) => s.verdict.honesty)

  console.log(`\n─── SCORES (1–5) ${'─'.repeat(34)}`)
  console.log(`  relevance   ${avg(rel).toFixed(2)}   answers the question asked`)
  console.log(`  usefulness  ${avg(use).toFixed(2)}   advises rather than dumps fields`)
  console.log(`  honesty     ${avg(hon).toFixed(2)}   claims only what it can know`)

  const byClass = new Map<string, Array<Row & { verdict: Verdict }>>()
  for (const s of scored) byClass.set(s.class, [...(byClass.get(s.class) ?? []), s])
  console.log(`\n─── BY CLASS ${'─'.repeat(38)}`)
  for (const [cls, list] of [...byClass.entries()].sort((a, b) =>
    avg(a[1].map((s) => s.verdict.usefulness)) - avg(b[1].map((s) => s.verdict.usefulness)))) {
    console.log(`  ${cls.padEnd(14)} n=${String(list.length).padStart(3)}  rel ${avg(list.map((s) => s.verdict.relevance)).toFixed(1)}  use ${avg(list.map((s) => s.verdict.usefulness)).toFixed(1)}  hon ${avg(list.map((s) => s.verdict.honesty)).toFixed(1)}`)
  }

  console.log(`\n─── WORST 12 ${'─'.repeat(38)}`)
  for (const s of [...scored]
    .sort((a, b) => (a.verdict.relevance + a.verdict.usefulness + a.verdict.honesty) -
      (b.verdict.relevance + b.verdict.usefulness + b.verdict.honesty))
    .slice(0, 12)) {
    console.log(`  [${s.verdict.relevance}/${s.verdict.usefulness}/${s.verdict.honesty}] ${s.query.slice(0, 46).padEnd(48)} ${s.verdict.note}`)
  }

  const dishonest = scored.filter((s) => s.verdict.honesty <= 2)
  console.log(`\n  answers scoring 1–2 on honesty: ${dishonest.length}  ← read every one of these`)
  for (const s of dishonest.slice(0, 8)) console.log(`    ${s.query.slice(0, 52)} — ${s.verdict.note}`)

  const out = join(HERE, file.replace(/\.json$/, '-judged.json'))
  writeFileSync(out, JSON.stringify(scored, null, 2))
  console.log(`\nwritten: ${out}\n`)

  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
