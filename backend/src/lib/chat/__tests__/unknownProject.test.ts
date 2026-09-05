import { describe, it, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  sanitizeProjectName,
  projectNotFoundReply,
  buildUnknownProjectReply,
} from '../unknownProject'

// The rule: answer the question that was asked, or say we cannot. Never
// substitute a different answer and let the buyer assume theirs was answered.

const ROUTER = readFileSync(join(__dirname, '../../../routes/chat-router.ts'), 'utf8')

describe('never substitutes other projects for the one asked about', () => {
  it('the city-wide substitution is gone from the router', () => {
    // When a named project was not found the handler queried
    // `city contains 'Noida'`, took eight arbitrary rows and printed them under
    // "Verified Projects Status" with a "Recommendation" naming two of them.
    for (const banned of [
      'Verified Projects Status',
      "city: { contains: 'Noida'",
      "intent?.sector || 'Sector 79, Noida'",
    ]) {
      assert.ok(
        !ROUTER.includes(banned),
        `chat-router still substitutes unrelated inventory: ${banned}`,
      )
    }
  })

  it('does not fabricate configurations for a project whose units are unknown', () => {
    assert.ok(!ROUTER.includes("|| '2, 3 BHK'"), 'still invents BHK configurations')
  })

  it('the honest reply asks what they meant instead of offering inventory', () => {
    const text = projectNotFoundReply('Skyline Grandeur')
    assert.match(text, /don't have a verified record for \*\*Skyline Grandeur\*\*/)
    assert.match(text, /Tell me which/)
    // A pitch dressed as help is the failure mode being guarded against.
    assert.ok(!/would you like to see|show you (other|similar)|properties in/i.test(text))
  })
})

describe('sanitizeProjectName', () => {
  it('keeps a realistic project name intact', () => {
    assert.equal(sanitizeProjectName('Ace Hanei'), 'Ace Hanei')
    assert.equal(sanitizeProjectName("Jaypee Greens - Kalypso Court"), "Jaypee Greens - Kalypso Court")
    assert.equal(sanitizeProjectName('M3M & Co.'), 'M3M & Co.')
  })

  it('strips characters that could carry an injected instruction', () => {
    const cleaned = sanitizeProjectName('Ace <script>alert(1)</script> Hanei')
    assert.ok(cleaned)
    assert.ok(!cleaned!.includes('<'))
    assert.ok(!cleaned!.includes('>'))
    assert.ok(!cleaned!.includes('('))
  })

  it('rejects input that is not a project name', () => {
    assert.equal(sanitizeProjectName(''), null)
    assert.equal(sanitizeProjectName('ab'), null)
    assert.equal(sanitizeProjectName('150'), null, 'a bare number is a sector')
    assert.equal(sanitizeProjectName('!!!'), null)
  })

  it('caps length so a pasted essay cannot become a search query', () => {
    const long = sanitizeProjectName('A'.repeat(500))
    assert.ok(long && long.length <= 80)
  })
})

describe('buildUnknownProjectReply', () => {
  const city = 'Noida'

  it('leads with "not ours" before anything sourced from the web', async () => {
    const reply = await buildUnknownProjectReply('Skyline Grandeur', {
      city,
      ground: async () => ({
        text: 'Reported as a mid-rise development by a Noida developer.',
        fromDatabase: false,
        fromWeb: true,
        cached: false,
      }),
    })

    const notOursAt = reply.text.indexOf("isn't in our verified database")
    const contentAt = reply.text.indexOf('Reported as a mid-rise')
    assert.ok(notOursAt !== -1, 'must state it is not ours')
    assert.ok(notOursAt < contentAt, 'the caveat must precede the web content')
    assert.equal(reply.fromWeb, true)
  })

  it('falls back to the honest refusal when nothing can be grounded', async () => {
    const reply = await buildUnknownProjectReply('Skyline Grandeur', {
      city,
      ground: async () => null,
    })
    assert.match(reply.text, /don't have a verified record/)
    assert.equal(reply.fromWeb, false)
  })

  it('falls back to the honest refusal when grounding throws', async () => {
    const reply = await buildUnknownProjectReply('Skyline Grandeur', {
      city,
      ground: async () => { throw new Error('provider down') },
    })
    assert.match(reply.text, /don't have a verified record/)
    assert.equal(reply.fromWeb, false)
  })

  it('never sends an unusable name to the grounding path', async () => {
    let called = false
    const reply = await buildUnknownProjectReply('!!', {
      city,
      ground: async () => { called = true; return null },
    })
    assert.equal(called, false, 'garbage must not reach a search provider')
    assert.match(reply.text, /don't have a verified record/)
  })

  it('offers verification rather than alternative inventory', async () => {
    const reply = await buildUnknownProjectReply('Skyline Grandeur', {
      city,
      ground: async () => ({ text: 'Some public reporting.', fromDatabase: false, fromWeb: true, cached: false }),
    })
    assert.match(reply.text, /advisory team can run a proper verification/)
    assert.ok(
      !/similar projects|alternatives in|other options in/i.test(reply.text),
      'must not pivot to inventory',
    )
  })
})

test('an ungrounded description is discarded, not disclaimed', async () => {
  // The disclaimer is not a licence to print the model's recollection of a
  // building it has never heard of. Measured against an invented name, the
  // ungrounded paragraph credited the project to Supertech Limited and praised
  // the firm — a developer HARD RULES forbids recommending.
  const reply = await buildUnknownProjectReply('Skyline Verdant Quartz Residency', {
    city: 'Noida',
    ground: async () => ({
      text: 'Skyline Verdant Quartz Residency is a prominent high-rise development by Supertech Limited.',
      fromWeb: false,
    }),
  } as never)
  assert.equal(reply.fromWeb, false)
  assert.ok(!/Supertech/i.test(reply.text), 'ungrounded builder attribution reached the buyer')
  assert.ok(/don't have a verified record/i.test(reply.text))
})

test('a genuinely web-sourced description is kept, behind the lead line', async () => {
  const reply = await buildUnknownProjectReply('Some Real Project', {
    city: 'Noida',
    ground: async () => ({ text: 'Reported as launched in 2024 by a regional developer.', fromWeb: true }),
  } as never)
  assert.equal(reply.fromWeb, true)
  assert.ok(reply.text.indexOf("isn't in our verified database") < reply.text.indexOf('Reported as launched'))
})
