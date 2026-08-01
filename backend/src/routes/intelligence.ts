// Phase 4: Endpoint to generate and populate intelligence data
import { Router, Request, Response } from 'express'
import { prisma } from '../lib/db'
import { generateAllIntelligence, ProjectDataForIntelligence } from '../lib/ai/generateIntelligence'

const router = Router()

// POST /api/intelligence/generate
// Generates intelligence for a project (admin only)
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.body
    if (!projectId) return res.status(400).json({ error: 'projectId required' })

    // Fetch project with all relevant data
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        builder: true,
        unit_types: { take: 10 },
        amenities: { take: 10 }
      }
    })

    if (!project) return res.status(404).json({ error: 'Project not found' })

    // Map to intelligence input
    // Project has no price_max_cr column — derive the ceiling from unit types.
    const unitPriceMax = project.unit_types
      .map((u: { price_max_cr: number | null }) => u.price_max_cr)
      .filter((v): v is number => typeof v === 'number')

    const projectData: ProjectDataForIntelligence = {
      name: project.name,
      builder_name: project.builder.name,
      price_min_cr: project.price_min_cr,
      price_max_cr: unitPriceMax.length ? Math.max(...unitPriceMax) : null,
      possession_date: project.possession_date?.toISOString().split('T')[0],
      sector: project.sector,
      total_towers: project.total_towers,
      amenities: project.amenities.map((a: { name: string }) => a.name),
      location_connectivity: project.long_description || project.description || '',
      bhk_units: project.unit_types.map((u: { bhk: number; super_area_sqft: number | null; price_max_cr: number | null }) => ({
        bhk: u.bhk,
        area_sqft: u.super_area_sqft ?? undefined,
        price: u.price_max_cr ?? undefined
      })),
      rera_number: project.rera_number,
      launch_date: project.launch_date?.toISOString().split('T')[0]
    }

    // Generate intelligence
    const intelligence = generateAllIntelligence(projectData)

    // Update or create DecisionProfile
    const decision = await prisma.decisionProfile.upsert({
      where: { project_id: projectId },
      create: {
        project_id: projectId,
        // Generated data starts as DRAFT — a human verifies before publish.
        status: 'DRAFT',
        decision_thesis: `${project.name} in ${project.sector} — evaluate based on your budget and timeline`,
        why_buy: ['Established builder', 'Growing sector', 'Good connectivity'],
        why_avoid: ['Check possession timeline', 'Verify builder track record'],
        best_for: 'First-time buyers and families',
        confidence_sources: ['RERA data', 'Project documentation', 'Sector analysis'],
        ...intelligence
      },
      update: {
        ...intelligence,
        updated_at: new Date()
      }
    })

    res.json({
      message: 'Intelligence generated',
      projectId,
      decisionProfileId: decision.id,
      fields: Object.keys(intelligence)
    })
  } catch (error) {
    console.error('Intelligence generation error:', error)
    res.status(500).json({ error: 'Failed to generate intelligence' })
  }
})

// GET /api/intelligence/:projectId
// Fetch intelligence for a project
router.get('/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params

    const decision = await prisma.decisionProfile.findUnique({
      where: { project_id: projectId },
      select: {
        id: true,
        status: true,
        decision_thesis: true,
        financial_intelligence: true,
        market_intelligence: true,
        builder_intelligence: true,
        property_intelligence: true,
        comparative_analysis: true,
        resources_documents: true,
        confidence_sources: true,
        last_verified_at: true
      }
    })

    if (!decision) return res.status(404).json({ error: 'Intelligence not found' })
    res.json(decision)
  } catch (error) {
    console.error('Fetch intelligence error:', error)
    res.status(500).json({ error: 'Failed to fetch intelligence' })
  }
})

export default router
