import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getBaseSystemPrompt } from '../base'

const withTools = getBaseSystemPrompt(undefined, undefined, undefined, undefined, undefined, undefined, true)
const noTools = getBaseSystemPrompt(undefined, undefined, undefined, undefined, undefined, undefined, false)

describe('base prompt — tool section is conditional', () => {
  it('omits the tool catalogue for providers that cannot call tools', () => {
    assert.ok(withTools.includes('## TOOLS'), 'tool-capable providers still get the catalogue')
    assert.ok(!noTools.includes('## TOOLS'), 'tool-less providers must not get a tool catalogue')
    assert.ok(!noTools.includes('Call tools instead of guessing'))
    assert.ok(!noTools.includes('**builder_lookup** —'), 'no tool descriptions')
    assert.ok(noTools.includes('## NO LIVE LOOKUPS IN THIS SESSION'))
  })

  it('is shorter without tools', () => {
    // ~1.2k chars (~310 tokens) of rendered tool catalogue. Note the source block
    // in base.ts is far larger than this: most of it is the toolDescriptions map,
    // which is JS data, and only the filtered subset is rendered into the prompt.
    // The bulk of the real saving came from retiring GROQ_FALLBACK_SUFFIX.
    const saved = withTools.length - noTools.length
    assert.ok(saved > 1000, `expected >1000 chars saved, got ${saved}`)
  })

  it('does not tell a tool-less provider to call the calculator tools', () => {
    assert.ok(withTools.includes('Always use calculate_emi'))
    assert.ok(!noTools.includes('Always use calculate_emi'), 'that instruction is a deadlock without tools')
    assert.ok(noTools.includes('compute directly and show your working'))
  })
})

describe('base prompt — safety rules survive in both variants', () => {
  // Each of these was previously carried (or duplicated) by GROQ_FALLBACK_SUFFIX.
  // If a rewrite of the tool section drops one, this fails.
  const mustHoldInBoth: Array<[string, string]> = [
    ['blocked builders legal facts', 'Supertech Limited'],
    ['Jaypee NCLT disclosure', 'Jaypee Greens'],
    ['no builder quality from memory', 'Never answer builder quality from training memory'],
    ['defamation guard', 'Never name a non-flagged builder as risky'],
    ['PROJECT_NOT_FOUND sentinel', 'PROJECT_NOT_FOUND'],
    ['never fabricate RERA ids', 'Never generate a UPRERAPRJ string'],
    ['not-in-database fields', 'construction progress'],
    ['no hedging language on untracked fields', 'Never say "typically"'],
    ['bank / home-loan rule', 'Loan approval depends on your profile'],
    ['competitor ban', 'COMPETITOR BAN'],
  ]

  for (const [label, needle] of mustHoldInBoth) {
    it(`keeps ${label} with tools`, () => assert.ok(withTools.includes(needle), needle))
    it(`keeps ${label} without tools`, () => assert.ok(noTools.includes(needle), needle))
  }

  it('no-tools variant carries its provider-specific overrides', () => {
    assert.ok(noTools.includes("I can't reach our builder database right now"))
    assert.ok(noTools.includes('Based on general knowledge (not a live search) —'))
    assert.ok(noTools.includes("I can't verify RERA details right now"))
  })

  it('never redirects buyers to a competitor portal', () => {
    // The retired suffix told the model to send users to PropTiger / MagicBricks,
    // directly contradicting the base prompt's COMPETITOR BAN.
    for (const [name, prompt] of [['withTools', withTools], ['noTools', noTools]] as const) {
      // Line-scoped: the no-tools block legitimately references "COMPETITOR BAN"
      // by name earlier in the prompt, so an offset window from the first mention
      // of that phrase is not a valid anchor.
      for (const line of prompt.split('\n')) {
        for (const rival of ['PropTiger', 'MagicBricks', '99acres', 'Housing.com', 'Nobroker']) {
          if (!line.includes(rival)) continue
          assert.ok(
            line.startsWith('NEVER mention, recommend, or redirect'),
            `${name}: "${rival}" named outside the ban line — got: ${line.slice(0, 90)}`,
          )
        }
      }
    }
  })
})
