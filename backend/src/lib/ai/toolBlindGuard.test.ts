import { describe, it, test } from 'node:test'
import assert from 'node:assert'
import { checkToolBlindAnswer, setKnownNamesForTest } from './toolBlindGuard'
import { prisma } from '../db'

// The prompt shape the chat router builds: a "Verified facts:" JSON block.
const promptWith = (projects: unknown[]) =>
  `You are an advisor.\n\nVerified facts: ${JSON.stringify({ projects })}\n\n`

const SECTOR_137 = promptWith([
  { name: 'Purvanchal Royal Park', sector: 'Sector 137', builder: { name: 'Purvanchal Projects' } },
  { name: 'Gulshan Vivante', sector: 'Sector 137', builder: { name: 'Gulshan Homz' }, rera_number: 'UPRERAPRJ12345' },
])

// These tests assert on the name rules, not on what is in Postgres today, so
// the snapshot the guard would otherwise load is primed with a fixed stand-in.
setKnownNamesForTest({
  projects: ['Purvanchal Royal Park', 'Gulshan Vivante', 'Ace Hanei'],
  builders: ['Purvanchal Projects', 'Gulshan Homz', 'Ace Group', 'Godrej Properties', 'Omaxe Ltd'],
})

describe('tool-blind guard', () => {
  it('rejects a project we never gave it', async () => {
    // The real 30 Aug answer, from Mistral, for "best society in sector 137".
    const answer = [
      'Ranked by verified project score for Sector 137:',
      '',
      '| Society | Builder | Recommendation Tier |',
      '| :--- | :--- | :--- |',
      '| **Shriram Suites** | Shriram Properties | STRONG_BUY |',
    ].join('\n')
    const v = await checkToolBlindAnswer(answer, SECTOR_137)
    assert.ok(v.some(x => x.kind === 'unknown_name' && x.detail === 'Shriram Suites'), JSON.stringify(v))
  })

  it('accepts an answer built only from the facts it was given', async () => {
    const answer = [
      '**Purvanchal Royal Park** is the stronger record here.',
      '',
      '| Society | Builder |',
      '| :--- | :--- |',
      '| **Gulshan Vivante** | Gulshan Homz |',
      '',
      'Trade-off: possession is the later of the two.',
    ].join('\n')
    assert.deepEqual(await checkToolBlindAnswer(answer, SECTOR_137), [])
  })

  it('rejects an invented registration number even with no facts at all', async () => {
    const answer = '| **Square Yards** | UP-RERA Form-7 No. 1023 |'
    const v = await checkToolBlindAnswer(answer, 'You are an advisor.')
    assert.ok(v.some(x => x.kind === 'invented_rera'), JSON.stringify(v))
    assert.ok(v.some(x => x.kind === 'competitor' && x.detail === 'square yards'), JSON.stringify(v))
  })

  it('does not read a section heading as a project', async () => {
    const answer = '**Trade-off**: possession slips to 2027.\n\n**Why It Leads**: delivery record.'
    assert.deepEqual(await checkToolBlindAnswer(answer, SECTOR_137), [])
  })

  it('keeps a RERA number the prompt actually carried', async () => {
    const answer = '**Gulshan Vivante** is registered as UPRERAPRJ12345.'
    assert.deepEqual(await checkToolBlindAnswer(answer, SECTOR_137), [])
  })
})

describe('tool-blind guard: labels are not project claims', () => {
  // Every string here was discarded from a real answer by the first version of
  // this guard. None of them claims a building exists, and each one cost an
  // otherwise honest answer.
  it('ignores a bolded label that introduces prose', async () => {
    const answer = [
      '| Factor | Reality Check |',
      '|---|---|',
      '| **Space per Rupee** | 50% more carpet area for the same budget. |',
      '| **Rental Yield** | 2.5%–3.5% gross. |',
      '| **Liquidity Risk** | Few resale buyers. |',
    ].join('\n')
    assert.deepEqual(await checkToolBlindAnswer(answer, SECTOR_137), [])
  })

  it('ignores a bolded heading followed by a colon', async () => {
    const answer = '**Actionable Insight**: hold for five years.\n\n**Regulatory Tailwind**: FAR raised.'
    assert.deepEqual(await checkToolBlindAnswer(answer, SECTOR_137), [])
  })

  it('ignores an area, which is a place and not a building', async () => {
    assert.deepEqual(await checkToolBlindAnswer('**Techzone 4** is the cheaper pocket.', SECTOR_137), [])
  })

  it('still catches the project it was built to catch', async () => {
    const answer = '| **Shriram Suites** | Shriram Properties | STRONG_BUY |'
    const v = await checkToolBlindAnswer(answer, SECTOR_137)
    assert.ok(v.some(x => x.detail === 'Shriram Suites'), JSON.stringify(v))
  })

  it('still catches a bolded project named in prose', async () => {
    const v = await checkToolBlindAnswer('**Panchsheel Greens** offers 3 BHK units nearby.', SECTOR_137)
    assert.ok(v.some(x => x.detail === 'Panchsheel Greens'), JSON.stringify(v))
  })

  it('catches a name with no place word when it leads with a builder we named', async () => {
    // "Sobha Quartz" carries nothing place-shaped. What gives it away is that
    // the prompt supplied Gulshan Homz and the model produced a project under
    // a builder it was given, which is the shape of the sector-137 failure.
    const v = await checkToolBlindAnswer('**Gulshan Moderne** is the pick here.', SECTOR_137)
    assert.ok(v.some(x => x.detail === 'Gulshan Moderne'), JSON.stringify(v))
  })

  it('lets an unrecognisable phrase through rather than discarding an honest answer', async () => {
    // Deliberate ceiling: no place word, no known builder, so it is not read as
    // a project claim. Missing one is the cheaper error than binning a good
    // answer — the blocklist that tried to catch everything binned three.
    assert.deepEqual(await checkToolBlindAnswer('**Verdant Quartz** is worth a look.', SECTOR_137), [])
  })
})

describe('tool-blind guard: the database is the reference set, not just the prompt', () => {
  // The 30 Aug affordability turn. A GATHERING turn retrieves no projects, so
  // the facts block was empty and the guard had nothing to compare against.
  // Mistral answered with six projects, four hung on builders we really hold.
  const NO_FACTS = 'You are an advisor. Answer from what you were given.'

  it('catches an invented project hung on a builder we hold, with no prompt facts', async () => {
    const answer = 'Look at **Godrej Aristocrat** and **Omaxe The Mayfair** in this budget.'
    const v = await checkToolBlindAnswer(answer, NO_FACTS)
    assert.ok(v.some(x => x.detail === 'Godrej Aristocrat'), JSON.stringify(v))
    assert.ok(v.some(x => x.detail === 'Omaxe The Mayfair'), JSON.stringify(v))
  })

  it('catches an invented project by its place word, with no prompt facts', async () => {
    const v = await checkToolBlindAnswer('**Metro Heights** fits at this budget.', NO_FACTS)
    assert.ok(v.some(x => x.detail === 'Metro Heights'), JSON.stringify(v))
  })

  it('clears a project we actually hold, with no prompt facts', async () => {
    assert.deepEqual(await checkToolBlindAnswer('**Ace Hanei** is worth a look.', NO_FACTS), [])
  })

  it('falls back to prompt facts when the database cannot be read', async () => {
    // A guard that cannot reach the database must not fail a turn the database
    // would have cleared. With no snapshot and no facts there is no reference
    // set, so a name claim cannot be judged and is left alone.
    setKnownNamesForTest(null)
    const originalFindMany = (prisma as unknown as { project: { findMany: unknown } }).project.findMany
    ;(prisma as unknown as { project: { findMany: unknown } }).project.findMany = async () => { throw new Error('db down') }
    try {
      assert.deepEqual(await checkToolBlindAnswer('**Metro Heights** fits at this budget.', NO_FACTS), [])
    } finally {
      (prisma as unknown as { project: { findMany: unknown } }).project.findMany = originalFindMany
      setKnownNamesForTest({
        projects: ['Purvanchal Royal Park', 'Gulshan Vivante', 'Ace Hanei'],
        builders: ['Purvanchal Projects', 'Gulshan Homz', 'Ace Group', 'Godrej Properties', 'Omaxe Ltd'],
      })
    }
  })

  it('still catches a competitor when the database is unreachable', async () => {
    setKnownNamesForTest(null)
    const original = (prisma as unknown as { project: { findMany: unknown } }).project.findMany
    ;(prisma as unknown as { project: { findMany: unknown } }).project.findMany = async () => { throw new Error('db down') }
    try {
      const v = await checkToolBlindAnswer('Try **99acres** for listings.', NO_FACTS)
      assert.ok(v.some(x => x.kind === 'competitor'), JSON.stringify(v))
    } finally {
      (prisma as unknown as { project: { findMany: unknown } }).project.findMany = original
    }
  })
})

test('a registration number we hold is not an invention', async () => {
  // The guard checked RERA claims only against numbers scraped out of the
  // prompt text. On a turn where the model CALLS a tool, the number comes back
  // in the tool result and is never in the prompt — so a correct number read
  // from our own row was reported as invented and the answer discarded. Both
  // of these are real rows; zero of our 280 projects lack a registration.
  setKnownNamesForTest({
    projects: ['Amrapali Silicon City', 'Samridhi Daksh Avenue'],
    builders: ['Amrapali Group'],
    rera: ['UPRERAPRJ76128', 'UPRERAPRJ168120'],
  })
  const held = await checkToolBlindAnswer(
    'Amrapali Silicon City is registered under UPRERAPRJ76128 and holds an Occupancy Certificate.',
    'Verified facts: Amrapali Silicon City, Sector 76.',
  )
  assert.deepEqual(held.filter(v => v.kind === 'invented_rera'), [])

  // The same phrasing with a number we do not hold still fails.
  const invented = await checkToolBlindAnswer(
    'Skyline Residency is registered under UPRERAPRJ999999.',
    'Verified facts: Amrapali Silicon City, Sector 76.',
  )
  assert.equal(invented.some(v => v.kind === 'invented_rera'), true)
  setKnownNamesForTest(null)
})
