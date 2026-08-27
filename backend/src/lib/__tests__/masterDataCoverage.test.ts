import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { buildProjectFacts, detectFactTopics, type FactTopic } from '../projectFactsBlock'
import { stripRelationInternals, isPublished } from '../projectExposure'

// Runs the facts block against a real seeded record from newProj/75 — the same
// master JSON that was loaded into the database — rather than a hand-written
// fixture, so the assertions track the shape the app actually sees.

const MASTER = join(__dirname, '../../../../newProj/75/realtypals_sector150_noida_master_data.json')
const available = existsSync(MASTER)

function firstProject(): Record<string, unknown> {
  const parsed = JSON.parse(readFileSync(MASTER, 'utf8')) as Record<string, Record<string, unknown>>
  const key = Object.keys(parsed)[0]
  return parsed[key]
}

describe('master data coverage', { skip: !available && 'newProj/75 master JSON not present' }, () => {
  it('surfaces the analyst narrative the base prompt tells the model to use', () => {
    // base.ts rules 13-15 name decision_thesis, why_buy, why_avoid, tier and
    // walk_away_conditions. Before this, none of them reached the prompt.
    const facts = buildProjectFacts(firstProject() as never)

    const decision = facts.decision_profile as Record<string, string> | undefined
    assert.ok(decision, 'decision_profile missing from the facts block')
    assert.ok(decision.decision_thesis, 'decision_thesis missing')
    assert.ok(decision.why_buy, 'why_buy missing')
    assert.ok(decision.why_avoid, 'why_avoid missing — trade-offs are mandatory per CLAUDE.md')

    const recommendation = facts.recommendation_profile as Record<string, string> | undefined
    assert.ok(recommendation, 'recommendation_profile missing from the facts block')
    assert.ok(recommendation.tier, 'tier missing')
    assert.ok(recommendation.walk_away_conditions, 'walk_away_conditions missing')
  })

  it('surfaces the real cost sheet instead of a typed-in one', () => {
    const facts = buildProjectFacts(firstProject() as never)
    const sheet = facts.cost_sheet as Record<string, string> | undefined
    assert.ok(sheet, 'cost_sheet missing from the facts block')
    // These exist in the seeded data and were previously overwritten by literals.
    assert.ok(sheet.parking_cost, 'parking_cost not surfaced')
    assert.ok(sheet.club_membership, 'club_membership not surfaced')
    assert.ok(sheet.ifms, 'ifms not surfaced')
    assert.ok(sheet.base_price_per_sqft, 'base_price_per_sqft not surfaced')
  })

  it('surfaces the long-tail living-standard fields', () => {
    const facts = buildProjectFacts(firstProject() as never)
    // Present on the seeded record; each is a question a buyer actually asks.
    for (const key of ['water_source', 'land_tenure', 'ceiling_height_ft', 'lifts_per_tower', 'maintenance_per_sqft_monthly']) {
      assert.ok(key in facts, `${key} not surfaced from master data`)
    }
  })

  it('never leaks internal or analyst-only fields from a real record', () => {
    const serialized = JSON.stringify(buildProjectFacts(firstProject() as never))
    for (const banned of [
      'ai_search_keywords', 'builder_theme', 'embedding', 'builder_id',
      'admin_notes', 'advisor_notes', 'internal_confidence', 'verified_by',
      'market_demand_score', 'appreciation_potential_5yr',
    ]) {
      assert.ok(!serialized.includes(banned), `${banned} leaked into the prompt block`)
    }
  })

  it('excludes the raw DNA analyst scores', () => {
    const facts = buildProjectFacts(firstProject() as never)
    assert.ok(!('dna' in facts), 'raw DNA scores must not reach the prompt')
    const serialized = JSON.stringify(facts)
    assert.ok(!serialized.includes('builder_score'))
    assert.ok(!serialized.includes('legal_score'))
  })

  it('keeps the default facts block within a sane token budget on real data', () => {
    // Every turn pays this, and a comparison pays it per project.
    const chars = JSON.stringify(buildProjectFacts(firstProject() as never)).length
    assert.ok(chars < 6000, `default facts block is ${chars} chars (~${Math.round(chars / 4)} tokens)`)
  })

  it('omits the heavy relations until the question asks for them', () => {
    const row = firstProject()
    const base = buildProjectFacts(row as never)
    assert.ok(!('price_history' in base), 'price_history should be topic-gated')
    assert.ok(!('specifications' in base), 'specifications should be topic-gated')
    assert.ok(!('construction_milestones' in base), 'construction_milestones should be topic-gated')
  })

  it('includes a heavy relation when the buyer asks about it', () => {
    const row = firstProject()
    const priced = buildProjectFacts(row as never, { topics: detectFactTopics('how has the price changed over the last year?') })
    assert.ok('price_history' in priced, 'price question did not pull price_history')

    const specced = buildProjectFacts(row as never, { topics: detectFactTopics('what brand of kitchen fittings does it have?') })
    assert.ok('specifications' in specced, 'fittings question did not pull specifications')

    const built = buildProjectFacts(row as never, { topics: detectFactTopics('how far along is construction?') })
    assert.ok('construction_milestones' in built, 'progress question did not pull milestones')
  })

  it('stays bounded even with every heavy relation pulled in', () => {
    const all = buildProjectFacts(firstProject() as never, {
      topics: new Set<FactTopic>(['price_history', 'specifications', 'construction']),
    })
    const chars = JSON.stringify(all).length
    assert.ok(chars < 9000, `full facts block is ${chars} chars (~${Math.round(chars / 4)} tokens)`)
  })
})

describe('detectFactTopics', () => {
  it('does not pull heavy relations for an unrelated question', () => {
    const topics = detectFactTopics('is it pet friendly and how far is the airport?')
    assert.equal(topics.size, 0)
  })

  it('recognises each topic from natural buyer phrasing', () => {
    assert.ok(detectFactTopics('has the price appreciated?').has('price_history'))
    assert.ok(detectFactTopics('what flooring is used').has('specifications'))
    assert.ok(detectFactTopics('what stage is the slab work at').has('construction'))
  })
})

describe('publish gate', () => {
  it('treats only PUBLISHED analyst content as buyer-facing', () => {
    assert.equal(isPublished({ status: 'PUBLISHED' }), true)
    assert.equal(isPublished({ status: 'DRAFT' }), false)
    assert.equal(isPublished({ status: 'IN_REVIEW' }), false)
    // A relation with no status column is not gated.
    assert.equal(isPublished({ base_price_per_sqft: 1 }), true)
  })

  it('drops DRAFT analyst opinion entirely', () => {
    assert.equal(
      stripRelationInternals('decision_profile', { status: 'DRAFT', decision_thesis: 'unreviewed take' }),
      null,
    )
    assert.equal(
      stripRelationInternals('recommendation_profile', { status: 'IN_REVIEW', tier: 'STRONG_BUY' }),
      null,
    )
  })

  it('strips the analyst notes from PUBLISHED content', () => {
    const cleaned = stripRelationInternals('recommendation_profile', {
      status: 'PUBLISHED',
      tier: 'BUY',
      primary_thesis: 'solid',
      internal_confidence: 'medium — thin comparables',
      admin_notes: 'call the desk before quoting',
      verified_by: 'analyst@realtypals',
      id: 'r1',
      project_id: 'p1',
    })
    assert.ok(cleaned)
    assert.equal(cleaned!.tier, 'BUY')
    for (const banned of ['internal_confidence', 'admin_notes', 'verified_by', 'id', 'project_id', 'status']) {
      assert.ok(!(banned in cleaned!), `${banned} survived the strip`)
    }
  })

  it('excludes the DNA relation outright', () => {
    assert.equal(stripRelationInternals('dna', { builder_score: 95, legal_score: 94 }), null)
  })
})
