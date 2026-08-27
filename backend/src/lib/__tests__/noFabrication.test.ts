import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  unverified,
  unverifiedFeature,
  confidenceFor,
  headingFor,
  marketFigure,
  MARKET_QUALIFIER,
  UP_STATUTORY,
  NOIDA_MARKET_RANGES,
} from '../factPresentation'
import { FEATURE_PROBES } from '../featureProbes'

// ─── Guard: no invented project-specific figures in the chat handlers ────────
//
// Several handlers used to fill a database gap with a plausible literal and ship
// it under a "Verified …" heading with confidence: 'HIGH' — a fabricated
// "**Yes**, <project> features an Olympic-Size Swimming Pool" whenever the
// amenity table was empty, a full invented payment schedule, a cost sheet with
// specific rupee amounts, and an identical price band printed for every sector.
//
// CLAUDE.md: never invent data, never guess unavailable information, never use
// fake confidence scores. This test fails if a literal figure is reintroduced
// into the router. Market-wide ranges are fine, but they live in
// factPresentation.NOIDA_MARKET_RANGES and must carry MARKET_QUALIFIER.

const ROUTER = readFileSync(join(__dirname, '../../routes/chat-router.ts'), 'utf8')

/** Lines that are comments (including the ones describing the old behaviour). */
function isComment(line: string): boolean {
  const t = line.trim()
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')
}

const CODE_LINES = ROUTER.split('\n').filter(l => !isComment(l))

describe('chat-router — no fabricated project figures', () => {
  it('contains no hardcoded rupee amounts outside the market-range module', () => {
    // A literal rupee figure in the router is almost always a project-specific
    // charge someone typed in. Market-wide ranges belong in NOIDA_MARKET_RANGES.
    const offenders = CODE_LINES
      .map((line, i) => ({ line, n: i + 1 }))
      .filter(({ line }) => /₹\s?[\d,]+(\.\d+)?\s*(–|-|to)?\s*[\d,]*\s*(Lakh|Cr|\/ ?sq)/i.test(line))
      // Interpolated values (₹${...}) are computed from data, not typed in.
      .filter(({ line }) => !/₹\$\{/.test(line))
      // Chip payloads are suggested *questions* the buyer can ask ("homes under
      // ₹1.5 Cr"), not facts we assert about a project.
      .filter(({ line }) => !/payload:\s*\{\s*text:/.test(line))

    assert.deepEqual(
      offenders.map(o => `${o.n}: ${o.line.trim().slice(0, 100)}`),
      [],
      'Hardcoded rupee figure in chat-router. If it is project-specific, read it ' +
        'from the database or use unverified(). If it is market-wide, add it to ' +
        'NOIDA_MARKET_RANGES and render it through marketFigure().',
    )
  })

  it('never answers an unconfirmed amenity with a fabricated Yes', () => {
    // The exact strings the old fallback emitted.
    for (const banned of [
      'Olympic-Size Swimming Pool',
      'Snooker & Billiards Room',
      'State-of-the-Art Technogym',
      'Grand Double-Height Resident Clubhouse',
    ]) {
      assert.ok(
        !CODE_LINES.some(l => l.includes(banned)),
        `"${banned}" was asserted when the amenity table had no match`,
      )
    }
  })

  it('does not claim projects exist when none were found', () => {
    for (const banned of ['Verified RERA societies', 'Top verified residential societies']) {
      assert.ok(
        !CODE_LINES.some(l => l.includes(banned)),
        `"${banned}" was printed as a stand-in for an empty project list`,
      )
    }
  })

  it('does not hardcode an invented payment schedule', () => {
    for (const banned of ['10:90 CLP', 'Down Payment Plan (8% Discount)', 'Possession Linked (20:80 / 30:70)']) {
      assert.ok(
        !CODE_LINES.some(l => l.includes(banned)),
        `"${banned}" was presented as a specific project's schedule`,
      )
    }
  })
})

describe('factPresentation', () => {
  it('unverified() names the gap and offers the handoff, without guessing', () => {
    const line = unverified('cost sheet', 'Ace Hanei')
    assert.match(line, /don't have the cost sheet for Ace Hanei/)
    assert.match(line, /advisory team/)
    assert.ok(!/typical|usually|generally|approximately/i.test(line))
  })

  it('unverifiedFeature() refuses to guess either way', () => {
    const line = unverifiedFeature('a swimming pool', 'Ace Hanei')
    assert.match(line, /don't list a swimming pool either way/)
    // Must not read as a soft yes or a hard no.
    assert.ok(!/\byes\b|\bno\b|probably|likely/i.test(line))
  })

  it('marketFigure() always carries the qualifier', () => {
    assert.match(marketFigure('Club membership', '₹1.5–3 Lakh'), new RegExp(MARKET_QUALIFIER))
  })

  it('confidence follows the weakest tier used', () => {
    assert.equal(confidenceFor(['verified']), 'HIGH')
    assert.equal(confidenceFor(['verified', 'statutory']), 'HIGH')
    assert.equal(confidenceFor(['verified', 'market']), 'MEDIUM')
    assert.equal(confidenceFor(['verified', 'missing']), 'LOW')
    assert.equal(confidenceFor(['market', 'missing']), 'LOW')
  })

  it('reserves the word Verified for fully-verified answers', () => {
    assert.match(headingFor('Amenities', 'Ace Hanei', ['verified']), /^Verified Amenities/)
    assert.ok(!headingFor('Amenities', 'Ace Hanei', ['missing']).startsWith('Verified'))
    assert.ok(!headingFor('Amenities', 'Ace Hanei', ['market']).startsWith('Verified'))
  })

  it('states the UP statutory rates that are actually fixed by law', () => {
    assert.equal(UP_STATUTORY.stampDutyPct, 7)
    assert.equal(UP_STATUTORY.stampDutyFemalePct, 6)
    assert.equal(UP_STATUTORY.registrationPct, 1)
    assert.equal(UP_STATUTORY.gstUnderConstructionPct, 5)
    assert.equal(UP_STATUTORY.gstReadyToMovePct, 0)
  })

  it('keeps every market range a range, never a precise figure', () => {
    // A single precise number reads as a quote for this project.
    for (const [key, value] of Object.entries(NOIDA_MARKET_RANGES)) {
      assert.match(value, /–|-|to /, `${key} should express a range, got "${value}"`)
    }
  })
})

describe('featureProbes', () => {
  it('matches the buyer phrasing and the stored amenity name for each feature', () => {
    const cases: Array<[string, string]> = [
      ['does it have a pool?', 'Swimming Pool'],
      ['is there a gym', 'Fitness Centre / Gym'],
      ['any badminton court?', 'Badminton Court'],
      ['ev charging available?', 'EV Charging Points'],
      ['is there a creche', 'Creche / Daycare'],
    ]
    for (const [msg, amenity] of cases) {
      const probe = FEATURE_PROBES.find(p => p.pattern.test(msg))
      assert.ok(probe, `no probe matched "${msg}"`)
      assert.ok(probe!.matches.test(amenity), `probe for "${msg}" did not match "${amenity}"`)
    }
  })

  it('gives every probe a buyer-facing label for the honest reply', () => {
    for (const p of FEATURE_PROBES) {
      assert.ok(p.label.length > 2, `probe ${p.pattern} has no usable label`)
      // Should read mid-sentence ("…don't list a swimming pool either way").
      // An acronym like "EV charging" legitimately starts capitalised.
      assert.ok(
        !/^[A-Z][a-z]/.test(p.label),
        `label "${p.label}" should read mid-sentence`,
      )
    }
  })
})
