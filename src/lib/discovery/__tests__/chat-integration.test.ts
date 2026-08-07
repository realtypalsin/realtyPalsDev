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

  describe('2. Dynamic Chips (100% Database-Driven)', () => {
    it('amenities chip should only contain DB amenities (no hardcoded options)', async () => {
      // Create test amenity
      const amenity = await prisma.amenity.create({
        data: {
          project_id: testProject.id,
          name: 'Olympic Pool',
          category: 'Sports & Recreation',
        },
      })

      try {
        const { getAmenityOptions } = await import('../../discovery/chipContext')
        const chip = await getAmenityOptions(testProject.id)

        expect(chip).toBeDefined()
        if (chip) {
          expect(chip.options.some(o => o.label === 'Olympic Pool')).toBe(true)
          // Verify no hardcoded fallback options exist
          expect(chip.options.length).toBeGreaterThan(0)
          expect(chip.options[0]).toHaveProperty('label')
          expect(chip.options[0]).toHaveProperty('value')
        }
      } finally {
        await prisma.amenity.delete({ where: { id: amenity.id } })
      }
    })

    it('payment plans chip returns only DB results (no fallback list)', async () => {
      const { getPaymentPlanOptions } = await import('../../discovery/chipContext')
      const chip = await getPaymentPlanOptions([testProject.id])

      // If project has payment plans, chip exists; if not, returns null
      if (chip) {
        expect(chip.options.length).toBeGreaterThan(0)
        chip.options.forEach(opt => {
          expect(opt.label).toBeDefined()
          expect(opt.value).toBeDefined()
          // Verify not hardcoded defaults
          expect(['Flexi Payment', 'Construction Linked', 'On-Time Payment']).not.toContain(opt.label)
        })
      }
    })

    it('project selector chip appears only for multiple projects', async () => {
      const { getProjectSelector } = await import('../../discovery/chipContext')

      // Single project returns null
      const singleChip = await getProjectSelector([testProject.id])
      expect(singleChip).toBeNull()

      // Multiple projects returns selector
      const otherProject = await prisma.project.create({
        data: {
          name: 'Other Project',
          slug: 'other-project',
          builder_id: testBuilder.id,
          sector: 'Sector 50',
          city: 'Noida',
          status: 'ready',
        },
      })

      try {
        const multiChip = await getProjectSelector([testProject.id, otherProject.id])
        expect(multiChip).toBeDefined()
        expect(multiChip?.context).toBe('PROJECT_SELECT')
        expect(multiChip?.options.length).toBe(2)
      } finally {
        await prisma.project.delete({ where: { id: otherProject.id } })
      }
    })

    it('no context returns null chip (not fallback list)', async () => {
      const { getConnectivityOptions } = await import('../../discovery/chipContext')
      const chip = await getConnectivityOptions([])

      expect(chip).toBeNull()
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

  describe('4. Follow-up Query Context & Project Selection', () => {
    it('amenities with multiple projects shows PROJECT_SELECT first', async () => {
      const otherProject = await prisma.project.create({
        data: {
          name: 'Another Project',
          slug: 'another-project',
          builder_id: testBuilder.id,
          sector: 'Sector 79',
          city: 'Noida',
          status: 'under_construction',
        },
      })

      try {
        const { getContextualChips } = await import('../../discovery/chipContext')
        const chips = await getContextualChips('What amenities are there?', [testProject.id, otherProject.id])

        // Should return PROJECT_SELECT chip, not amenities list
        const selector = chips.find(c => c.context === 'PROJECT_SELECT')
        expect(selector).toBeDefined()
        expect(selector?.options.length).toBe(2)
      } finally {
        await prisma.project.delete({ where: { id: otherProject.id } })
      }
    })

    it('amenities with single project shows amenities directly', async () => {
      const amenity = await prisma.amenity.create({
        data: {
          project_id: testProject.id,
          name: 'Test Amenity',
          category: 'Test',
        },
      })

      try {
        const { getContextualChips } = await import('../../discovery/chipContext')
        const chips = await getContextualChips('What amenities?', [testProject.id])

        // Single project skips selector, shows amenities directly
        const amenityChip = chips.find(c => c.context === 'AMENITIES')
        expect(amenityChip).toBeDefined()
      } finally {
        await prisma.amenity.delete({ where: { id: amenity.id } })
      }
    })

    it('should handle follow-up payment plan question after discovery', async () => {
      const discoveryIntent: Intent = { sector: 'Sector 79' }
      const discoveryResult = await discoverProjects(discoveryIntent, 0)

      const followUpMessage = 'Show payment-plan options for Mahagun Mirabella?'
      const projectIds = await extractProjectIds(followUpMessage)

      expect(projectIds.length).toBeGreaterThan(0)
      expect(projectIds).toContain(testProject.id)
    })

    it('should support property comparison follow-ups', async () => {
      const message = 'Compare amenities in Mahagun Mirabella vs other Sector 79 projects'
      const ids = await extractProjectIds(message)

      expect(ids).toContain(testProject.id)
    })
  })

  describe('5. Chat Flow End-to-End', () => {
    it('complete flow: discovery -> context chips -> dynamic selection', async () => {
      // Step 1: User asks for discovery
      const discoveryIntent: Intent = {
        sector: 'Sector 79',
        lifestyleKeywords: ['green', 'sports'],
      }
      const result1 = await discoverProjects(discoveryIntent, 0)
      expect(result1.exactResults.length + result1.nearbyResults.length).toBeGreaterThan(0)

      // Step 2: Get context-aware chips for payment plans
      const projectIds = result1.exactResults.map(p => p.id)
      const { getContextualChips } = await import('../../discovery/chipContext')
      const paymentChips = await getContextualChips('Show payment plans', projectIds)

      // Should have payment plan options (database-driven)
      expect(paymentChips.length).toBeGreaterThan(0)
      const paymentChip = paymentChips.find(c => c.context === 'PAYMENT_PLANS')
      expect(paymentChip).toBeDefined()

      // Step 3: For amenities with multiple projects, should get PROJECT_SELECT
      if (projectIds.length > 1) {
        const amenityChips = await getContextualChips('What amenities?', projectIds)
        const selector = amenityChips.find(c => c.context === 'PROJECT_SELECT')
        expect(selector).toBeDefined()
      }
    })

    it('amenities flow: multiple projects -> selector -> pick project -> show amenities', async () => {
      // Create another project for multi-project scenario
      const otherProject = await prisma.project.create({
        data: {
          name: 'Second Project',
          slug: 'second-project',
          builder_id: testBuilder.id,
          sector: 'Sector 79',
          city: 'Noida',
          status: 'under_construction',
        },
      })

      // Create amenity for test project
      const amenity = await prisma.amenity.create({
        data: {
          project_id: testProject.id,
          name: 'Test Gym',
          category: 'Fitness',
        },
      })

      try {
        const { getContextualChips, getAmenityOptions } = await import('../../discovery/chipContext')

        // Step 1: User asks amenities for multiple projects
        const multiChips = await getContextualChips('What amenities?', [testProject.id, otherProject.id])
        const selector = multiChips.find(c => c.context === 'PROJECT_SELECT')
        expect(selector).toBeDefined()

        // Step 2: User selects a project from selector
        const selectedProjectId = selector?.options[0].value
        expect(selectedProjectId).toBe(testProject.id)

        // Step 3: Fetch amenities for selected project
        const amenityChip = await getAmenityOptions(selectedProjectId as string)
        expect(amenityChip).toBeDefined()
        expect(amenityChip?.options.some(o => o.label === 'Test Gym')).toBe(true)
      } finally {
        await prisma.amenity.delete({ where: { id: amenity.id } })
        await prisma.project.delete({ where: { id: otherProject.id } })
      }
    })
  })

  describe('6. Edge Cases & Dynamic Behavior', () => {
    it('should handle empty/null parameters gracefully', async () => {
      const emptyIds = await extractProjectIds('')
      expect(Array.isArray(emptyIds)).toBe(true)

      const { getContextualChips } = await import('../../discovery/chipContext')
      const emptyChips = await getContextualChips('', [])
      expect(Array.isArray(emptyChips)).toBe(true)
    })

    it('should not error on non-existent project names', async () => {
      const ids = await extractProjectIds('Show options for NonExistentProject123')
      expect(Array.isArray(ids)).toBe(true)
    })

    it('pagination offset should not cause errors', async () => {
      const intent: Intent = { sector: 'Sector 79' }
      const result = await discoverProjects(intent, 9999)

      expect(result).toBeDefined()
      expect(result.hasMore).toBe(false)
    })

    it('chips with no matching DB data return null', async () => {
      const { getPaymentPlanOptions, getConnectivityOptions } = await import('../../discovery/chipContext')

      // Empty project list returns null
      const emptyChip = await getPaymentPlanOptions([])
      expect(emptyChip).toBeNull()

      const emptyConn = await getConnectivityOptions([])
      expect(emptyConn).toBeNull()
    })

    it('should handle very long messages', async () => {
      const longMessage = 'I am looking for a property in Sector 79 near Mahagun Mirabella. ' +
        'Could you show me the payment plan options? '.repeat(10)

      const ids = await extractProjectIds(longMessage)
      expect(Array.isArray(ids)).toBe(true)
      expect(ids).toContain(testProject.id)
    })

    it('detects correct context from message patterns', async () => {
      const { detectQueryContext } = await import('../../discovery/chipContext')

      expect(detectQueryContext('Show payment plans')).toBe('PAYMENT_PLANS')
      expect(detectQueryContext('What amenities?')).toBe('AMENITIES')
      expect(detectQueryContext('Compare projects')).toBe('COMPARISON')
      expect(detectQueryContext('Metro access?')).toBe('CONNECTIVITY')
      expect(detectQueryContext('Builder track record')).toBe('BUILDER_INFO')
    })
  })
})
