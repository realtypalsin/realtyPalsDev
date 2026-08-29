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
    assert.ok(chips.length > 0)
    assert.ok(chips.some((c) => /Full cost of ACE Parkway/.test(c.label)))
  })

  it('asks three different questions about one project, not one question thrice', () => {
    // Shipped bug: a focused project produced "Full cost of X", "Payment plans
    // for X" and "Is X RERA clean?" — three taps, one subject, two of them the
    // same subject. Cost, legal status and alternatives are three decisions.
    const chips = buildAdaptiveChips(base({ focusedProject: { name: 'ACE Parkway' } }))
    assert.ok(chips.some((c) => /cost/i.test(c.label)), 'no money question')
    assert.ok(chips.some((c) => /rera/i.test(c.label)), 'no trust question')
    assert.ok(
      chips.some((c) => /competes|alternatives/i.test(c.label)),
      'no alternatives question',
    )
  })

  it('a shortlist never spends every chip on the first card', () => {
    // Shipped bug: "Compare A and B" plus "Full cost of A" plus "Payment plans
    // for A" — a buyer looking at six projects was offered three taps into one.
    const chips = buildAdaptiveChips(
      base({
        projects: [{ name: 'Godrej Majesty' }, { name: 'ATS Pristine' }, { name: 'ACE Divino' }],
        sectors: ['Sector 12'],
        rendered: 'projects',
      }),
    )
    const onlyAboutTheFirst = chips.filter(
      (c) => c.label.includes('Godrej Majesty') && !c.label.includes('ATS Pristine'),
    )
    assert.ok(
      onlyAboutTheFirst.length <= 1,
      `${onlyAboutTheFirst.length} chips anchored on the first card alone: ${chips.map((c) => c.label).join(' / ')}`,
    )
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
    // One sector chip, not one per sector: two chips differing only in which
    // sector they name are the same question asked twice.
    const chips = buildAdaptiveChips(
      base({ rendered: 'sector-comparison', sectors: ['Sector 150', 'Sector 128'] }),
    )
    assert.ok(chips.some((c) => /What's for sale in Sector 150/.test(c.label)))
    assert.equal(chips.filter((c) => /What's for sale in/.test(c.label)).length, 1)
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
