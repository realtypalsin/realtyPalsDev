import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { COMPETITOR_PATTERNS } from './patterns'

/**
 * The search allowlist and the competitor ban have to agree.
 *
 * They did not. 99acres, MagicBricks, NoBroker and Housing.com sat in the
 * Tavily allowlist while COMPETITOR_PATTERNS blocked them and the prompt
 * forbade naming them. Every fact retrieved from one left the model choosing
 * between citing a banned source and stating the figure unattributed — and an
 * unattributed listing-portal average reaching a buyer is indistinguishable
 * from an invented one.
 *
 * Reads the source rather than importing, because the list is a literal inside
 * a request body and there is no seam to export without inventing one.
 */
function allowlistedDomains(): string[] {
  const src = readFileSync(join(__dirname, 'tavily.ts'), 'utf8')
  const start = src.indexOf('include_domains')
  assert.notEqual(start, -1, 'include_domains no longer exists in tavily.ts')
  const block = src.slice(start, src.indexOf('],', start))
  return [...block.matchAll(/'([a-z0-9.-]+\.[a-z]{2,})'/g)].map((m) => m[1])
}

describe('web search sourcing', () => {
  it('never searches a domain the guardrail bans', () => {
    const banned = allowlistedDomains().filter((d) =>
      COMPETITOR_PATTERNS.some((c) => c.pattern.test(d)),
    )
    assert.deepEqual(
      banned,
      [],
      `these are searched but cannot be cited: ${banned.join(', ')}`,
    )
  })

  it('keeps the regulator on the list', () => {
    // up-rera.in is the one source that settles a RERA question outright. If it
    // ever drops off, RERA answers quietly become press coverage of RERA.
    assert.ok(allowlistedDomains().includes('up-rera.in'))
  })

  it('is an allowlist, not an open search', () => {
    const domains = allowlistedDomains()
    assert.ok(domains.length >= 5, 'allowlist collapsed to almost nothing')
    assert.ok(domains.length <= 30, 'allowlist has grown into an open search')
  })
})
