import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getBaseSystemPrompt } from '../base'
import type { SupportedCity } from '../../../discovery/cities'
import type { QueryKind } from '../../../discovery'

/**
 * The system prompt must stay invariant-head-first.
 *
 * Prefix caching bills only what it cannot match against the previous request,
 * and it matches from the start of the prompt to the first differing byte.
 * budgetRules and toolsSection both vary per turn — toolsSection is filtered by
 * filterToolsByIntent(queryKind, userMessage) — and both used to sit near the
 * front, so every rule after them was re-billed at full rate on every turn no
 * matter what caching was switched on.
 *
 * Moving them to the tail took the shared prefix from 39% to ~84% of the
 * prompt. This guards that: dropping a per-turn value back into the head would
 * quietly undo it, and nothing else in the suite would notice.
 */

const prompt = (queryKind: QueryKind, userMessage: string) =>
  getBaseSystemPrompt({}, [], 'noida' as SupportedCity, 'READY_TO_SEARCH', queryKind, userMessage)

function sharedPrefixLength(a: string, b: string): number {
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  return i
}

describe('system prompt prefix stays cacheable', () => {
  const a = prompt('DRILLDOWN' as QueryKind, 'does ace divino have a gym')
  const b = prompt('DISCOVERY' as QueryKind, 'show me 3 bhk in sector 150')

  it('two different queries share most of the prompt', () => {
    const shared = sharedPrefixLength(a, b)
    const pct = (shared / a.length) * 100
    assert.ok(
      pct >= 75,
      `shared prefix fell to ${pct.toFixed(0)}% (${shared}/${a.length} chars). ` +
        'Something that varies per turn moved back above the variable tail.',
    )
  })

  it('the per-turn blocks are in the tail, not the head', () => {
    // The tool catalogue is the block that differs between these two prompts,
    // so wherever it sits is where the cacheable prefix ends.
    // The "## TOOLS" heading itself is byte-identical in both prompts, so the
    // divergence begins just inside the catalogue, a little after the heading.
    // What matters is that the heading sits deep in the tail.
    const toolsAt = a.indexOf('## TOOLS')
    assert.ok(toolsAt !== -1, 'tool section missing from the prompt')
    assert.ok(
      toolsAt > a.length * 0.7,
      `tool section sits at ${Math.round((toolsAt / a.length) * 100)}% of the prompt; it belongs in the tail`,
    )
  })

  it('moving blocks did not drop any rule', () => {
    for (const section of [
      '## HARD RULES',
      '## COMPETITOR BAN',
      '## HONEYPOT RULE',
      '## SENTINEL RULES',
      '## BUILDER DATA RULES',
      '## DOMAIN KNOWLEDGE',
      '## TOOLS',
    ]) {
      assert.ok(a.includes(section), `${section} went missing in the restructure`)
    }
    assert.ok(a.includes('Response Length Guidelines'), 'budget rules went missing')
  })

  it('no explanatory comment is billed inside the prompt', () => {
    // An HTML comment explaining the ordering lived in the template string and
    // cost ~200 tokens on every turn before it moved into the source.
    assert.ok(!a.includes('<!--'), 'prompt carries an HTML comment — move it into a code comment')
  })
})
