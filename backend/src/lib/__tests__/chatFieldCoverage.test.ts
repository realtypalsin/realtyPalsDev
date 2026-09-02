import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { PROJECT_PUBLIC_SELECT, ALLOWED_RELATIONS } from '../projectExposure'
import { projectScalarFacts, PROMPT_EXCLUDED_FIELDS } from '../projectFactsBlock'

/**
 * Every buyer-facing column must be answerable in chat.
 *
 * The existing tests spot-check a handful of fields. That catches a regression
 * in the fields someone thought to name and nothing else, which is the wrong
 * shape of guarantee for the claim we actually make: ask about anything we hold
 * for a project and you get a real answer.
 *
 * This walks the allowlist itself. Populate every scalar in
 * PROJECT_PUBLIC_SELECT with a distinctive value, render the facts block, and
 * require every one of them to come out the other side. Add a column to the
 * schema and expose it, and this passes. Expose it but fail to project it into
 * the prompt, and this fails by name.
 *
 * The excluded set below is deliberate and small. Each entry is a field that is
 * genuinely not a fact a buyer can ask about — an identifier, a coordinate the
 * map consumes, or a flag the UI reads — and each is listed with its reason so
 * "add it to the exclusions" is a decision someone has to argue for rather than
 * the path of least resistance.
 */

/** Scalars that legitimately never appear as a stated fact. */
const NOT_BUYER_FACTS: Record<string, string> = {
  id: 'primary key — the buyer refers to a project by name',
  slug: 'routing identifier',
  created_at: 'row bookkeeping',
  updated_at: 'row bookkeeping, surfaced instead through the freshness badges',
  latitude: 'consumed by the map, meaningless as prose',
  longitude: 'consumed by the map, meaningless as prose',
  cover_image: 'rendered, not narrated',
  images: 'rendered, not narrated',
  builder_id: 'foreign key — the builder relation carries the name',

  // These three are buyer-facing on the project page but withheld from the
  // prompt by PROMPT_EXCLUDED_FIELDS, which explains each in full.
  hero_image_url: 'rendered on the card, not narrated — same as cover_image',
  rera_url: 'an off-platform link, which prompt rule 17 forbids the model from offering',
  marketing_claims: 'developer puffery; no prompt rule names it and repeating it breaks the no-exaggeration rule',
}

function scalarFieldsFromAllowlist(): string[] {
  return Object.entries(PROJECT_PUBLIC_SELECT)
    .filter(([, v]) => v === true)
    .map(([k]) => k)
    .filter(k => !(k in NOT_BUYER_FACTS))
    .filter(k => !(ALLOWED_RELATIONS as readonly string[]).includes(k))
}

/**
 * A value that survives formatting and stays greppable.
 *
 * Numbers and dates are formatted by the block, so a string sentinel is used
 * wherever the field's type is not forced.
 */
function sentinelRow(fields: string[]): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  for (const f of fields) row[f] = `SENTINEL_${f.toUpperCase()}`
  return row
}

describe('every buyer-facing column reaches the chat prompt', () => {
  const fields = scalarFieldsFromAllowlist()

  it('the allowlist is not trivially small', () => {
    // Guards against the walk silently matching nothing after a refactor and
    // reporting a green suite over zero coverage.
    assert.ok(
      fields.length > 50,
      `expected the public allowlist to carry well over 50 scalar fields, found ${fields.length}`,
    )
  })

  it('no field in the allowlist is dropped on the way to the model', () => {
    const facts = projectScalarFacts(sentinelRow(fields))
    const rendered = JSON.stringify(facts)

    const missing = fields.filter(f => !rendered.includes(`SENTINEL_${f.toUpperCase()}`))

    assert.deepEqual(
      missing,
      [],
      'these columns are exposed to buyers but never reach the prompt, so chat cannot answer ' +
        'a question about them:\n  ' +
        missing.join('\n  '),
    )
  })

  it('an absent field is omitted rather than guessed at', () => {
    // The absence of a key is the signal to the model that we do not hold the
    // fact. A placeholder here would invite exactly the fabrication the whole
    // fact-tier system exists to prevent.
    const facts = projectScalarFacts({ name: 'Test Project' })
    const keys = Object.keys(facts)
    assert.ok(keys.length > 0, 'a populated field should still render')
    for (const [k, v] of Object.entries(facts)) {
      assert.ok(v !== undefined && v !== null && v !== '', `${k} rendered as an empty value`)
      assert.ok(!/unknown|n\/?a|tbd|not available/i.test(String(v)), `${k} rendered a placeholder: ${v}`)
    }
  })

  it('nothing outside the allowlist can ride along', () => {
    const facts = projectScalarFacts({
      name: 'Test Project',
      embedding: 'SENTINEL_EMBEDDING',
      ai_search_keywords: 'SENTINEL_KEYWORDS',
      builder_theme: 'SENTINEL_THEME',
      internal_confidence: 'SENTINEL_CONFIDENCE',
    })
    const rendered = JSON.stringify(facts)
    for (const leak of ['SENTINEL_EMBEDDING', 'SENTINEL_KEYWORDS', 'SENTINEL_THEME', 'SENTINEL_CONFIDENCE']) {
      assert.ok(!rendered.includes(leak), `${leak} reached the prompt`)
    }
  })

  it('every field the block withholds is declared here', () => {
    // The two lists are the same decision recorded in two places, and the one
    // that can drift silently is this one: dropping a field in
    // projectFactsBlock without listing it turns the walk above into a failure
    // someone silences, which is how the exclusion set stops meaning anything.
    for (const field of PROMPT_EXCLUDED_FIELDS) {
      assert.ok(
        field in NOT_BUYER_FACTS,
        `${field} is withheld from the prompt but not declared in NOT_BUYER_FACTS with a reason`,
      )
    }
  })

  it('each exclusion carries a stated reason', () => {
    // Keeps the escape hatch honest: an entry with no reason is someone
    // silencing this test rather than making a call.
    for (const [field, reason] of Object.entries(NOT_BUYER_FACTS)) {
      assert.ok(reason && reason.length > 10, `${field} is excluded without a real reason`)
    }
  })
})
