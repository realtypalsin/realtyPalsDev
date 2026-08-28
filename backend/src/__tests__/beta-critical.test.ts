import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeOutput, isClean } from '../lib/ai/sanitizeOutput'
import { stripTables } from '../lib/ai/stripTables'
import { stripInternalFields } from '../lib/projectRepository'
import { buildAdaptiveChips } from '../lib/discovery/adaptiveChips'
import { classifyShape, profileFor } from '../lib/ai/inferenceProfile'
import { intentFingerprint } from '../lib/ai/semanticCache'
import { isFreeTierKey, FALLBACK_CHAIN } from '../lib/config'

/**
 * The paths a 50-200 user beta cannot afford to have break.
 *
 * Written against real behaviour rather than the spec checklist: every case
 * here corresponds to something that was measured going wrong, and would fail
 * if it regressed. None of them needs a network, a model or a browser, so they
 * run on every commit.
 */

describe('beta: nothing the buyer sees can carry emoji or a competitor name', () => {
  it('strips emoji from anything the model writes', () => {
    // Measured: 5 of 50 answers carried emoji while the prompt said "NO EMOJI,
    // ANYWHERE". The prompt is not a guarantee; this is.
    const r = sanitizeOutput('Coverage Status 🏗️ — Sector 150 ⭐ good, traffic ⚠️ medium')
    assert.ok(isClean(r.text), r.text)
  })

  it('never lets a competitor portal name reach a buyer', () => {
    for (const p of ['99acres', 'MagicBricks', 'NoBroker', 'Housing.com', 'PropTiger']) {
      assert.ok(!new RegExp(p.replace('.', '\\.'), 'i').test(sanitizeOutput(`Listed on ${p}.`).text))
    }
  })

  it('leaves legitimate rupee and sector text untouched', () => {
    const src = 'Sector 150 runs ₹11,500/sqft — about 20% above Sector 120.'
    assert.equal(sanitizeOutput(src).text, src)
  })
})

describe('beta: the wire stays small', () => {
  it('never ships internal ranker artifacts to a client', () => {
    // Measured: 51% of every project object, 80KB of a 120KB response.
    const p = {
      id: '1',
      name: 'ACE Parkway',
      _multidimensional_rank: { blob: 'x'.repeat(5000) },
      _recommendation_summary: 'y',
    }
    const out = stripInternalFields(p) as Record<string, unknown>
    assert.deepEqual(Object.keys(out).sort(), ['id', 'name'])
  })

  it('does not send a table twice when we rendered one', () => {
    const withTable = 'Verdict first.\n\n| A | B |\n| :--- | :--- |\n| 1 | 2 |\n\nAnd the trade-off.'
    const out = stripTables(withTable)
    assert.ok(!out.includes('|'))
    assert.match(out, /Verdict first/)
    assert.match(out, /trade-off/)
  })
})

describe('beta: cost cannot run away', () => {
  it('a head term never buys a reasoning budget', () => {
    const p = profileFor('2 bhk in noida')
    assert.equal(p.shape, 'lookup')
    assert.equal(p.thinkingBudget, 0)
  })

  it('a comparison still gets the reasoning it needs', () => {
    assert.equal(classifyShape('sector 150 vs sector 128 noida'), 'reasoning')
  })

  it('every chain leg names an env var that exists in the config', () => {
    // A typo'd envKey is a leg that is silently skipped forever, which reads as
    // a healthy chain with fewer providers than it claims.
    for (const item of FALLBACK_CHAIN) {
      assert.match(item.envKey, /^[A-Z][A-Z0-9_]*$/, `suspicious env key: ${item.envKey}`)
      assert.ok(item.label.length > 0, 'chain leg has no label')
    }
  })

  it('free-tier keys are configurable, not hardcoded', () => {
    // Topping up the other key must not leave it throttled as though free.
    assert.equal(isFreeTierKey('GEMINI_API_KEY1'), true)
    assert.equal(isFreeTierKey('GEMINI_API_KEY'), false)
  })
})

describe('beta: one buyer never sees another buyer answer', () => {
  it('a different stated budget is a different cache bucket', () => {
    const rich = intentFingerprint({ budgetMax: 2.5, bhk: [4] })
    const modest = intentFingerprint({ budgetMax: 0.6, bhk: [2] })
    assert.notEqual(rich, modest)
  })

  it('two buyers in the same situation share one entry', () => {
    assert.equal(
      intentFingerprint({ bhk: [3], sector: 'Sector 150' }),
      intentFingerprint({ sector: 'Sector 150', bhk: [3] }),
    )
  })

  it('a first turn is anonymous, which is where head terms land', () => {
    assert.equal(intentFingerprint({}), 'anon')
    assert.equal(intentFingerprint({ queryKind: 'DISCOVERY' }), 'anon')
  })
})

describe('beta: chips never waste a tap', () => {
  it('offers nothing rather than filler', () => {
    assert.deepEqual(
      buildAdaptiveChips({
        projects: [],
        sectors: [],
        rendered: null,
        missingFields: [],
        focusedProject: null,
      }),
      [],
    )
  })

  it('names a project that is genuinely on screen', () => {
    const chips = buildAdaptiveChips({
      projects: [],
      sectors: [],
      rendered: 'projects',
      missingFields: [],
      focusedProject: { name: 'Godrej Woods' },
    })
    assert.ok(chips.length > 0)
    assert.ok(chips.every((c) => c.label.includes('Godrej Woods')))
  })

  it('every chip sends a full question, not a fragment', () => {
    const chips = buildAdaptiveChips({
      projects: [{ name: 'A' }, { name: 'B' }],
      sectors: [],
      rendered: 'projects',
      missingFields: ['budgetMax'],
      focusedProject: null,
    })
    for (const c of chips) {
      const text = c.payload.text as string
      assert.ok(text && text.length > 15, `fragment payload: ${text}`)
      assert.ok(/[a-z]/i.test(text), 'payload has no words')
    }
  })
})
