// Phase 5: Admin endpoints for intelligence management
import { Router, Request, Response } from 'express'
import { prisma } from '@/lib/db'
import { generateAllIntelligence, ProjectDataForIntelligence } from '@/lib/ai/generateIntelligence'

const router = Router()

// POST /api/admin/intelligence/batch
// Bulk generate intelligence for multiple projects
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { projectIds = [], sector = null } = req.body

    let ids = projectIds
    if (!ids.length && sector) {
      const projects = await prisma.project.findMany({
        where: { sector },
        select: { id: true }
      })
      ids = projects.map((p) => p.id)
    }

    if (!ids.length) return res.status(400).json({ error: 'No projects specified' })

    const results = []
    const errors = []

    for (const projectId of ids) {
      try {
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          include: {
            builder: true,
            unit_types: { take: 10 },
            amenities: { take: 10 }
          }
        })

        if (!project) {
          errors.push({ projectId, error: 'Project not found' })
          continue
        }

        const projectData: ProjectDataForIntelligence = {
          name: project.name,
          builder_name: project.builder.name,
          price_min_cr: project.price_min_cr,
          price_max_cr: project.price_max_cr,
          possession_date: project.possession_date?.toISOString().split('T')[0],
          sector: project.sector,
          total_towers: project.total_towers,
          amenities: project.amenities.map((a: any) => a.name),
          location_connectivity: project.neighborhood_description || '',
          bhk_units: project.unit_types.map((u: any) => ({
            bhk: u.bhk,
            area_sqft: u.super_area_sqft,
            price: u.price_max_cr
          })),
          rera_number: project.rera_number,
          launch_date: project.launch_date?.toISOString().split('T')[0]
        }

        const intelligence = generateAllIntelligence(projectData)

        const decision = await prisma.decisionProfile.upsert({
          where: { project_id: projectId },
          create: {
            project_id: projectId,
            status: 'VERIFIED',
            decision_thesis: `${project.name} in ${project.sector}`,
            ...intelligence
          },
          update: {
            ...intelligence,
            updated_at: new Date()
          }
        })

        results.push({
          projectId,
          decisionProfileId: decision.id,
          status: 'generated'
        })
      } catch (error) {
        errors.push({ projectId, error: (error as Error).message })
      }
    }

    res.json({
      message: `Generated intelligence for ${results.length} projects`,
      generated: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error) {
    console.error('Batch generation error:', error)
    res.status(500).json({ error: 'Batch generation failed' })
  }
})

// PATCH /api/admin/intelligence/:projectId
// Update specific intelligence field
router.patch('/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params
    const { field, data, notes } = req.body

    if (!field || !['financial_intelligence', 'market_intelligence', 'builder_intelligence', 'property_intelligence', 'comparative_analysis', 'resources_documents'].includes(field)) {
      return res.status(400).json({ error: 'Invalid field' })
    }

    const updateData: any = {
      [field]: data,
      updated_at: new Date(),
      recommendation_notes: notes
    }

    const decision = await prisma.decisionProfile.update({
      where: { project_id: projectId },
      data: updateData
    })

    res.json({
      message: 'Intelligence updated',
      projectId,
      field,
      updated: true
    })
  } catch (error) {
    console.error('Update intelligence error:', error)
    res.status(500).json({ error: 'Failed to update intelligence' })
  }
})

// GET /api/admin/intelligence/status/summary
// Intelligence completion status across projects
router.get('/status/summary', async (req: Request, res: Response) => {
  try {
    const total = await prisma.project.count()
    const withIntelligence = await prisma.decisionProfile.count()

    const byStatus = await prisma.decisionProfile.groupBy({
      by: ['status'],
      _count: true
    })

    const missingFields = await prisma.decisionProfile.findMany({
      select: {
        id: true,
        project_id: true,
        financial_intelligence: true,
        market_intelligence: true,
        builder_intelligence: true,
        property_intelligence: true,
        comparative_analysis: true,
        resources_documents: true
      },
      take: 100
    })

    const incomplete = missingFields.filter((d: any) => {
      return !(
        d.financial_intelligence &&
        d.market_intelligence &&
        d.builder_intelligence &&
        d.property_intelligence &&
        d.comparative_analysis &&
        d.resources_documents
      )
    })

    res.json({
      total_projects: total,
      with_intelligence: withIntelligence,
      coverage_percent: Math.round((withIntelligence / total) * 100),
      by_status: byStatus.reduce(
        (acc: any, s: any) => ({ ...acc, [s.status]: s._count }),
        {}
      ),
      incomplete_count: incomplete.length,
      incomplete_sample: incomplete.slice(0, 10)
    })
  } catch (error) {
    console.error('Status summary error:', error)
    res.status(500).json({ error: 'Failed to fetch status' })
  }
})

export default router

// PATCH /api/admin/intelligence/:projectId/verify
// Mark intelligence as verified by admin
router.patch('/:projectId/verify', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params

    const decision = await prisma.decisionProfile.update({
      where: { project_id: projectId },
      data: {
        status: 'VERIFIED',
        last_verified_at: new Date(),
        verified_by: req.user?.id || 'admin'
      }
    })

    res.json({
      message: 'Intelligence verified',
      projectId,
      verified_at: decision.last_verified_at,
      status: decision.status
    })
  } catch (error) {
    console.error('Verify error:', error)
    res.status(500).json({ error: 'Failed to verify intelligence' })
  }
})

export default router
