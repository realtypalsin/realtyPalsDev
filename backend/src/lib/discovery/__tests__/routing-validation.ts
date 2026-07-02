// Routing validation — Task 4 (no DB required)
// Run: npx tsx src/lib/discovery/__tests__/routing-validation.ts

import { getIntentState } from '../intent'
import type { Intent } from '../types'

interface Case {
  label: string
  intent: Intent
  expected: 'READY_TO_SEARCH' | 'GATHERING' | 'COLD'
}

const cases: Case[] = [
  // ── should now reach READY_TO_SEARCH (sector + lifestyle) ─────────────
  {
    label: 'best family project in Sector 75',
    intent: { sector: 'Sector 75', lifestyleKeywords: ['playground', 'park', 'sports', 'pool'] },
    expected: 'READY_TO_SEARCH',
  },
  {
    label: 'luxury project in Sector 78',
    intent: { sector: 'Sector 78', lifestyleKeywords: ['golf', 'spa', 'concierge'] },
    expected: 'READY_TO_SEARCH',
  },
  {
    label: 'good project for children in Sector 75',
    intent: { sector: 'Sector 75', lifestyleKeywords: ['kids', 'school'] },
    expected: 'READY_TO_SEARCH',
  },
  {
    label: 'sector + BHK (existing path, must still work)',
    intent: { sector: 'Sector 150', bhk: [3] },
    expected: 'READY_TO_SEARCH',
  },
  {
    label: 'sector + budget (existing path)',
    intent: { sector: 'Sector 137', budgetMax: 1.8 },
    expected: 'READY_TO_SEARCH',
  },
  {
    label: 'explicit project names',
    intent: { projectNames: ['Ivy County'] },
    expected: 'READY_TO_SEARCH',
  },

  // ── must stay GATHERING (no over-broadening) ──────────────────────────
  {
    label: 'lifestyle only, no sector → COLD (ask for location)',
    intent: { lifestyleKeywords: ['playground', 'park'] },
    expected: 'COLD',
  },
  {
    label: 'budget only (must stay GATHERING)',
    intent: { budgetMax: 1.5 },
    expected: 'GATHERING',
  },
  {
    label: 'BHK only (must stay GATHERING)',
    intent: { bhk: [3] },
    expected: 'GATHERING',
  },
  {
    label: 'city-level sector + lifestyle → COLD (isCityLevel excludes it)',
    intent: { sector: 'Noida', lifestyleKeywords: ['family', 'park'] },
    expected: 'COLD',
  },

  // ── must be COLD ──────────────────────────────────────────────────────
  {
    label: 'empty intent (COLD)',
    intent: {},
    expected: 'COLD',
  },
]

let pass = 0
let fail = 0

console.log('\n[ROUTING VALIDATION] getIntentState() — 11 cases\n')
console.log('─'.repeat(72))

for (const c of cases) {
  const actual = getIntentState(c.intent)
  const ok = actual === c.expected
  const icon = ok ? '✓' : '✗'
  const detail = ok ? '' : `  → got ${actual}`
  console.log(`${icon} ${c.label.padEnd(52)} [${c.expected}]${detail}`)
  ok ? pass++ : fail++
}

console.log('─'.repeat(72))
console.log(`\n${pass}/${cases.length} passed${fail > 0 ? `  — ${fail} FAILED` : ''}`)

if (fail > 0) {
  process.exitCode = 1
}
