import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  PROJECT_PUBLIC_SELECT,
  INTERNAL_ONLY_FIELDS,
  FORBIDDEN_RELATIONS,
  ALLOWED_RELATIONS,
  assertNoForbiddenRelations,
  redactProject,
  isPublicField,
} from '../projectExposure'

// ─── Parse the Project model straight out of schema.prisma ───────────────────
// The point of this suite is that adding a column cannot silently expose it, and
// cannot silently hide it either — it has to be classified in one list or the
// other, deliberately.

const schema = readFileSync(join(__dirname, '../../../prisma/schema.prisma'), 'utf8')

function projectModelBody(): string {
  const start = schema.indexOf('\nmodel Project {')
  assert.ok(start !== -1, 'Project model not found in schema.prisma')
  const end = schema.indexOf('\n}', start)
  return schema.slice(start, end)
}

interface Field { name: string; type: string; isRelation: boolean }

function parseFields(): Field[] {
  const relationModels = new Set(
    [...schema.matchAll(/^model\s+(\w+)\s*\{/gm)].map(m => m[1]),
  )
  const fields: Field[] = []
  for (const raw of projectModelBody().split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('//') || line.startsWith('@@') || line.startsWith('model ')) continue
    const m = line.match(/^(\w+)\s+(\S+)/)
    if (!m) continue
    const [, name, type] = m
    const bare = type.replace(/[\[\]?]/g, '')
    fields.push({ name, type, isRelation: relationModels.has(bare) })
  }
  return fields
}

const FIELDS = parseFields()
const SCALARS = FIELDS.filter(f => !f.isRelation)
const RELATIONS = FIELDS.filter(f => f.isRelation)

describe('projectExposure — schema coverage', () => {
  it('parses a plausible Project model', () => {
    assert.ok(SCALARS.length > 100, `expected 100+ scalars, parsed ${SCALARS.length}`)
    assert.ok(RELATIONS.length > 10, `expected 10+ relations, parsed ${RELATIONS.length}`)
  })

  it('classifies every scalar column as either public or internal', () => {
    const unclassified = SCALARS
      .map(f => f.name)
      .filter(n => !isPublicField(n) && !(n in INTERNAL_ONLY_FIELDS))

    assert.deepEqual(
      unclassified,
      [],
      `Unclassified Project column(s): ${unclassified.join(', ')}.\n` +
        'Add each to PROJECT_PUBLIC_SELECT (buyer may see it) or to ' +
        'INTERNAL_ONLY_FIELDS with a reason (must never leave the server).',
    )
  })

  it('never marks a column both public and internal', () => {
    const both = Object.keys(INTERNAL_ONLY_FIELDS).filter(isPublicField)
    assert.deepEqual(both, [], `Column(s) in both lists: ${both.join(', ')}`)
  })

  it('classifies every relation as allowed or forbidden', () => {
    const known = new Set<string>([...ALLOWED_RELATIONS, ...FORBIDDEN_RELATIONS])
    const unclassified = RELATIONS.map(r => r.name).filter(n => !known.has(n))
    assert.deepEqual(
      unclassified,
      [],
      `Unclassified Project relation(s): ${unclassified.join(', ')}. ` +
        'A relation to another user\'s data belongs in FORBIDDEN_RELATIONS.',
    )
  })

  it('keeps the known PII relations forbidden', () => {
    // These point at SavedProperty / ChatSession / PropertyFeedback rows belonging
    // to other people. Selecting one puts their data into an LLM prompt.
    for (const relation of ['saved_by', 'chat_sessions', 'property_feedback']) {
      assert.ok(
        (FORBIDDEN_RELATIONS as readonly string[]).includes(relation),
        `${relation} must stay forbidden`,
      )
      assert.ok(!(ALLOWED_RELATIONS as readonly string[]).includes(relation))
    }
  })

  it('never exposes the pgvector embedding or the internal retrieval keywords', () => {
    assert.equal(isPublicField('embedding'), false)
    assert.equal(isPublicField('ai_search_keywords'), false)
    assert.equal(isPublicField('builder_theme'), false)
  })

  it('does expose the legal disclosure fields — buyers are entitled to these', () => {
    for (const f of [
      'rera_number', 'legal_flag', 'legal_flag_detail', 'nclt_status',
      'registry_status', 'litigation_count', 'oc_obtained', 'possession_confidence',
    ]) {
      assert.ok(isPublicField(f), `${f} must remain visible to buyers`)
    }
  })
})

describe('assertNoForbiddenRelations', () => {
  it('throws on a PII relation', () => {
    for (const relation of FORBIDDEN_RELATIONS) {
      assert.throws(
        () => assertNoForbiddenRelations({ builder: true, [relation]: true }),
        /must never be selected/,
        relation,
      )
    }
  })

  it('allows an ordinary include', () => {
    assert.doesNotThrow(() =>
      assertNoForbiddenRelations({ builder: true, amenities: true, cost_sheet: true }),
    )
  })

  it('ignores a relation key explicitly set false', () => {
    assert.doesNotThrow(() => assertNoForbiddenRelations({ saved_by: false }))
  })
})

describe('redactProject', () => {
  it('drops internal columns from a row fetched elsewhere', () => {
    const redacted = redactProject({
      id: 'p1',
      name: 'Ace Hanei',
      embedding: [0.1, 0.2],
      ai_search_keywords: ['luxury', 'metro'],
      builder_theme: { primaryColor: '#fff', active_until: '2027-01-01' },
      builder_id: 'b1',
    })

    assert.equal(redacted.name, 'Ace Hanei')
    assert.equal(redacted.id, 'p1')
    assert.ok(!('embedding' in redacted))
    assert.ok(!('ai_search_keywords' in redacted))
    assert.ok(!('builder_theme' in redacted))
    assert.ok(!('builder_id' in redacted))
  })

  it('drops PII relations even when a caller passes them in', () => {
    const redacted = redactProject({
      id: 'p1',
      saved_by: [{ user_id: 'someone-else' }],
      chat_sessions: [{ id: 'their-session' }],
      property_feedback: [{ user_id: 'another' }],
    })
    for (const relation of FORBIDDEN_RELATIONS) {
      assert.ok(!(relation in redacted), relation)
    }
  })

  it('preserves allowed relations untouched', () => {
    const amenities = [{ name: 'Pool' }]
    const redacted = redactProject({ id: 'p1', amenities, cost_sheet: { base_price_per_sqft: 10000 } })
    assert.deepEqual(redacted.amenities, amenities)
    assert.ok('cost_sheet' in redacted)
  })

  it('is a no-op on an already-clean row', () => {
    const row = { id: 'p1', name: 'X', sector: 'Sector 150' }
    assert.deepEqual(redactProject(row), row)
  })
})
