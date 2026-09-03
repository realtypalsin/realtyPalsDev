import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeRera, RERA_AMBIGUOUS_NOTE } from '../reraIntegrity'
import { projectScalarFacts } from '../projectFactsBlock'

describe('normalizeRera', () => {
  it('upper-cases and trims a real registration', () => {
    assert.equal(normalizeRera('  uprerapRJ1504 '), 'UPRERAPRJ1504')
  })

  it('rejects a status masquerading as a number', () => {
    // Two projects carry "RERA NOT APPLICABLE". It is not a claim about a
    // registration, so it needs no withholding and must not inflate the count.
    assert.equal(normalizeRera('RERA NOT APPLICABLE'), null)
    assert.equal(normalizeRera(''), null)
    assert.equal(normalizeRera(null), null)
    assert.equal(normalizeRera(42), null)
  })
})

describe('a registration number two projects claim', () => {
  const row = (rera: string) => ({
    id: 'p1', slug: 's', name: 'Godrej Palm Retreat', sector: 'Sector 150', city: 'Noida',
    status: 'under_construction', rera_number: rera,
  })

  it('is withheld, and says why rather than going silent', () => {
    // Measured 4 Sep 2026: UPRERAPRJ1504 sits on both Godrej Palm Retreat and
    // Apex Golf Avenue — different builders. 18 numbers are shared across 39
    // projects. The buyer is told to verify this number themselves, so a wrong
    // one is the most damaging field in the product.
    const facts = projectScalarFacts(row('UPRERAPRJ1504'), {
      ambiguousRera: new Set(['UPRERAPRJ1504']),
    })
    assert.ok(!('rera_number' in facts), 'an unattributable registration reached the prompt')
    // Not merely dropped: an absent rera_number reads as "unregistered", which
    // is a different and worse claim than "we cannot confirm which is yours".
    assert.equal(facts.rera_number_status, RERA_AMBIGUOUS_NOTE)
  })

  it('leaves an unambiguous number alone', () => {
    const facts = projectScalarFacts(row('UPRERAPRJ7047'), {
      ambiguousRera: new Set(['UPRERAPRJ1504']),
    })
    assert.equal(facts.rera_number, 'UPRERAPRJ7047')
    assert.ok(!('rera_number_status' in facts))
  })

  it('renders normally when the caller has not loaded the set', () => {
    // A caller that has not loaded the set — or a database read that failed —
    // must not start withholding registrations for projects it knows nothing
    // about. Empty set and undefined both mean "render as before".
    assert.equal(projectScalarFacts(row('UPRERAPRJ1504')).rera_number, 'UPRERAPRJ1504')
    assert.equal(
      projectScalarFacts(row('UPRERAPRJ1504'), { ambiguousRera: new Set() }).rera_number,
      'UPRERAPRJ1504',
    )
  })
})
