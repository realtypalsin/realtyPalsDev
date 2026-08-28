import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildAdaptiveChips, type AnsweredContext } from './adaptiveChips'

const base = (over: Partial<AnsweredContext> = {}): AnsweredContext => ({
  projects: [],
  sectors: [],
  rendered: null,
  missingFields: [],
  focusedProject: null,
  ...over,
})

describe('adaptive chips', () => {
  it('names the project the buyer is actually looking at', () => {
    // The point of building these in code: a chip can name a project that is
    // genuinely on screen, because we are the ones who put it there. The model
    // call this replaces was guessing from a transcript.
    const chips = buildAdaptiveChips(base({ focusedProject: { name: 'ACE Parkway' } }))
    assert.ok(chips.every((c) => c.label.includes('ACE Parkway')))
    assert.match(chips[0].label, /Full cost of ACE Parkway/)
  })

  it('offers a comparison when there is a shortlist to compare', () => {
    const chips = buildAdaptiveChips(
      base({ projects: [{ name: 'ACE Parkway' }, { name: 'ATS Pristine' }] }),
    )
    assert.match(chips[0].label, /Compare ACE Parkway and ATS Pristine/)
  })

  it('does not offer a comparison of one thing', () => {
    const chips = buildAdaptiveChips(base({ projects: [{ name: 'ACE Parkway' }] }))
    assert.ok(!chips.some((c) => /^Compare/.test(c.label)))
  })

  it('follows a sector comparison with what is for sale there', () => {
    const chips = buildAdaptiveChips(
      base({ rendered: 'sector-comparison', sectors: ['Sector 150', 'Sector 128'] }),
    )
    assert.match(chips[0].label, /What's for sale in Sector 150/)
    assert.match(chips[1].label, /What's for sale in Sector 128/)
  })

  it('follows a payment schedule with the EMI question', () => {
    const chips = buildAdaptiveChips(base({ rendered: 'payment' }))
    assert.match(chips[0].label, /EMI/)
  })

  it('follows a cost sheet with the statutory charges', () => {
    const chips = buildAdaptiveChips(base({ rendered: 'cost' }))
    assert.match(chips[0].label, /Stamp duty/)
  })

  it('asks for budget before anything else when nothing is known', () => {
    // Budget constrains every other field, so it is the one worth asking first.
    const chips = buildAdaptiveChips(
      base({ missingFields: ['sector', 'bhk', 'budgetMax'] }),
    )
    assert.match(chips[0].label, /budget/i)
  })

  it('never asks for a field the buyer already gave', () => {
    const chips = buildAdaptiveChips(base({ missingFields: ['sector'] }))
    assert.ok(!chips.some((c) => /budget/i.test(c.label)))
    assert.ok(!chips.some((c) => /3 BHK/.test(c.label)))
  })

  it('caps at three and never repeats a label', () => {
    const chips = buildAdaptiveChips(
      base({
        focusedProject: { name: 'ACE Parkway' },
        projects: [{ name: 'ACE Parkway' }, { name: 'ATS Pristine' }],
        rendered: 'projects',
        missingFields: ['budgetMax', 'bhk', 'sector'],
      }),
    )
    assert.ok(chips.length <= 3, `got ${chips.length} chips`)
    assert.equal(new Set(chips.map((c) => c.label)).size, chips.length)
  })

  it('every chip carries text a buyer could have typed', () => {
    // A chip whose payload is a fragment sends a fragment to the chat, which is
    // then answered as a fragment.
    const chips = buildAdaptiveChips(
      base({ projects: [{ name: 'ACE Parkway' }, { name: 'ATS Pristine' }] }),
    )
    for (const c of chips) {
      const text = c.payload.text as string
      assert.ok(typeof text === 'string' && text.length > 15, `weak payload: ${text}`)
    }
  })

  it('returns nothing rather than filler when there is nothing to offer', () => {
    assert.deepEqual(buildAdaptiveChips(base()), [])
  })
})
