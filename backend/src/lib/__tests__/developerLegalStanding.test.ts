import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildProjectFacts } from '../projectFactsBlock'

/**
 * The database contradicted itself about Amrapali, and only the reassuring half
 * reached the prompt.
 *
 *   builder.insolvency_history   true
 *   builder.legal_flag           SUPREME_COURT_RECEIVER
 *   legal_flag                   "none"
 *   project_risk_flag            "low_risk"
 *   nclt_status                  "Clean - No NCLT Moratorium"
 *
 * Only the builder row is right — the Supreme Court cancelled Amrapali's RERA
 * registrations in 2019 and handed the projects to NBCC. `buildProjectFacts`
 * projected `builder.name` and nothing else from the relation, so the model
 * never saw the disqualifying half and told a buyer the project "has a clean
 * legal standing with no active NCLT insolvency proceedings".
 */
const project = (overrides: Record<string, unknown> = {}) => ({
  id: 'p1', slug: 's', name: 'Amrapali Crystal Homes', sector: 'Sector 76', city: 'Noida',
  status: 'ready_to_move',
  legal_flag: 'none',
  project_risk_flag: 'low_risk',
  nclt_moratorium_active: false,
  litigation_count: 0,
  builder: { name: 'Amrapali Group (NBCC Supervised)', insolvency_history: true, legal_flag: 'SUPREME_COURT_RECEIVER' },
  ...overrides,
})

describe('a developer under insolvency outranks the project markers', () => {
  it('surfaces the insolvency', () => {
    const f = buildProjectFacts(project() as never) as Record<string, unknown>
    const standing = String(f.developer_legal_standing ?? '')
    assert.match(standing, /insolvency history/i)
    assert.match(standing, /SUPREME_COURT_RECEIVER/)
    assert.match(standing, /unreliable/i, 'must tell the model not to trust the project-level markers')
  })

  it('suppresses every project marker that contradicts it', () => {
    const f = buildProjectFacts(project() as never) as Record<string, unknown>
    for (const contradicted of ['legal_flag', 'project_risk_flag', 'nclt_moratorium_active', 'nclt_status', 'approvals_status']) {
      assert.ok(!(contradicted in f), `${contradicted} survived alongside the insolvency`)
    }
  })

  it('fires on a builder legal flag even without insolvency history', () => {
    const f = buildProjectFacts(
      project({ builder: { name: 'X Group', insolvency_history: false, legal_flag: 'NCLT_ADMITTED' } }) as never,
    ) as Record<string, unknown>
    assert.match(String(f.developer_legal_standing ?? ''), /NCLT_ADMITTED/)
  })

  it('stays silent, and keeps the real risk fields, for a clean developer', () => {
    // The over-correction guard. Verified against the live row for Godrej
    // Majesty: project_risk_flag moderate_risk, litigation 0, real RERA number.
    const f = buildProjectFacts(
      project({
        name: 'Godrej Majesty',
        project_risk_flag: 'moderate_risk',
        builder: { name: 'Godrej Properties', insolvency_history: false, legal_flag: null },
      }) as never,
    ) as Record<string, unknown>
    assert.ok(!('developer_legal_standing' in f), 'invented a legal standing note for a clean developer')
    assert.equal(f.project_risk_flag, 'moderate_risk')
    assert.equal(f.litigation_count, '0')
  })
})
