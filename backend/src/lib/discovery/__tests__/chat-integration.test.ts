import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { prisma } from '../../db'
import { extractProjectIds } from '../queryPlanner'
import { discoverProjects } from '../projects'
import { generateChips } from '../../db/chipProvider'
import { Intent } from '../types'

describe('Chat Integration Tests', () => {
  let testProject: any
  let testBuilder: any

  before(async () => {
    // Setup: Create test data
    testBuilder = await prisma.builder.create({
      data: { name: 'Test Builder', slug: 'test-builder' },
    })

    testProject = await prisma.project.create({
      data: {
        name: 'Mahagun Mirabella',
        slug: 'mahagun-mirabella',
        builder_id: testBuilder.id,
        sector: 'Sector 79',
        city: 'Noida',
        status: 'under_construction',
        possession_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    })
  })

  after(async () => {
    if (testProject?.id) await prisma.project.delete({ where: { id: testProject.id } }).catch(() => {})
    if (testBuilder?.id) await prisma.builder.delete({ where: { id: testBuilder.id } }).catch(() => {})
  })

  describe('1. Project Name Extraction (Bug Fix #1)', () => {
    it('should extract project name from payment plan query', async () => {
      const message = 'Show payment-plan options for Mahagun Mirabella?'
      const ids = await extractProjectIds(message)
      assert(ids.includes(testProject.id))
    })

    it('should handle query with extra punctuation', async () => {
      const message = 'Tell me about the payment plans for Mahagun Mirabella in Sector 79.'
      const ids = await extractProjectIds(message)
      assert(ids.includes(testProject.id))
    })

    it('should NOT match if project name not in message', async () => {
      const message = 'Show payment plans for Generic Project X'
      const ids = await extractProjectIds(message)
      assert(!ids.includes(testProject.id))
    })

    it('should handle multiple project mentions', async () => {
      const message = 'Compare payment plans: Mahagun Mirabella vs other projects'
      const ids = await extractProjectIds(message)
      assert(ids.length > 0)
    })
  })

  describe('2. Chip Generation (Bug Fix #2)', () => {
    it('amenities chip should include projects list', async () => {
      const chips = await generateChips([testProject.id])
      const amenitiesChip = chips.find(c => c.chipId.includes('amenities'))

      if (amenitiesChip) {
        assert.ok('actionPrefix' in amenitiesChip.payload)
        assert.ok('projects' in amenitiesChip.payload)
        assert.equal(Array.isArray(amenitiesChip.payload.projects), true)
      }
    })

    it('all property selector chips should have consistent structure', async () => {
      const chips = await generateChips([testProject.id])
      const dynamicChips = chips.filter(c =>
        c.chipId.includes('payment_plan') ||
        c.chipId.includes('amenities') ||
        c.chipId.includes('connectivity')
      )

      for (const chip of dynamicChips) {
        assert.ok('actionPrefix' in chip.payload)
        assert.ok('projects' in chip.payload)
      }
    })

    it('chips should have proper payload structure for dropdown rendering', async () => {
      const chips = await generateChips([testProject.id])
      const paymentChip = chips.find(c => c.chipId.includes('payment_plan'))

      if (paymentChip) {
        const { projects } = paymentChip.payload
        assert.ok(projects)
        if (projects.length > 0) {
          assert.ok('id' in projects[0])
          assert.ok('name' in projects[0])
          assert.ok('slug' in projects[0])
        }
      }
    })
  })

  describe('3. Discovery Pagination (Bug Fix #3)', () => {
    it('should return pagination metadata', async () => {
      const intent: Intent = { sector: 'Sector 79' }
      const result = await discoverProjects(intent, 0)

      assert.ok('totalCount' in result)
      assert.ok('hasMore' in result)
      assert.ok('pageIndex' in result)
      assert.equal(typeof result.totalCount, 'number')
      assert.equal(typeof result.hasMore, 'boolean')
    })

    it('hasMore should indicate if more results exist', async () => {
      const intent: Intent = { sector: 'Sector 79' }
      const result = await discoverProjects(intent, 0)

      if (result.totalCount! > 20) {
        assert.equal(result.hasMore, true)
      }
    })

    it('should respect pagination offset', async () => {
      const intent: Intent = { sector: 'Sector 79' }
      const page0 = await discoverProjects(intent, 0)
      const page1 = await discoverProjects(intent, 20)

      const projects0 = [...page0.exactResults, ...page0.nearbyResults]
      const projects1 = [...page1.exactResults, ...page1.nearbyResults]

      if (projects1.length > 0 && projects0.length > 0) {
        assert.notEqual(projects0[0].id, projects1[0].id)
      }
    })

    it('should not hardcode to 6 results', async () => {
      const intent: Intent = { sector: 'Sector 79' }
      const result = await discoverProjects(intent, 0)
      const allResults = [...result.exactResults, ...result.nearbyResults]

      if (result.totalCount! > 6) {
        assert(allResults.length > 6 || result.hasMore)
      }
    })
  })

  describe('4. Follow-up Query Context', () => {
    it('should handle follow-up payment plan question after discovery', async () => {
      const discoveryIntent: Intent = { sector: 'Sector 79' }
      await discoverProjects(discoveryIntent, 0)

      const followUpMessage = 'Show payment-plan options for Mahagun Mirabella?'
      const projectIds = await extractProjectIds(followUpMessage)

      assert(projectIds.length > 0)
      assert(projectIds.includes(testProject.id))
    })

    it('should support property comparison follow-ups', async () => {
      const message = 'Compare amenities in Mahagun Mirabella vs other Sector 79 projects'
      const ids = await extractProjectIds(message)

      assert(ids.includes(testProject.id))
    })

    it('chips from discovery should enable property selection in follow-ups', async () => {
      const chips = await generateChips([testProject.id])
      const paymentChip = chips.find(c => c.chipId.includes('payment_plan'))

      if (paymentChip) {
        const { projects, actionPrefix } = paymentChip.payload

        assert(projects.length > 0)
        assert.ok(actionPrefix)
        assert(projects.some((p: any) => p.id === testProject.id))
      }
    })
  })

  describe('5. Chat Flow End-to-End', () => {
    it('complete flow: discovery -> chip click -> follow-up question', async () => {
      const discoveryIntent: Intent = {
        sector: 'Sector 79',
        lifestyleKeywords: ['green', 'sports'],
      }
      const result1 = await discoverProjects(discoveryIntent, 0)
      assert(result1.exactResults.length + result1.nearbyResults.length > 0)

      const chipIds = (result1.exactResults.length > 0
        ? result1.exactResults
        : result1.nearbyResults
      ).map(p => p.id)

      const chips = await generateChips(chipIds)
      const paymentChip = chips.find(c => c.chipId.includes('payment_plan'))
      assert.ok(paymentChip)

      if (paymentChip) {
        const followUpMsg = 'Show payment-plan options for Mahagun Mirabella?'
        const extractedIds = await extractProjectIds(followUpMsg)

        assert(extractedIds.length > 0)

        const chipProjects = paymentChip.payload.projects
        assert(extractedIds.some(id => chipProjects.map((p: any) => p.id).includes(id)))
      }
    })
  })

  describe('6. Edge Cases', () => {
    it('should handle empty/null parameters gracefully', async () => {
      const emptyIds = await extractProjectIds('')
      assert.equal(Array.isArray(emptyIds), true)
    })

    it('should not error on non-existent project names', async () => {
      const ids = await extractProjectIds('Show options for NonExistentProject123')
      assert.equal(Array.isArray(ids), true)
    })

    it('pagination offset should not cause errors', async () => {
      const intent: Intent = { sector: 'Sector 79' }
      const result = await discoverProjects(intent, 9999)

      assert.ok(result)
      assert.equal(result.hasMore, false)
      assert(result.exactResults.length + result.nearbyResults.length <= 20)
    })

    it('should handle very long messages', async () => {
      const longMessage = 'I am looking for a property in Sector 79 near Mahagun Mirabella. ' +
        'Could you show me the payment plan options? '.repeat(10)

      const ids = await extractProjectIds(longMessage)
      assert.equal(Array.isArray(ids), true)
      assert(ids.includes(testProject.id))
    })
  })
})
