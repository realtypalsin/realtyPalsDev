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

  it('does not repeat the compare control that is already on the card ribbon', () => {
    // Replaced "offers a comparison when there is a shortlist to compare".
    // The cards carry their own compare control, so a chip that says
    // "Compare A and B" spends one of three slots repeating a button an inch
    // away — and picks which two for the buyer, out of however many are shown.
    const chips = buildAdaptiveChips(
      base({ projects: [{ name: 'ACE Parkway' }, { name: 'ATS Pristine' }] }),
    )
    assert.ok(!chips.some((c) => /^Compare/.test(c.label)), JSON.stringify(chips.map((c) => c.label)))
  })

  it('lets the buyer pick which project, instead of guessing the first card', () => {
    const chips = buildAdaptiveChips(base({
      projects: [
        { id: 'a', name: 'ACE Parkway' },
        { id: 'b', name: 'ATS Pristine' },
        { id: 'c', name: 'Godrej Nest' },
      ],
    }))
    const picker = chips.find((c) => /Full cost of…/.test(c.label))
    assert.ok(picker, 'no cost picker offered')
    const projects = (picker!.payload as { projects?: Array<{ id: string; name: string }> }).projects
    // MessageBubble renders a dropdown for any chip carrying >1 project.
    assert.equal(projects?.length, 3)
    assert.deepEqual(projects?.map((p) => p.name), ['ACE Parkway', 'ATS Pristine', 'Godrej Nest'])
  })

  it('names the project outright when only one of them is identified', () => {
    // A dropdown with a single entry is a worse button.
    const chips = buildAdaptiveChips(base({
      projects: [{ id: 'a', name: 'ACE Parkway' }, { name: 'ATS Pristine' }],
    }))
    assert.ok(chips.some((c) => /Full cost of ACE Parkway/.test(c.label)), JSON.stringify(chips.map((c) => c.label)))
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

  /**
   * This replaces "returns nothing rather than filler when there is nothing to
   * offer", which pinned the old ending deliberately and correctly for what this
   * file could see. It could not see the question. An empty row was what scored
   * 1/5 and 2/5 on chips across half the audited shapes, so the contract changed:
   * never fewer than two, and never a row that is only filters.
   */
  it('never returns fewer than two chips, even with nothing on screen', () => {
    const chips = buildAdaptiveChips(base())
    assert.ok(chips.length >= 2, `floor breached: ${chips.length}`)
  })

  it('never returns a row that is only input requests', () => {
    for (const msg of [
      '',
      'I earn 2 lakh a month, what can I afford?',
      'what do you think of Investors Clinic',
      'is Sector 135 flood prone',
      'what have I told you so far',
      'what is the rental yield in Noida',
    ]) {
      const chips = buildAdaptiveChips(base({ userMessage: msg }))
      assert.ok(chips.length >= 2, `floor breached on "${msg}": ${chips.length}`)
      assert.ok(
        chips.some((c) => c.tone !== 'ask'),
        `only filters offered on "${msg}"`,
      )
      assert.equal(new Set(chips.map((c) => c.label)).size, chips.length, `duplicate label on "${msg}"`)
      for (const c of chips) {
        const text = c.payload.text as string
        assert.ok(typeof text === 'string' && text.length > 15, `weak payload on "${msg}": ${text}`)
      }
    }
  })

  it('offers the topic follow-up, not the floor, when the question has a topic', () => {
    const chips = buildAdaptiveChips(base({ userMessage: 'I earn 2 lakh a month, what can I afford?' }))
    assert.ok(
      chips.some((c) => c.id.startsWith('topic_afford_')),
      `no affordability chip: ${chips.map((c) => c.id).join(', ')}`,
    )
  })
})
