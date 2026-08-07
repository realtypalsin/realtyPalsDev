import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '../../db'
import { extractProjectIds } from '../queryPlanner'
import { discoverProjects } from '../projects'
import { generateChips } from '../../db/chipProvider'
import { Intent } from '../types'

describe('Chat Integration Tests', () => {
  let testProject: any
  let testBuilder: any

  beforeAll(async () => {
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

  afterAll(async () => {
    await prisma.project.delete({ where: { id: testProject.id } })
    await prisma.builder.delete({ where: { id: testBuilder.id } })
  })

  describe('1. Project Name Extraction (Bug Fix #1)', () => {
    it('should extract project name from payment plan query', async () => {
      const message = 'Show payment-plan options for Mahagun Mirabella?'
      const ids = await extractProjectIds(message)
      expect(ids).toContain(testProject.id)
    })

    it('should handle query with extra punctuation', async () => {
      const message = 'Tell me about the payment plans for Mahagun Mirabella in Sector 79.'
      const ids = await extractProjectIds(message)
      expect(ids).toContain(testProject.id)
    })

    it('should NOT match if project name not in message', async () => {
      const message = 'Show payment plans for Generic Project X'
      const ids = await extractProjectIds(message)
      expect(ids).not.toContain(testProject.id)
    })

    it('should handle multiple project mentions', async () => {
      const message = 'Compare payment plans: Mahagun Mirabella vs other projects'
      const ids = await extractProjectIds(message)
      expect(ids.length).toBeGreaterThan(0)
    })
  })

  describe('2. Chip Generation (Bug Fix #2)', () => {
    it('amenities chip should include projects list', async () => {
      const chips = await generateChips([testProject.id])
      const amenitiesChip = chips.find(c => c.chipId.includes('amenities'))

      if (amenitiesChip) {
        expect(amenitiesChip.payload).toHaveProperty('actionPrefix')
        expect(amenitiesChip.payload).toHaveProperty('projects')
        expect(Array.isArray(amenitiesChip.payload.projects)).toBe(true)
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
        expect(chip.payload).toHaveProperty('actionPrefix')
        expect(chip.payload).toHaveProperty('projects')
      }
    })

    it('chips should have proper payload structure for dropdown rendering', async () => {
      const chips = await generateChips([testProject.id])
      const paymentChip = chips.find(c => c.chipId.includes('payment_plan'))

      if (paymentChip) {
        const { projects } = paymentChip.payload
        expect(projects).toBeDefined()
        if (projects.length > 0) {
          expect(projects[0]).toHaveProperty('id')
          expect(projects[0]).toHaveProperty('name')
          expect(projects[0]).toHaveProperty('slug')
        }
      }
    })
  })

  describe('3. Discovery Pagination (Bug Fix #3)', () => {
    it('should return pagination metadata', async () => {
      const intent: Intent = { sector: 'Sector 79' }
      const result = await discoverProjects(intent, 0)

      expect(result).toHaveProperty('totalCount')
      expect(result).toHaveProperty('hasMore')
      expect(result).toHaveProperty('pageIndex')
      expect(typeof result.totalCount).toBe('number')
      expect(typeof result.hasMore).toBe('boolean')
    })

    it('hasMore should indicate if more results exist', async () => {
      const intent: Intent = { sector: 'Sector 79' }
      const result = await discoverProjects(intent, 0)

      if (result.totalCount! > 20) {
        expect(result.hasMore).toBe(true)
      }
    })

    it('should respect pagination offset', async () => {
      const intent: Intent = { sector: 'Sector 79' }
      const page0 = await discoverProjects(intent, 0)
      const page1 = await discoverProjects(intent, 20)

      const projects0 = [...page0.exactResults, ...page0.nearbyResults]
      const projects1 = [...page1.exactResults, ...page1.nearbyResults]

      // Projects should be different if page1 has results
      if (projects1.length > 0 && projects0.length > 0) {
        expect(projects0[0].id).not.toBe(projects1[0].id)
      }
    })

    it('should not hardcode to 6 results', async () => {
      const intent: Intent = { sector: 'Sector 79' }
      const result = await discoverProjects(intent, 0)
      const allResults = [...result.exactResults, ...result.nearbyResults]

      // If totalCount > 6, we should have MORE than 6 results OR hasMore=true
      if (result.totalCount! > 6) {
        expect(allResults.length > 6 || result.hasMore).toBe(true)
      }
    })
  })

  describe('4. Follow-up Query Context', () => {
    it('should handle follow-up payment plan question after discovery', async () => {
      // Simulate: first user asks for discovery
      const discoveryIntent: Intent = { sector: 'Sector 79' }
      const discoveryResult = await discoverProjects(discoveryIntent, 0)

      // Then user asks: "Show payment plans for Mahagun Mirabella?"
      const followUpMessage = 'Show payment-plan options for Mahagun Mirabella?'
      const projectIds = await extractProjectIds(followUpMessage)

      expect(projectIds.length).toBeGreaterThan(0)
      expect(projectIds).toContain(testProject.id)
    })

    it('should support property comparison follow-ups', async () => {
      const message = 'Compare amenities in Mahagun Mirabella vs other Sector 79 projects'
      const ids = await extractProjectIds(message)

      // Should find Mahagun Mirabella
      expect(ids).toContain(testProject.id)
    })

    it('chips from discovery should enable property selection in follow-ups', async () => {
      const chips = await generateChips([testProject.id])
      const paymentChip = chips.find(c => c.chipId.includes('payment_plan'))

      if (paymentChip) {
        const { projects, actionPrefix } = paymentChip.payload

        // User clicking chip should result in: "Show payment-plan options for Mahagun Mirabella"
        expect(projects.length).toBeGreaterThan(0)
        expect(actionPrefix).toBeDefined()
        expect(projects.some(p => p.id === testProject.id)).toBe(true)
      }
    })
  })

  describe('5. Chat Flow End-to-End', () => {
    it('complete flow: discovery -> chip click -> follow-up question', async () => {
      // Step 1: User asks for discovery
      const discoveryIntent: Intent = {
        sector: 'Sector 79',
        lifestyleKeywords: ['green', 'sports'],
      }
      const result1 = await discoverProjects(discoveryIntent, 0)
      expect(result1.exactResults.length + result1.nearbyResults.length).toBeGreaterThan(0)

      // Step 2: Generate chips
      const chipIds = (result1.exactResults.length > 0
        ? result1.exactResults
        : result1.nearbyResults
      ).map(p => p.id)

      const chips = await generateChips(chipIds)
      const paymentChip = chips.find(c => c.chipId.includes('payment_plan'))
      expect(paymentChip).toBeDefined()

      // Step 3: User clicks payment chip and asks about specific project
      if (paymentChip) {
        const followUpMsg = 'Show payment-plan options for Mahagun Mirabella?'
        const extractedIds = await extractProjectIds(followUpMsg)

        // Should successfully extract project IDs
        expect(extractedIds.length).toBeGreaterThan(0)

        // Should match the projects from chips
        const chipProjects = paymentChip.payload.projects
        expect(extractedIds.some(id => chipProjects.map(p => p.id).includes(id))).toBe(true)
      }
    })
  })

  describe('6. Edge Cases', () => {
    it('should handle empty/null parameters gracefully', async () => {
      const emptyIds = await extractProjectIds('')
      expect(Array.isArray(emptyIds)).toBe(true)
    })

    it('should not error on non-existent project names', async () => {
      const ids = await extractProjectIds('Show options for NonExistentProject123')
      expect(Array.isArray(ids)).toBe(true)
      // Should return empty array, not error
    })

    it('pagination offset should not cause errors', async () => {
      const intent: Intent = { sector: 'Sector 79' }
      const result = await discoverProjects(intent, 9999)

      expect(result).toBeDefined()
      expect(result.hasMore).toBe(false)
      expect(result.exactResults.length + result.nearbyResults.length).toBeLessThanOrEqual(20)
    })

    it('should handle very long messages', async () => {
      const longMessage = 'I am looking for a property in Sector 79 near Mahagun Mirabella. ' +
        'Could you show me the payment plan options? '.repeat(10)

      const ids = await extractProjectIds(longMessage)
      expect(Array.isArray(ids)).toBe(true)
      expect(ids).toContain(testProject.id)
    })
  })
})
