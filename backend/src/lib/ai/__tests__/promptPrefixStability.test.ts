import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'crypto'
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
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

/**
 * The same rule, enforced on the handler prompts by reading the source.
 *
 * Those prompts are template literals inside handler bodies, so there is no
 * function to call and compare — but the property that matters is visible in
 * the source: where the FIRST `${...}` sits. All three chat handlers put their
 * facts JSON on line 2, which left 13–14% of an ~900-character prompt cacheable
 * and re-billed the instruction block every turn.
 *
 * This reads the files rather than the rendered prompt on purpose: it catches
 * the next handler somebody writes by copying an old one, which is how all
 * three came to have the same defect.
 */
test('chat handler prompts put their data last, not their data first', () => {
  const dir = join(__dirname, '..', '..', 'chat', 'handlers')
  const offenders: string[] = []

  for (const file of readdirSync(dir).filter(f => f.endsWith('.ts') && !f.includes('.test.'))) {
    const src = readFileSync(join(dir, file), 'utf8')
    const re = /(?:const|let)\s+\w*(?:[Pp]rompt|systemMsg)\w*\s*=\s*`/g
    let m: RegExpExecArray | null
    while ((m = re.exec(src)) !== null) {
      const start = re.lastIndex
      let i = start
      let depth = 0
      while (i < src.length) {
        const c = src[i]
        if (c === '\\') { i += 2; continue }
        if (c === '$' && src[i + 1] === '{') { depth++; i += 2; continue }
        if (c === '}' && depth > 0) { depth--; i++; continue }
        if (c === '`' && depth === 0) break
        i++
      }
      const body = src.slice(start, i)
      // Short templates carry too little stable text for the position to matter.
      if (body.length < 600) continue
      const firstVar = body.search(/\$\{/)
      if (firstVar >= 0 && firstVar < body.length * 0.5) {
        offenders.push(`${file}: first \${} at char ${firstVar} of ${body.length}`)
      }
    }
  }

  assert.deepEqual(
    offenders,
    [],
    'a handler prompt interpolates per-turn data in its first half — everything after it is uncacheable:\n  ' +
    offenders.join('\n  '),
  )
})
