import { describe, it } from 'node:test'
import assert from 'node:assert'
import { checkToolBlindAnswer } from './toolBlindGuard'

// The prompt shape the chat router builds: a "Verified facts:" JSON block.
const promptWith = (projects: unknown[]) =>
  `You are an advisor.\n\nVerified facts: ${JSON.stringify({ projects })}\n\n`

const SECTOR_137 = promptWith([
  { name: 'Purvanchal Royal Park', sector: 'Sector 137', builder: { name: 'Purvanchal Projects' } },
  { name: 'Gulshan Vivante', sector: 'Sector 137', builder: { name: 'Gulshan Homz' }, rera_number: 'UPRERAPRJ12345' },
])

describe('tool-blind guard', () => {
  it('rejects a project we never gave it', () => {
    // The real 30 Aug answer, from Mistral, for "best society in sector 137".
    const answer = [
      'Ranked by verified project score for Sector 137:',
      '',
      '| Society | Builder | Recommendation Tier |',
      '| :--- | :--- | :--- |',
      '| **Shriram Suites** | Shriram Properties | STRONG_BUY |',
    ].join('\n')
    const v = checkToolBlindAnswer(answer, SECTOR_137)
    assert.ok(v.some(x => x.kind === 'unknown_name' && x.detail === 'Shriram Suites'), JSON.stringify(v))
  })

  it('accepts an answer built only from the facts it was given', () => {
    const answer = [
      '**Purvanchal Royal Park** is the stronger record here.',
      '',
      '| Society | Builder |',
      '| :--- | :--- |',
      '| **Gulshan Vivante** | Gulshan Homz |',
      '',
      'Trade-off: possession is the later of the two.',
    ].join('\n')
    assert.deepEqual(checkToolBlindAnswer(answer, SECTOR_137), [])
  })

  it('rejects an invented registration number even with no facts at all', () => {
    const answer = '| **Square Yards** | UP-RERA Form-7 No. 1023 |'
    const v = checkToolBlindAnswer(answer, 'You are an advisor.')
    assert.ok(v.some(x => x.kind === 'invented_rera'), JSON.stringify(v))
    assert.ok(v.some(x => x.kind === 'competitor' && x.detail === 'square yards'), JSON.stringify(v))
  })

  it('does not read a section heading as a project', () => {
    const answer = '**Trade-off**: possession slips to 2027.\n\n**Why It Leads**: delivery record.'
    assert.deepEqual(checkToolBlindAnswer(answer, SECTOR_137), [])
  })

  it('keeps a RERA number the prompt actually carried', () => {
    const answer = '**Gulshan Vivante** is registered as UPRERAPRJ12345.'
    assert.deepEqual(checkToolBlindAnswer(answer, SECTOR_137), [])
  })
})

describe('tool-blind guard: labels are not project claims', () => {
  // Every string here was discarded from a real answer by the first version of
  // this guard. None of them claims a building exists, and each one cost an
  // otherwise honest answer.
  it('ignores a bolded label that introduces prose', () => {
    const answer = [
      '| Factor | Reality Check |',
      '|---|---|',
      '| **Space per Rupee** | 50% more carpet area for the same budget. |',
      '| **Rental Yield** | 2.5%–3.5% gross. |',
      '| **Liquidity Risk** | Few resale buyers. |',
    ].join('\n')
    assert.deepEqual(checkToolBlindAnswer(answer, SECTOR_137), [])
  })

  it('ignores a bolded heading followed by a colon', () => {
    const answer = '**Actionable Insight**: hold for five years.\n\n**Regulatory Tailwind**: FAR raised.'
    assert.deepEqual(checkToolBlindAnswer(answer, SECTOR_137), [])
  })

  it('ignores an area, which is a place and not a building', () => {
    assert.deepEqual(checkToolBlindAnswer('**Techzone 4** is the cheaper pocket.', SECTOR_137), [])
  })

  it('still catches the project it was built to catch', () => {
    const answer = '| **Shriram Suites** | Shriram Properties | STRONG_BUY |'
    const v = checkToolBlindAnswer(answer, SECTOR_137)
    assert.ok(v.some(x => x.detail === 'Shriram Suites'), JSON.stringify(v))
  })

  it('still catches a bolded project named in prose', () => {
    const v = checkToolBlindAnswer('**Panchsheel Greens** offers 3 BHK units nearby.', SECTOR_137)
    assert.ok(v.some(x => x.detail === 'Panchsheel Greens'), JSON.stringify(v))
  })

  it('catches a name with no place word when it leads with a builder we named', () => {
    // "Sobha Quartz" carries nothing place-shaped. What gives it away is that
    // the prompt supplied Gulshan Homz and the model produced a project under
    // a builder it was given, which is the shape of the sector-137 failure.
    const v = checkToolBlindAnswer('**Gulshan Moderne** is the pick here.', SECTOR_137)
    assert.ok(v.some(x => x.detail === 'Gulshan Moderne'), JSON.stringify(v))
  })

  it('lets an unrecognisable phrase through rather than discarding an honest answer', () => {
    // Deliberate ceiling: no place word, no known builder, so it is not read as
    // a project claim. Missing one is the cheaper error than binning a good
    // answer — the blocklist that tried to catch everything binned three.
    assert.deepEqual(checkToolBlindAnswer('**Verdant Quartz** is worth a look.', SECTOR_137), [])
  })
})
