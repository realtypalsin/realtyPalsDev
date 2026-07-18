/**
 * Regression tests for intent extraction.
 *
 * Unit layer (always runs):
 *   - parseIntentJson: schema validation + merging
 *   - getIntentState: correct state transitions for RERA-style intents
 *   - Prompt content: RERA examples present in extraction prompt
 *
 * Integration layer (runs only when OPENAI_API_KEY or GROQ_API_KEY is set):
 *   - Full extractIntent round-trips for known-failing RERA patterns
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseIntentJson } from '../intent'
import { getIntentState } from '../../discovery/intent'
import { INTENT_EXTRACTION_PROMPT } from '../prompts/intent-extraction'

// ─── Unit: parseIntentJson ────────────────────────────────────────────────────

describe('parseIntentJson — RERA query outputs', () => {
  it('extracts projectNames from RERA number query', () => {
    const result = parseIntentJson('{"projectNames":["Godrej Meridien"]}', {})
    assert.deepEqual(result.projectNames, ['Godrej Meridien'])
  })

  it('extracts projectNames from UP RERA registration query', () => {
    const result = parseIntentJson('{"projectNames":["Godrej Palm Retreat"]}', {})
    assert.deepEqual(result.projectNames, ['Godrej Palm Retreat'])
  })

  it('extracts projectNames from multi-word project name', () => {
    const result = parseIntentJson('{"projectNames":["ATS Pious Hideaways"]}', {})
    assert.deepEqual(result.projectNames, ['ATS Pious Hideaways'])
  })

  it('extracts projectNames alongside other intent fields', () => {
    const result = parseIntentJson('{"projectNames":["ACE Starlit"],"sector":"Sector 150"}', {})
    assert.deepEqual(result.projectNames, ['ACE Starlit'])
    assert.equal(result.sector, 'Sector 150')
  })

  it('merges projectNames with non-empty previous intent', () => {
    const previous = { bhk: [3], budgetMax: 2 }
    const result = parseIntentJson('{"projectNames":["Mahagun Moderne"]}', previous)
    assert.deepEqual(result.projectNames, ['Mahagun Moderne'])
    assert.deepEqual(result.bhk, [3])
    assert.equal(result.budgetMax, 2)
  })

  it('returns previous intent on invalid JSON', () => {
    const previous = { bhk: [2] }
    const result = parseIntentJson('not json at all', previous)
    assert.deepEqual(result, { ...previous, projectNames: undefined, is_comparison_query: undefined })
  })

  it('returns previous intent on schema mismatch', () => {
    const previous = { bhk: [2] }
    // bhk must be number[] — string value should fail schema validation
    const result = parseIntentJson('{"bhk":"3BHK"}', previous)
    assert.deepEqual(result, previous)
  })

  it('handles empty object — no-op on previous intent', () => {
    const previous = { bhk: [3], sector: 'Sector 150' }
    const result = parseIntentJson('{}', previous)
    assert.deepEqual(result, { ...previous, projectNames: undefined, is_comparison_query: undefined })
  })

  it('extracts projectNames from comparison query', () => {
    const result = parseIntentJson('{"projectNames":["Godrej Palm Retreat","ATS Pious Hideaways"]}', {})
    assert.deepEqual(result.projectNames, ['Godrej Palm Retreat', 'ATS Pious Hideaways'])
  })
})

// ─── Unit: getIntentState — RERA intents must trigger READY_TO_SEARCH ─────────

describe('getIntentState — project name intents', () => {
  it('single projectName → READY_TO_SEARCH', () => {
    assert.equal(getIntentState({ projectNames: ['Godrej Meridien'] }), 'READY_TO_SEARCH')
  })

  it('two projectNames → READY_TO_SEARCH', () => {
    assert.equal(getIntentState({ projectNames: ['Godrej Palm Retreat', 'ACE Starlit'] }), 'READY_TO_SEARCH')
  })

  it('projectNames with other fields → READY_TO_SEARCH', () => {
    assert.equal(getIntentState({ projectNames: ['Godrej Meridien'], bhk: [3] }), 'READY_TO_SEARCH')
  })

  it('empty projectNames array → COLD (not a search trigger)', () => {
    assert.equal(getIntentState({ projectNames: [] }), 'COLD')
  })

  it('no fields → COLD', () => {
    assert.equal(getIntentState({}), 'COLD')
  })

  it('BHK only → GATHERING (needs at least 2 signals)', () => {
    assert.equal(getIntentState({ bhk: [3] }), 'GATHERING')
  })

  it('BHK + budget → READY_TO_SEARCH', () => {
    assert.equal(getIntentState({ bhk: [3], budgetMax: 2 }), 'READY_TO_SEARCH')
  })

  it('builderName alone → READY_TO_SEARCH', () => {
    assert.equal(getIntentState({ builderName: 'Godrej' }), 'READY_TO_SEARCH')
  })
})

// ─── Unit: prompt content — RERA examples must be present ────────────────────

describe('INTENT_EXTRACTION_PROMPT content — RERA patterns', () => {
  it('contains RERA number example with projectNames', () => {
    assert.ok(
      INTENT_EXTRACTION_PROMPT.includes('RERA number') || INTENT_EXTRACTION_PROMPT.includes('RERA registration'),
      'Prompt must include RERA number example'
    )
  })

  it('projectNames description covers non-comparison queries', () => {
    // Must NOT say "for comparison queries only"
    const desc = INTENT_EXTRACTION_PROMPT.match(/"projectNames":[^\n]+/)?.[0] ?? ''
    assert.ok(
      !desc.toLowerCase().includes('comparison queries only') &&
      !desc.toLowerCase().includes('for comparison queries:'),
      `projectNames description must not restrict to comparison queries. Got: ${desc}`
    )
  })

  it('contains PROJECTNAMES RULE section', () => {
    assert.ok(
      INTENT_EXTRACTION_PROMPT.includes('PROJECTNAMES RULE'),
      'Prompt must include PROJECTNAMES RULE section'
    )
  })

  it('RERA few-shot example present for Godrej Meridien pattern', () => {
    assert.ok(
      INTENT_EXTRACTION_PROMPT.includes('RERA number of Godrej Meridien') ||
      INTENT_EXTRACTION_PROMPT.includes('Godrej Meridien'),
      'Prompt must include Godrej Meridien RERA example'
    )
  })

  it('contains Hindi RERA registration example', () => {
    assert.ok(
      INTENT_EXTRACTION_PROMPT.includes('RERA registration number kya hai') ||
      INTENT_EXTRACTION_PROMPT.includes('registration id chahiye'),
      'Prompt must include at least one Hindi/Hinglish RERA example'
    )
  })

  it('contains detail query example (tell me about X)', () => {
    assert.ok(
      INTENT_EXTRACTION_PROMPT.includes('tell me about') || INTENT_EXTRACTION_PROMPT.includes('baare mein'),
      'Prompt must include a detail query example that populates projectNames'
    )
  })
})

// ─── Unit: intent prompt counter-examples for generic adjectives ──────────────

describe('INTENT_EXTRACTION_PROMPT — generic adjective counter-examples', () => {
  it('prompt includes counter-example for "best project" pattern', () => {
    assert.ok(
      INTENT_EXTRACTION_PROMPT.includes('best project under 3 crore') ||
      INTENT_EXTRACTION_PROMPT.includes('best project under 3') ||
      INTENT_EXTRACTION_PROMPT.includes('sabse acha'),
      'Prompt must include counter-example for "best project" type queries'
    )
  })

  it('PROJECTNAMES RULE explicitly forbids generic adjectives', () => {
    assert.ok(
      INTENT_EXTRACTION_PROMPT.includes('best') && INTENT_EXTRACTION_PROMPT.includes('NOT project names'),
      'PROJECTNAMES RULE must explicitly state generic adjectives are not project names'
    )
  })
})

// ─── Integration: full extractIntent round-trips ──────────────────────────────
// Skipped when no API keys are configured.

const hasOpenAI = !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'test-key-unused-in-unit-tests'
const hasGroq = !!process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'test-key-unused-in-unit-tests'

describe('extractIntent — RERA query round-trips', { skip: !hasOpenAI && !hasGroq }, () => {
  // Dynamic import to avoid module-level side effects when skipped
  it('English RERA number query → projectNames populated', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { extractIntent } = require('../intent')
    const { intent: result } = await extractIntent('What is the RERA number of Godrej Meridien?', {})
    assert.ok(
      (result.projectNames?.length ?? 0) > 0,
      `Expected projectNames to be populated, got: ${JSON.stringify(result)}`
    )
    const found = result.projectNames?.some(
      (n: string) => n.toLowerCase().includes('godrej') || n.toLowerCase().includes('meridien')
    )
    assert.ok(found, `Expected 'Godrej Meridien' in projectNames, got: ${JSON.stringify(result.projectNames)}`)
  })

  it('Hindi RERA registration query → projectNames populated', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { extractIntent } = require('../intent')
    const { intent: result } = await extractIntent('Godrej Palm Retreat ka RERA registration number kya hai', {})
    assert.ok(
      (result.projectNames?.length ?? 0) > 0,
      `Expected projectNames populated, got: ${JSON.stringify(result)}`
    )
  })

  it('UP RERA registration id query → projectNames populated', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { extractIntent } = require('../intent')
    const { intent: result } = await extractIntent('ATS Pious Hideaways ka UP RERA registration id chahiye', {})
    assert.ok(
      (result.projectNames?.length ?? 0) > 0,
      `Expected projectNames populated, got: ${JSON.stringify(result)}`
    )
  })

  it('is X RERA registered → projectNames populated', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { extractIntent } = require('../intent')
    const { intent: result } = await extractIntent('Is ACE Starlit RERA registered?', {})
    assert.ok(
      (result.projectNames?.length ?? 0) > 0,
      `Expected projectNames populated, got: ${JSON.stringify(result)}`
    )
  })

  it('tell me about X → projectNames populated', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { extractIntent } = require('../intent')
    const { intent: result } = await extractIntent('Tell me about Mahagun Moderne', {})
    assert.ok(
      (result.projectNames?.length ?? 0) > 0,
      `Expected projectNames populated, got: ${JSON.stringify(result)}`
    )
  })

  it('RERA query does NOT populate bhk or budget', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { extractIntent } = require('../intent')
    const { intent: result } = await extractIntent('What is the RERA number of Godrej Meridien?', {})
    assert.equal(result.budgetMax, undefined)
    assert.equal((result.bhk?.length ?? 0), 0)
  })
})
