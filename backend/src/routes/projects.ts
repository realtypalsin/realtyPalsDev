// backend/src/routes/projects.ts
import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/db'
import { computeRecommendationScore } from '../lib/recommendation/score'
import { routeCache } from '../lib/routeCache'

const router = Router()

const QuerySchema = z.object({
  sector: z.string().optional(),
  city: z.string().optional(),
  bhk: z.string().regex(/^\d+$/, 'bhk must be an integer').optional(),
  budget_max_cr: z.string().regex(/^\d+(\.\d+)?$/, 'budget_max_cr must be a number').optional(),
  status: z.enum(['under_construction', 'ready_to_move', 'new_launch']).optional(),
})

router.get('/', routeCache(300), async (req: Request, res: Response) => {
  const parsed = QuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid query params' })
    return
  }

  const { sector, bhk, budget_max_cr, status, city } = parsed.data

  const projects = await prisma.project.findMany({
    where: {
      ...(city && { city: { contains: city, mode: 'insensitive' } }),
      ...(sector && { sector: { contains: sector, mode: 'insensitive' } }),
      ...(status && { status }),
      ...(bhk && { unit_types: { some: { bhk: parseInt(bhk) } } }),
      ...(budget_max_cr && { unit_types: { some: { price_min_cr: { lte: parseFloat(budget_max_cr) } } } }),
    },
    include: {
      builder: { select: { name: true, slug: true } },
      unit_types: { select: { bhk: true, price_min_cr: true, price_max_cr: true, carpet_area_sqft: true } },
      images: { where: { type: 'hero' }, take: 1, select: { url: true } },
    },
    take: 20,
  })

  res.json({ projects })
})

router.get('/:slug', routeCache(900), async (req: Request, res: Response) => {
  const project = await prisma.project.findUnique({
    where: { slug: req.params.slug },
    include: {
      builder: true,
      unit_types: true,
      images: { orderBy: { sort_order: 'asc' } },
      amenities: true,
      connectivity: { orderBy: { distance_km: 'asc' } },
      dna: {
        select: {
          builder_track_record_label: true,
          price_position_label:       true,
          locality_label:             true,
          rera_compliance_label:      true,
          amenity_depth_label:        true,
          possession_certainty_label: true,
          last_verified_at:           true,
          // raw scores for deterministic recommendation scoring
          builder_track_record_score: true,
          price_position_score:       true,
          locality_score:             true,
          rera_compliance_score:      true,
          amenity_depth_score:        true,
          possession_certainty_score: true,
        },
      },
      decision_profile: {
        select: {
          status:             true,
          decision_thesis:    true,
          why_buy:            true,
          why_avoid:          true,
          best_for:           true,
          not_ideal_for:      true,
          confidence_sources: true,
          intelligence_data:   true,
          last_verified_at:   true,
        },
      },
      persona_profile: true,
      recommendation_profile: {
        select: {
          status:               true,
          tier:                 true,
          primary_thesis:       true,
          end_use_thesis:       true,
          investment_thesis:    true,
          family_thesis:        true,
          investor_thesis:      true,
          luxury_thesis:        true,
          risk_thesis:          true,
          walk_away_conditions: true,
          timeline_advice:      true,
          negotiation_leverage: true,
          last_verified_at:     true,
        },
      },
      competitors: {
        select: {
          id:                     true,
          competitor_name:        true,
          competitor_slug:        true,
          this_project_advantage: true,
          competitor_advantage:   true,
          verdict:                true,
          price_delta_note:       true,
          sort_order:             true,
        },
        orderBy: { sort_order: 'asc' },
      },
    },
  })

  if (!project) { res.status(404).json({ error: 'Not found' }); return }

  // Compute deterministic recommendation score from raw DNA scores
  const recommendation_score = computeRecommendationScore({
    dna: project.dna ?? null,
    status: project.status as 'under_construction' | 'ready_to_move' | 'new_launch',
    possession_date: project.possession_date ?? null,
    project_risk_flag: project.project_risk_flag ?? null,
    builder: { legal_flag: project.builder?.legal_flag ?? null },
  })

  // Strip internal raw score fields from dna before sending to client
  const publicDna = project.dna ? {
    builder_track_record_label: project.dna.builder_track_record_label,
    price_position_label:       project.dna.price_position_label,
    locality_label:             project.dna.locality_label,
    rera_compliance_label:      project.dna.rera_compliance_label,
    amenity_depth_label:        project.dna.amenity_depth_label,
    possession_certainty_label: project.dna.possession_certainty_label,
    last_verified_at:           project.dna.last_verified_at,
  } : null

  const reportUrl = `/api/projects/${project.slug}/report`;

  res.json({ project: { ...project, builder_detail: project.builder, dna: publicDna, recommendation_score, reportUrl, all_amenities: project.amenities, all_connectivity: project.connectivity } })
})

router.get('/:slug/documents', async (req: Request, res: Response) => {
  const project = await prisma.project.findUnique({ where: { slug: req.params.slug }, select: { id: true } })
  if (!project) { res.status(404).json({ error: 'Not found' }); return }
  const documents = await prisma.projectDocument.findMany({
    where: { project_id: project.id },
    select: { id: true, doc_type: true, name: true, storage_url: true, created_at: true, file_size_bytes: true },
    orderBy: { created_at: 'desc' },
  })
  res.json({ documents })
})

router.get('/:slug/payment-plan', async (req: Request, res: Response) => {
  const project = await prisma.project.findUnique({
    where: { slug: req.params.slug },
    select: { id: true },
  })
  if (!project) { res.status(404).json({ error: 'Not found' }); return }

  const plan = await (prisma as any).paymentPlan.findUnique({
    where: { project_id: project.id },
  })

  if (!plan) {
    res.json({
      available: false,
      message: 'Payment schedule not yet verified. Contact our advisors for the latest payment plan.',
    })
    return
  }

  res.json({ available: true, plan })
})

router.get('/:slug/cost-sheet', async (req: Request, res: Response) => {
  const project = await prisma.project.findUnique({
    where: { slug: req.params.slug },
    select: {
      id: true,
      name: true,
      unit_types: { select: { bhk: true, super_area_sqft: true, price_min_cr: true } },
    },
  })
  if (!project) { res.status(404).json({ error: 'Not found' }); return }

  const sheet = await (prisma as any).costSheet.findUnique({
    where: { project_id: project.id },
  })

  if (!sheet) {
    res.json({
      available: false,
      message: 'Detailed cost sheet not yet verified. Typical costs: GST 5%, Stamp Duty 6%, Registration 1% on agreement value.',
    })
    return
  }

  // Compute illustrative totals for a representative unit
  const refUnit = project.unit_types.find((u: any) => u.price_min_cr != null) ?? null
  const baseCr = refUnit?.price_min_cr ?? null
  const sqft   = refUnit?.super_area_sqft ?? null

  let totalCostBreakdown: Record<string, number | null> | null = null
  if (baseCr != null) {
    const gst          = baseCr * (sheet.gst_rate_pct / 100)
    const stampDuty    = baseCr * (sheet.stamp_duty_pct / 100)
    const registration = baseCr * (sheet.registration_pct / 100)
    const parking      = sheet.parking_cost ? sheet.parking_cost / 1e7 : 0  // stored in ₹, convert to Cr
    const ifms         = sheet.ifms         ? sheet.ifms / 1e7 : 0
    const club         = sheet.club_membership ? sheet.club_membership / 1e7 : 0
    const total        = baseCr + gst + stampDuty + registration + parking + ifms + club
    totalCostBreakdown = {
      base_price_cr:    baseCr,
      gst_cr:           Math.round(gst * 100) / 100,
      stamp_duty_cr:    Math.round(stampDuty * 100) / 100,
      registration_cr:  Math.round(registration * 100) / 100,
      parking_cr:       Math.round(parking * 100) / 100,
      ifms_cr:          Math.round(ifms * 100) / 100,
      club_cr:          Math.round(club * 100) / 100,
      total_cost_cr:    Math.round(total * 100) / 100,
    }
  }

  res.json({
    available: true,
    sheet,
    illustration: totalCostBreakdown,
    illustration_note: sqft
      ? `Based on a ${refUnit?.bhk}BHK unit (${sqft} sqft) at ₹${baseCr}Cr base price`
      : 'Illustrative — select a unit type for exact figures',
  })
})

router.get('/:slug/investment', async (req: Request, res: Response) => {
  const project = await prisma.project.findUnique({
    where: { slug: req.params.slug },
    select: {
      id: true,
      sector: true,
      status: true,
      possession_date: true,
      dna: {
        select: {
          locality_score: true,
          price_position_score: true,
          possession_certainty_score: true,
          builder_track_record_score: true,
        },
      },
      recommendation_profile: {
        select: { investment_thesis: true, investor_thesis: true },
      },
    },
  })
  if (!project) { res.status(404).json({ error: 'Not found' }); return }

  // Investment intelligence is derived, never fabricated
  const locationScore = project.dna?.locality_score ?? null
  const valueScore    = project.dna?.price_position_score ?? null

  const potentialAppreciation = (() => {
    if (locationScore == null || valueScore == null) return null
    if (locationScore >= 70 && valueScore >= 65) return 'Strong'
    if (locationScore >= 55 && valueScore >= 50) return 'Moderate'
    return 'Weak'
  })()

  res.json({
    available: true,
    intelligence: {
      sector:                 project.sector,
      status:                 project.status,
      possession_date:        project.possession_date,
      investment_thesis:      project.recommendation_profile?.investment_thesis ?? null,
      investor_thesis:        project.recommendation_profile?.investor_thesis ?? null,
      potential_appreciation: potentialAppreciation,
      data_note:              'Investment projections are indicative only — not financial advice. Verify rental yields and capital appreciation with a licensed advisor.',
    },
  })
})

export default router