import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'crypto'
import { getBaseSystemPrompt, splitSystemPrompt } from '../prompts/base'
import { buildGeneralConversationalPrompt } from '../prompts/generalPrompt'

/**
 * Prefix caching pays only for bytes that never move.
 *
 * Gemini's implicit cache matches a request PREFIX. One per-message
 * interpolation near the top of a 25,000-character prompt therefore costs the
 * whole prompt: measured 5 Sep 2026, the advisory playbook sat at character
 * ~1,476 and the eight-turn sample produced FOUR distinct heads with a longest
 * common prefix of 1,476 characters — about 369 tokens out of 6,222 that were
 * otherwise identical every turn.
 *
 * Moving that one interpolation below `SYSTEM_PROMPT_BOUNDARY` took the sample
 * to one distinct head and a 24,887-character common prefix. This test is what
 * stops the next per-turn value being spliced back into the head, which is an
 * easy and completely invisible mistake — nothing breaks, the bill just goes up.
 */

const BLOCKED = [{ name: 'Supertech Limited', legal_flag: 'court proceedings' }]

/** Messages chosen to hit different playbooks, query kinds and intent shapes. */
const TURNS: Array<[string, Record<string, unknown>]> = [
  ['hi', {}],
  ['Show me the best projects between 1 and 2 crore', { budgetMin: 1, budgetMax: 2, queryKind: 'RANKING' }],
  ['I have 1.5 crore budget, is this a good investment for rental yield?', { budgetMax: 1.5, queryKind: 'ADVISORY' }],
  ['I am an NRI looking to invest remotely, what should I check?', { queryKind: 'ADVISORY' }],
  ['What is the price per sqft in Sector 150?', { sector: 'Sector 150', queryKind: 'FACTUAL' }],
  ['Compare Sector 150 and Sector 137', { queryKind: 'COMPARISON' }],
  ['Show me 2 BHK and 3 BHK flats in sector 2', { bhk: [2, 3], queryKind: 'DISCOVERY' }],
  ['Which builders have the best on-time delivery?', { queryKind: 'RANKING', verbose: true }],
]

function heads(): string[] {
  return TURNS.map(([msg, intent]) => {
    const full = getBaseSystemPrompt(
      intent as never,
      BLOCKED,
      'Noida' as never,
      'GATHERING',
      (intent.queryKind ?? 'DISCOVERY') as never,
      msg,
      true,
    )
    return splitSystemPrompt(full).head
  })
}

function longestCommonPrefix(strings: string[]): number {
  let lcp = strings[0] ?? ''
  for (const s of strings.slice(1)) {
    let i = 0
    while (i < lcp.length && i < s.length && lcp[i] === s[i]) i++
    lcp = lcp.slice(0, i)
  }
  return lcp.length
}

test('the cacheable head is byte-identical across turns', () => {
  const hashes = heads().map(h => createHash('sha1').update(h).digest('hex'))
  const distinct = new Set(hashes).size
  assert.equal(
    distinct,
    1,
    `${distinct} distinct heads across ${TURNS.length} turns — something per-turn is being interpolated ` +
    `above SYSTEM_PROMPT_BOUNDARY. Every byte after it stops being cacheable.`,
  )
})

test('the shared prefix is most of the head, not a greeting', () => {
  const hs = heads()
  const lcp = longestCommonPrefix(hs)
  // The regression this guards against reduced the prefix to 1,476 characters.
  assert.ok(
    lcp > 20_000,
    `longest common prefix is only ${lcp} chars (head is ${hs[0].length}) — expected the whole head`,
  )
})

test('the general lane keeps its variable content last', () => {
  const built = [
    { userMessage: 'hi' },
    { userMessage: 'is now a good time to buy', stateBrief: '## WHAT YOU KNOW\n- Budget: up to 1.5 Cr' },
    { userMessage: 'hidden costs?', webContext: 'Source A says stamp duty is 7%.' },
    { userMessage: 'schools?', stateBrief: '## WHAT YOU KNOW\n- Sector 137', webContext: 'Source B.' },
  ].map(v => buildGeneralConversationalPrompt(v as never))

  const lcp = longestCommonPrefix(built)
  const shortest = Math.min(...built.map(b => b.length))
  // `stateBrief` and `webContext` are the only per-turn values and they sit at
  // the end, so the prefix is essentially the entire smallest prompt.
  assert.ok(
    lcp / shortest > 0.95,
    `only ${(lcp / shortest * 100).toFixed(0)}% of this lane is a shared prefix — per-turn content moved above it`,
  )
})
