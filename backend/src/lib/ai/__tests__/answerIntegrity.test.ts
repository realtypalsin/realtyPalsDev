import test from 'node:test'
import assert from 'node:assert/strict'
import { rewriteFraming, scanDisclosure } from '../answerIntegrity'

/**
 * Every DISCARD string here was produced by the live pipeline against the real
 * database, not invented for the test. Every KEEP string is either a real
 * answer from the same runs or one of our own coverage replies, which are the
 * sentences a careless pattern eats first.
 */

const DISCARD: Array<[string, string]> = [
  [
    'narrates the request and names the prompt',
    'The user asks "What about the second one?", but the provided verified facts block only contains information for a single project: Samridhi Daksh Avenue.',
  ],
  [
    'blames the prompt for a gap',
    'We only have records for Samridhi Daksh Avenue in Sector 150 Noida, as no second project was provided in the database.',
  ],
  [
    'denies coverage in words rather than digits',
    'Our verified database currently contains details for only one project, Samridhi Daksh Avenue in Sector 150.',
  ],
  [
    'sizes the table on a greeting',
    'We currently maintain verified data on 280 projects across 61 sectors in Noida, with options ranging from ₹41 Lakhs to ₹12.5 Crores.',
  ],
  [
    'sizes the table in our own house style',
    'We hold 280 projects across 61 sectors, from ₹41 L to ₹12.5 Cr.',
  ],
  [
    'answers the count question directly',
    'Our database has 280 projects right now.',
  ],
  [
    'reports the shape of its input',
    'The context provided only contains information for one sector, so I cannot compare.',
  ],
  [
    'breaks character',
    'As an AI language model, I can only report what is in my context.',
  ],
]

const KEEP: string[] = [
  // A count of what is ON SCREEN is useful and is not the size of our table.
  'Three of these six projects are ready to move, and two have possession before 2027.',
  // Our own honest coverage reply, scoped to a sector rather than to the table.
  'Sector 2 has one project we hold verified data on — Eros Sampoornam by Eros Group from around ₹0.72 Cr.',
  // The other honest coverage reply.
  'We do not hold any projects from Skyline Group in Noida or Greater Noida, so there is nothing verified for me to show you.',
  // "not provided" about a BUILDER is a real fact a buyer needs.
  'The builder has not provided a possession date for Tower C, so treat the 2027 figure as indicative.',
  // A project's own unit count.
  'Divine Meadows is a 1,100-unit ready gated community across 9.5 acres in Sector 108.',
  // Ordinary advisory prose.
  'ATS Pious Hideaways is an 18-acre Spanish-themed community with 82% open green space, priced from ₹1.85 Cr.',
  // A sector-level count, computed from rows, which the market tables print.
  'Sector 150 holds 19 projects, of which 8 are ready to move.',
]

for (const [label, text] of DISCARD) {
  test(`discards: ${label}`, () => {
    const v = scanDisclosure(text)
    assert.ok(v.length > 0, `should have been flagged: ${text}`)
  })
}

for (const text of KEEP) {
  test(`keeps: ${text.slice(0, 48)}…`, () => {
    const v = scanDisclosure(text)
    assert.deepEqual(v, [], `honest answer was flagged as ${JSON.stringify(v)}`)
  })
}

test('framing is rewritten, not discarded', () => {
  const cases: Array<[string, string]> = [
    ['Here are the verified matching projects in our database:', 'in our verified data'],
    ['Here are the matches from our verified database:', 'from our verified data'],
    ['That project is not in the database.', 'not something we hold'],
  ]
  for (const [input, expected] of cases) {
    const out = rewriteFraming(input)
    assert.ok(out.rewrites > 0, `no rewrite for: ${input}`)
    assert.ok(out.text.includes(expected), `expected "${expected}" in "${out.text}"`)
    assert.ok(!/database/i.test(out.text), `"database" survived in "${out.text}"`)
  }
})

test('a rewritten answer still passes the gate', () => {
  const out = rewriteFraming('Here are the verified matching projects in our database:')
  assert.deepEqual(scanDisclosure(out.text), [])
})

test('a reframed denial is still caught — the rewrite must not launder it', () => {
  // rewriteFraming turns "our verified database" into "our verified data".
  // If OUR_STORE did not cover that phrasing, running the rewrite first would
  // have made the disclosure invisible to the scan. It runs second for that
  // reason, and the pattern covers it as well.
  const v = scanDisclosure('Our verified data currently contains details for only one project, Samridhi Daksh Avenue.')
  assert.ok(v.length > 0, 'reframed denial slipped through')
})
