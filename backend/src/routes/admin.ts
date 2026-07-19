import { timingSafeEqual, createHash } from 'crypto'
import { Router, Request, Response } from 'express'
import { z } from 'zod'
import multer from 'multer'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/db'
import { validateAdminSession, createAdminSession, destroyAdminSession, requireAdmin } from '../lib/adminAuth'
import { checkRateLimit } from '../lib/cache'
import { isPrismaNotFound } from '../lib/db'
import { clientIp } from '../lib/request'
import { supabaseAdmin } from '../lib/supabase'
import { computeCompleteness } from '../lib/completeness'
import { canonicalSector, canonicalCity } from '../lib/discovery/normalize'
import applicationsRouter from './builderApplications'
import { validateUploadedFile } from '../lib/uploadValidator'

const router = Router()

// ---------------------------------------------------------------------------
// Multer — memory storage, 10 MB limit
// ---------------------------------------------------------------------------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
})

function sha256(value: string): Buffer {
  return createHash('sha256').update(value).digest()
}

// ---------------------------------------------------------------------------
// POST /auth — login (no admin token required)
// ---------------------------------------------------------------------------
router.post('/auth', async (req: Request, res: Response): Promise<void> => {
  const { password } = (req.body ?? {}) as { password?: string }
  const adminPassword = process.env.ADMIN_PASSWORD ?? ''
  const ip = clientIp(req)

  console.log(`[admin] login attempt ip=${ip}, password received=${!!password}, admin_password_set=${!!adminPassword}`)

  const { allowed } = await checkRateLimit(`admin:login:${ip}`, 5, 900)
  if (!allowed) {
    console.log(`[admin] login rate-limited ip=${ip}`)
    res.status(429).json({ error: 'Too many attempts. Try again later.' })
    return
  }

  const inputHash    = sha256(password ?? '')
  const expectedHash = sha256(adminPassword)
  console.log(`[admin] hash comparison: inputHash length=${inputHash.length}, expectedHash length=${expectedHash.length}`)
  const match = inputHash.length === expectedHash.length
    && timingSafeEqual(inputHash, expectedHash)

  if (!adminPassword || !match) {
    console.log(`[admin] login failed ip=${ip}, adminPassword_empty=${!adminPassword}, hash_match=${match}`)
    res.status(401).json({ error: 'Invalid password' })
    return
  }

  const userAgent = req.headers['user-agent'] ?? ''
  let token: string
  try {
    token = await createAdminSession(ip, userAgent)
  } catch (err) {
    console.error(`[admin] login failed: session persistence error ip=${ip}`, err)
    res.status(503).json({ error: 'Authentication service temporarily unavailable' })
    return
  }
  console.log(`[admin] login success ip=${ip}`)

  const isProduction = process.env.NODE_ENV === 'production'
  res.cookie('admin_session', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 7 * 24 * 3600 * 1000,
    path: '/',
  })
  res.json({ ok: true })
})

// ---------------------------------------------------------------------------
// DELETE /auth — logout
// ---------------------------------------------------------------------------
router.delete('/auth', async (req: Request, res: Response): Promise<void> => {
  // Try cookie first (preferred), fall back to Bearer (for migration)
  let token: string | undefined = (req.cookies as Record<string, string>)?.admin_session
  if (!token) {
    const authHeader = req.headers.authorization as string | undefined
    token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined
  }
  if (token) {
    await destroyAdminSession(token)
    console.log(`[admin] logout ip=${clientIp(req)}`)
  }
  // Clear the session cookie
  res.clearCookie('admin_session', { path: '/' })
  res.json({ ok: true })
})

// ---------------------------------------------------------------------------
// All routes below require admin token
// ---------------------------------------------------------------------------
router.use(requireAdmin)

// ---------------------------------------------------------------------------
// GET /stats
// ---------------------------------------------------------------------------
router.get('/stats', async (_req: Request, res: Response): Promise<void> => {
  const [projects, sessions, leads, callbacks] = await Promise.all([
    prisma.project.count(),
    prisma.chatSession.count(),
    prisma.siteVisitRequest.count(),
    prisma.callbackRequest.count(),
  ])
  res.json({ projects, sessions, leads, callbacks })
})

// ---------------------------------------------------------------------------
// GET /leads
// ---------------------------------------------------------------------------
router.get('/leads', async (req: Request, res: Response): Promise<void> => {
  const page = parseInt((req.query.page as string) ?? '1', 10)
  const pageSize = 20
  const skip = (page - 1) * pageSize

  const [builderLeads, total] = await Promise.all([
    prisma.builderLead.findMany({
      skip,
      take: pageSize,
      orderBy: { created_at: 'desc' },
      include: { builder: { select: { name: true } } },
    }),
    prisma.builderLead.count(),
  ])

  res.json({ leads: builderLeads, total, page, pageSize })
})

// ---------------------------------------------------------------------------
// PATCH /leads/:id
// ---------------------------------------------------------------------------
router.patch('/leads/:id', async (req: Request, res: Response): Promise<void> => {
  const { status } = req.body
  const leadId = req.params.id

  if (!status || !['new', 'contacted', 'qualified', 'lost'].includes(status)) {
    res.status(400).json({ error: 'Invalid status' })
    return
  }

  try {
    const updated = await prisma.builderLead.update({
      where: { id: leadId },
      data: { status }
    })
    res.json(updated)
  } catch (err: unknown) {
    if (isPrismaNotFound(err)) {
      res.status(404).json({ error: 'Lead not found' })
      return
    }
    console.error('[admin] lead patch', err)
    res.status(500).json({ error: 'Internal error' })
  }
})

// ---------------------------------------------------------------------------
// GET /news
// ---------------------------------------------------------------------------
router.get('/news', async (req: Request, res: Response): Promise<void> => {
  const page = parseInt((req.query.page as string) ?? '1', 10)
  const pageSize = 20
  const skip = (page - 1) * pageSize

  const [news, total] = await Promise.all([
    prisma.builderNews.findMany({
      skip,
      take: pageSize,
      orderBy: { published_at: 'desc' },
      include: { builder: { select: { name: true } } },
    }),
    prisma.builderNews.count(),
  ])

  res.json({ news, total, page, pageSize })
})

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------
const ProjectSchema = z.object({
  name:               z.string().min(2),
  slug:               z.string().min(2),
  builder_id:         z.string().uuid(),
  sector:             z.string().min(1),
  city:               z.string().default('Noida'),
  status:             z.enum(['under_construction', 'ready_to_move', 'new_launch']),
  tagline:            z.string().optional(),
  address:            z.string().optional(),
  lat:                z.number().optional(),
  lng:                z.number().optional(),
  rera_number:        z.string().optional(),
  rera_url:           z.string().optional(),
  total_units:        z.number().int().optional(),
  total_towers:       z.number().int().optional(),
  land_area_acres:    z.number().optional(),
  launch_date:        z.string().optional(),
  possession_label:   z.string().optional(),
  possession_date:    z.string().optional(),
  description:        z.string().optional(),
  long_description:   z.string().optional(),
  design_theme:       z.string().optional(),
  architect:          z.string().optional(),
  interior_designer:  z.string().optional(),
  floors:             z.string().optional(),
  open_space_pct:     z.number().optional(),
  green_rating:       z.string().optional(),
  schools_nearby_count: z.number().int().optional(),
  hospitals_nearby_count: z.number().int().optional(),
  shopping_nearby_count: z.number().int().optional(),
  it_parks_nearby_count: z.number().int().optional(),
  banks_nearby_count: z.number().int().optional(),
  restaurants_nearby_count: z.number().int().optional(),
  hero_image_url:     z.string().optional(),
  marketing_claims:   z.array(z.string()).optional(),
  ai_search_keywords: z.array(z.string()).optional(),
})

const ProjectPatchSchema = z.object({
  name:               z.string().min(2).optional(),
  sector:             z.string().optional(),
  city:               z.string().optional(),
  status:             z.enum(['under_construction', 'ready_to_move', 'new_launch']).optional(),
  tagline:            z.string().optional(),
  address:            z.string().optional(),
  lat:                z.number().optional(),
  lng:                z.number().optional(),
  rera_number:        z.string().optional(),
  rera_url:           z.string().optional(),
  total_units:        z.number().int().optional(),
  total_towers:       z.number().int().optional(),
  land_area_acres:    z.number().optional(),
  launch_date:        z.string().optional(),
  possession_label:   z.string().optional(),
  possession_date:    z.string().optional(),
  description:        z.string().optional(),
  long_description:   z.string().optional(),
  design_theme:       z.string().optional(),
  architect:          z.string().optional(),
  interior_designer:  z.string().optional(),
  floors:             z.string().optional(),
  open_space_pct:     z.number().optional(),
  green_rating:       z.string().optional(),
  schools_nearby_count: z.number().int().optional(),
  hospitals_nearby_count: z.number().int().optional(),
  shopping_nearby_count: z.number().int().optional(),
  it_parks_nearby_count: z.number().int().optional(),
  banks_nearby_count: z.number().int().optional(),
  restaurants_nearby_count: z.number().int().optional(),
  hero_image_url:     z.string().optional(),
  marketing_claims:   z.array(z.string()).optional(),
  ai_search_keywords: z.array(z.string()).optional(),
})

const BuilderSchema = z.object({
  name:               z.string().min(2),
  slug:               z.string().min(2),
  tagline:            z.string().optional(),
  description:        z.string().optional(),
  founded_year:       z.number().int().optional(),
  headquarters:       z.string().optional(),
  website:            z.string().optional(),
  credai_member:      z.boolean().optional(),
  delivered_units:    z.number().int().optional(),
  delivered_projects: z.array(z.string()).optional(),
  ongoing_projects:   z.array(z.string()).optional(),
  awards:             z.array(z.string()).optional(),
  cin:                       z.string().optional(),
  rera_promoter_id:          z.string().optional(),
  financial_hygiene_score:   z.number().int().min(0).max(100).optional(),
  outstanding_dues_cr:       z.number().optional(),
  legal_entities:            z.array(z.object({ name: z.string(), cin: z.string(), role: z.string() })).optional(),
  executives:                z.array(z.object({ name: z.string(), designation: z.string() })).optional(),
  funding_banks:             z.array(z.string()).optional(),
  audit_flags_log:           z.string().optional(),
})

const BuilderPatchSchema = z.object({
  name:          z.string().min(2).optional(),
  slug:          z.string().min(2).optional(),
  founded_year:  z.number().int().nullable().optional(),
  headquarters:  z.string().nullable().optional(),
  website:       z.string().nullable().optional(),
  credai_member: z.boolean().optional(),
  cin:                       z.string().nullable().optional(),
  rera_promoter_id:          z.string().nullable().optional(),
  financial_hygiene_score:   z.number().int().min(0).max(100).nullable().optional(),
  outstanding_dues_cr:       z.number().nullable().optional(),
  legal_entities:            z.array(z.object({ name: z.string(), cin: z.string(), role: z.string() })).nullable().optional(),
  executives:                z.array(z.object({ name: z.string(), designation: z.string() })).nullable().optional(),
  funding_banks:             z.array(z.string()).optional(),
  audit_flags_log:           z.string().nullable().optional(),
})

// ── Intelligence Zod Schemas ──────────────────────────────────────────

const IntelligenceStatusEnum = z.enum(['DRAFT', 'IN_REVIEW', 'PUBLISHED'])

// Accepts YYYY-MM-DD from date inputs or full ISO datetime strings
const dateField = z
  .string()
  .nullable()
  .optional()
  .transform(v => {
    if (!v) return v
    // date-only → append UTC midnight
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return `${v}T00:00:00.000Z`
    return v
  })

const DnaPatchSchema = z.object({
  builder_track_record_score: z.number().int().min(0).max(100).nullable().optional(),
  builder_track_record_label: z.string().nullable().optional(),
  price_position_score:       z.number().int().min(0).max(100).nullable().optional(),
  price_position_label:       z.string().nullable().optional(),
  locality_score:             z.number().int().min(0).max(100).nullable().optional(),
  locality_label:             z.string().nullable().optional(),
  rera_compliance_score:      z.number().int().min(0).max(100).nullable().optional(),
  rera_compliance_label:      z.string().nullable().optional(),
  amenity_depth_score:        z.number().int().min(0).max(100).nullable().optional(),
  amenity_depth_label:        z.string().nullable().optional(),
  possession_certainty_score: z.number().int().min(0).max(100).nullable().optional(),
  possession_certainty_label: z.string().nullable().optional(),
  last_verified_at:           dateField,
  verified_by:                z.string().nullable().optional(),
})

const ConfidenceSourceEnum = z.enum(['RERA', 'Project Documents', 'Site Visit', 'Builder Claim', 'Estimated'])

const DecisionProfilePatchSchema = z.object({
  status:               IntelligenceStatusEnum.optional(),
  decision_thesis:      z.string().nullable().optional(),
  why_buy:              z.array(z.string()).max(3).optional(),
  why_avoid:            z.array(z.string()).max(3).optional(),
  best_for:             z.string().nullable().optional(),
  not_ideal_for:        z.string().nullable().optional(),
  confidence_sources:   z.array(ConfidenceSourceEnum).optional(),
  recommendation_notes: z.string().nullable().optional(),
  advisor_notes:        z.string().nullable().optional(),
  intelligence_data:    z.any().optional(),
  last_verified_at:     dateField,
  verified_by:          z.string().nullable().optional(),
})

const PersonaEnum = z.enum(['FAMILY', 'PROFESSIONAL', 'INVESTOR', 'NRI', 'UPGRADER', 'RETIREE'])

const PersonaProfilePatchSchema = z.object({
  primary_persona:      PersonaEnum.nullable().optional(),
  secondary_personas:   z.array(PersonaEnum).optional(),
  persona_descriptions: z.record(z.string()).nullable().optional(),
  income_range:       z.string().nullable().optional(),
  family_stage:       z.string().nullable().optional(),
  work_location:      z.string().nullable().optional(),
  risk_appetite:      z.enum(['LOW', 'MEDIUM', 'HIGH']).nullable().optional(),
  timeline_horizon:   z.string().nullable().optional(),
  motivation_note:    z.string().nullable().optional(),
  last_verified_at:   dateField,
  verified_by:        z.string().nullable().optional(),
})

const RecommendationProfilePatchSchema = z.object({
  status:               IntelligenceStatusEnum.optional(),
  tier:                 z.enum(['STRONG_BUY', 'BUY', 'HOLD', 'WATCH', 'AVOID']).nullable().optional(),
  primary_thesis:       z.string().nullable().optional(),
  end_use_thesis:       z.string().nullable().optional(),
  investment_thesis:    z.string().nullable().optional(),
  family_thesis:        z.string().nullable().optional(),
  investor_thesis:      z.string().nullable().optional(),
  luxury_thesis:        z.string().nullable().optional(),
  risk_thesis:          z.string().nullable().optional(),
  walk_away_conditions: z.array(z.string()).max(3).optional(),
  timeline_advice:      z.string().nullable().optional(),
  negotiation_leverage: z.array(z.string()).max(3).optional(),
  internal_confidence:  z.enum(['VERIFIED', 'PARTIAL', 'ESTIMATED']).nullable().optional(),
  admin_notes:          z.string().nullable().optional(),
  last_verified_at:     dateField,
  verified_by:          z.string().nullable().optional(),
})

const CompetitorCreateSchema = z.object({
  competitor_project_id:  z.string().uuid().nullable().optional(),
  competitor_name:        z.string().min(1),
  competitor_slug:        z.string().nullable().optional(),
  this_project_advantage: z.string().nullable().optional(),
  competitor_advantage:   z.string().nullable().optional(),
  verdict:                z.string().nullable().optional(),
  price_delta_note:       z.string().nullable().optional(),
  sort_order:             z.number().int().default(0),
})

const CompetitorPatchSchema = CompetitorCreateSchema.omit({ competitor_name: true }).extend({
  competitor_name: z.string().min(1).optional(),
})

const UnitCreateSchema = z.object({
  name:               z.string().min(1),
  bhk:                z.number().int().min(0),
  super_area_sqft:    z.number().int().nullable().optional(),
  carpet_area_sqft:   z.number().int().nullable().optional(),
  balcony_area_sqft:  z.number().int().nullable().optional(),
  bathrooms:          z.number().int().nullable().optional(),
  price_min_cr:       z.number().nullable().optional(),
  price_max_cr:       z.number().nullable().optional(),
  price_label:        z.string().nullable().optional(),
  price_is_estimated: z.boolean().optional(),
})

const UnitPatchSchema = z.object({
  name:               z.string().min(1).optional(),
  bhk:                z.number().int().min(0).optional(),
  super_area_sqft:    z.number().int().nullable().optional(),
  carpet_area_sqft:   z.number().int().nullable().optional(),
  balcony_area_sqft:  z.number().int().nullable().optional(),
  bathrooms:          z.number().int().nullable().optional(),
  price_min_cr:       z.number().nullable().optional(),
  price_max_cr:       z.number().nullable().optional(),
  price_label:        z.string().nullable().optional(),
  price_is_estimated: z.boolean().optional(),
  views:              z.any().optional(),
})

// ---------------------------------------------------------------------------
// GET /projects
// ---------------------------------------------------------------------------
router.get('/projects', async (req: Request, res: Response): Promise<void> => {
  const search = (req.query.q as string | undefined) ?? ''
  const page = Math.max(1, parseInt(req.query.page as string) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20))
  const skip = (page - 1) * limit

  const projects = await prisma.project.findMany({
    where: search
      ? {
          OR: [
            { name:   { contains: search, mode: 'insensitive' } },
            { sector: { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined,
    include: {
      builder:    { select: { id: true, name: true } },
      unit_types: { select: { id: true, bhk: true, price_min_cr: true, price_max_cr: true } },
      images:     { select: { id: true, url: true, type: true }, orderBy: { sort_order: 'asc' }, take: 3 },
    },
    orderBy: { name: 'asc' },
    skip,
    take: limit,
  })
  const total = await prisma.project.count({
    where: search
      ? {
          OR: [
            { name:   { contains: search, mode: 'insensitive' } },
            { sector: { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined,
  })
  res.json({ projects, total, page, limit, pages: Math.ceil(total / limit) })
})

// ---------------------------------------------------------------------------
// POST /projects
// ---------------------------------------------------------------------------
router.post('/projects', async (req: Request, res: Response): Promise<void> => {
  const parsed = ProjectSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message })
    return
  }
  const d = parsed.data

  // Normalize sector and city to canonical format
  const canonSector = canonicalSector(d.sector)
  const canonCity = canonicalCity(d.city)
  if (!canonSector || !canonCity) {
    res.status(400).json({ error: 'Invalid sector or city format' })
    return
  }

  const project = await prisma.project.create({
    data: {
      name:               d.name,
      slug:               d.slug,
      builder_id:         d.builder_id,
      sector:             canonSector,
      city:               canonCity,
      status:             d.status,
      tagline:            d.tagline,
      address:            d.address,
      lat:                d.lat,
      lng:                d.lng,
      rera_number:        d.rera_number,
      rera_url:           d.rera_url,
      total_units:        d.total_units,
      total_towers:       d.total_towers,
      land_area_acres:    d.land_area_acres,
      launch_date:        d.launch_date ? new Date(d.launch_date) : undefined,
      possession_label:   d.possession_label,
      possession_date:    d.possession_date ? new Date(d.possession_date) : undefined,
      description:        d.description,
      long_description:   d.long_description,
      design_theme:       d.design_theme,
      architect:          d.architect,
      hero_image_url:     d.hero_image_url,
      marketing_claims:   d.marketing_claims ?? [],
      ai_search_keywords: d.ai_search_keywords ?? [],
    },
  })
  res.status(201).json({ project })
})

// ---------------------------------------------------------------------------
// GET /projects/:id
// ---------------------------------------------------------------------------
router.get('/projects/:id', async (req: Request, res: Response): Promise<void> => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    include: {
      builder:      true,
      unit_types:   { orderBy: { bhk: 'asc' } },
      images:       { orderBy: { sort_order: 'asc' } },
      amenities:    true,
      connectivity: true,
      dna:                    true,
      decision_profile:       true,
      persona_profile:        true,
      recommendation_profile: true,
      competitors:            { orderBy: { sort_order: 'asc' } },
      payment_plan:           true,
      cost_sheet:             true,
    },
  })
  if (!project) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.json({ project })
})

// ---------------------------------------------------------------------------
// GET /projects/:id/completeness
// ---------------------------------------------------------------------------
router.get('/projects/:id/completeness', async (req: Request, res: Response): Promise<void> => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    include: {
      builder:                true,
      unit_types:             { select: { id: true, price_min_cr: true, super_area_sqft: true, carpet_area_sqft: true } },
      images:                 { select: { type: true } },
      amenities:              { select: { id: true } },
      connectivity:           { select: { id: true } },
      dna:                    { select: {
        builder_track_record_score: true,
        price_position_score:       true,
        locality_score:             true,
        rera_compliance_score:      true,
        amenity_depth_score:        true,
        possession_certainty_score: true,
      }},
      decision_profile:       { select: { decision_thesis: true, why_buy: true, why_avoid: true } },
      persona_profile:        { select: { primary_persona: true } },
      recommendation_profile: { select: { tier: true } },
      competitors:            { select: { id: true } },
    },
  })
  if (!project) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  // ProjectDocument has no @relation on Project — query separately
  const docs = await prisma.projectDocument.findMany({
    where:  { project_id: req.params.id },
    select: { doc_type: true },
  })
  const result = computeCompleteness({ ...project, documents: docs })
  res.json(result)
})

// ---------------------------------------------------------------------------
// PATCH /projects/:id
// ---------------------------------------------------------------------------
router.patch('/projects/:id', async (req: Request, res: Response): Promise<void> => {
  const parsed = ProjectPatchSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message })
    return
  }
  const d = parsed.data

  // Normalize sector and city if being updated
  const updateData: any = { ...d }
  if (d.sector !== undefined) {
    const canonSector = canonicalSector(d.sector)
    if (!canonSector) {
      res.status(400).json({ error: 'Invalid sector format' })
      return
    }
    updateData.sector = canonSector
  }
  if (d.city !== undefined) {
    const canonCity = canonicalCity(d.city)
    if (!canonCity) {
      res.status(400).json({ error: 'Invalid city format' })
      return
    }
    updateData.city = canonCity
  }

  try {
    const updated = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        ...updateData,
        launch_date: d.launch_date ? new Date(d.launch_date) : undefined,
        possession_date: d.possession_date ? new Date(d.possession_date) : undefined,
      },
    })
    res.json({ project: updated })
  } catch (err: unknown) {
    if (isPrismaNotFound(err)) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    console.error('[admin]', err)
    res.status(500).json({ error: 'Internal error' })
  }
})

// ---------------------------------------------------------------------------
// DELETE /projects/:id
// ---------------------------------------------------------------------------
router.delete('/projects/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.project.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (err: unknown) {
    if (isPrismaNotFound(err)) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    console.error('[admin]', err)
    res.status(500).json({ error: 'Internal error' })
  }
})

// ---------------------------------------------------------------------------
// PUT /projects/:id/payment-plan
// ---------------------------------------------------------------------------
router.put('/projects/:id/payment-plan', async (req: Request, res: Response): Promise<void> => {
  try {
    const data = req.body
    await prisma.paymentPlan.upsert({
      where: { project_id: req.params.id },
      create: { project_id: req.params.id, ...data },
      update: data,
    })
    res.json({ ok: true })
  } catch (err: unknown) {
    console.error('[admin] payment plan', err)
    res.status(500).json({ error: 'Internal error' })
  }
})

// ---------------------------------------------------------------------------
// PUT /projects/:id/cost-sheet
// ---------------------------------------------------------------------------
router.put('/projects/:id/cost-sheet', async (req: Request, res: Response): Promise<void> => {
  try {
    const data = req.body
    await prisma.costSheet.upsert({
      where: { project_id: req.params.id },
      create: { project_id: req.params.id, ...data },
      update: data,
    })
    res.json({ ok: true })
  } catch (err: unknown) {
    console.error('[admin] cost sheet', err)
    res.status(500).json({ error: 'Internal error' })
  }
})

// ---------------------------------------------------------------------------
// PATCH /projects/:id/investment-insights
// ---------------------------------------------------------------------------
router.patch('/projects/:id/investment-insights', async (req: Request, res: Response): Promise<void> => {
  try {
    const profile = await prisma.decisionProfile.findUnique({ where: { project_id: req.params.id } })
    const existingData: any = profile?.intelligence_data || {}
    const newData = { ...existingData, investment_insights: req.body }
    
    await prisma.decisionProfile.upsert({
      where: { project_id: req.params.id },
      create: { project_id: req.params.id, intelligence_data: newData },
      update: { intelligence_data: newData },
    })
    res.json({ ok: true })
  } catch (err: unknown) {
    console.error('[admin] investment insights', err)
    res.status(500).json({ error: 'Internal error' })
  }
})

// ---------------------------------------------------------------------------
// PATCH /projects/:id/dna
// ---------------------------------------------------------------------------
router.patch('/projects/:id/dna', async (req: Request, res: Response): Promise<void> => {
  const parsed = DnaPatchSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0].message }); return }
  try {
    const before = await prisma.projectDna.findUnique({ where: { project_id: req.params.id } })
    const dna = await prisma.projectDna.upsert({
      where:  { project_id: req.params.id },
      create: { project_id: req.params.id, ...parsed.data },
      update: parsed.data,
    })
    await prisma.intelligenceAudit.create({
      data: {
        project_id:  req.params.id,
        section:     'dna',
        action:      before ? 'update' : 'create',
        before_data: before as object ?? undefined,
        after_data:  dna as object,
      },
    })
    res.json({ dna })
  } catch (err: unknown) {
    if (isPrismaNotFound(err)) { res.status(404).json({ error: 'Not found' }); return }
    console.error('[admin] dna patch', err)
    res.status(500).json({ error: 'Internal error' })
  }
})

// ---------------------------------------------------------------------------
// PATCH /projects/:id/decision-profile
// ---------------------------------------------------------------------------
router.patch('/projects/:id/decision-profile', async (req: Request, res: Response): Promise<void> => {
  const parsed = DecisionProfilePatchSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0].message }); return }
  const d = parsed.data
  const data = {
    ...d,
    why_buy:   d.why_buy?.filter(s => s.trim()) ?? undefined,
    why_avoid: d.why_avoid?.filter(s => s.trim()) ?? undefined,
  }
  try {
    const before = await prisma.decisionProfile.findUnique({ where: { project_id: req.params.id } })
    // Deep-merge intelligence_data instead of overwriting
    const updateData = { ...data }
    if (data.intelligence_data && before?.intelligence_data && typeof before.intelligence_data === 'object' && typeof data.intelligence_data === 'object') {
      updateData.intelligence_data = { ...before.intelligence_data as object, ...data.intelligence_data as object }
    }
    const profile = await prisma.decisionProfile.upsert({
      where:  { project_id: req.params.id },
      create: { project_id: req.params.id, ...data },
      update: updateData,
    })
    await prisma.intelligenceAudit.create({
      data: {
        project_id:  req.params.id,
        section:     'decision_profile',
        action:      before ? 'update' : 'create',
        before_data: before as object ?? undefined,
        after_data:  profile as object,
      },
    })
    res.json({ profile })
  } catch (err: unknown) {
    if (isPrismaNotFound(err)) { res.status(404).json({ error: 'Not found' }); return }
    console.error('[admin] decision-profile patch', err)
    res.status(500).json({ error: 'Internal error' })
  }
})

// ---------------------------------------------------------------------------
// PATCH /projects/:id/persona-profile
// ---------------------------------------------------------------------------
router.patch('/projects/:id/persona-profile', async (req: Request, res: Response): Promise<void> => {
  const parsed = PersonaProfilePatchSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0].message }); return }
  try {
    // Prisma's Json fields require the JsonNull sentinel (not a plain `null`) to clear the column.
    const { persona_descriptions, ...rest } = parsed.data
    const data = {
      ...rest,
      ...(persona_descriptions !== undefined
        ? { persona_descriptions: persona_descriptions === null ? Prisma.JsonNull : persona_descriptions }
        : {}),
    }
    const before = await prisma.personaProfile.findUnique({ where: { project_id: req.params.id } })
    const profile = await prisma.personaProfile.upsert({
      where:  { project_id: req.params.id },
      create: { project_id: req.params.id, ...data },
      update: data,
    })
    await prisma.intelligenceAudit.create({
      data: {
        project_id:  req.params.id,
        section:     'persona_profile',
        action:      before ? 'update' : 'create',
        before_data: before as object ?? undefined,
        after_data:  profile as object,
      },
    })
    res.json({ profile })
  } catch (err: unknown) {
    if (isPrismaNotFound(err)) { res.status(404).json({ error: 'Not found' }); return }
    console.error('[admin] persona-profile patch', err)
    res.status(500).json({ error: 'Internal error' })
  }
})

// ---------------------------------------------------------------------------
// PATCH /projects/:id/recommendation-profile
// ---------------------------------------------------------------------------
router.patch('/projects/:id/recommendation-profile', async (req: Request, res: Response): Promise<void> => {
  const parsed = RecommendationProfilePatchSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0].message }); return }
  const d = parsed.data
  const data = {
    ...d,
    walk_away_conditions: d.walk_away_conditions?.filter(s => s.trim()) ?? undefined,
    negotiation_leverage: d.negotiation_leverage?.filter(s => s.trim()) ?? undefined,
  }
  try {
    const before = await prisma.recommendationProfile.findUnique({ where: { project_id: req.params.id } })
    const profile = await prisma.recommendationProfile.upsert({
      where:  { project_id: req.params.id },
      create: { project_id: req.params.id, ...data },
      update: data,
    })
    await prisma.intelligenceAudit.create({
      data: {
        project_id:  req.params.id,
        section:     'recommendation_profile',
        action:      before ? 'update' : 'create',
        before_data: before as object ?? undefined,
        after_data:  profile as object,
      },
    })
    res.json({ profile })
  } catch (err: unknown) {
    if (isPrismaNotFound(err)) { res.status(404).json({ error: 'Not found' }); return }
    console.error('[admin] recommendation-profile patch', err)
    res.status(500).json({ error: 'Internal error' })
  }
})

// ---------------------------------------------------------------------------
// POST /projects/:id/competitors
// ---------------------------------------------------------------------------
router.post('/projects/:id/competitors', async (req: Request, res: Response): Promise<void> => {
  const parsed = CompetitorCreateSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0].message }); return }
  if (parsed.data.competitor_project_id === req.params.id) {
    res.status(400).json({ error: 'Project cannot compete with itself' }); return
  }
  const competitor = await prisma.projectCompetitor.create({
    data: { project_id: req.params.id, ...parsed.data },
  })
  await prisma.intelligenceAudit.create({
    data: {
      project_id: req.params.id,
      section:    'competitor',
      action:     'create',
      after_data: competitor as object,
    },
  })
  res.status(201).json({ competitor })
})

// ---------------------------------------------------------------------------
// PATCH /competitors/:competitorId
// ---------------------------------------------------------------------------
router.patch('/competitors/:competitorId', async (req: Request, res: Response): Promise<void> => {
  const parsed = CompetitorPatchSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0].message }); return }
  try {
    const before = await prisma.projectCompetitor.findUnique({ where: { id: req.params.competitorId } })
    const competitor = await prisma.projectCompetitor.update({
      where: { id: req.params.competitorId },
      data:  parsed.data,
    })
    await prisma.intelligenceAudit.create({
      data: {
        project_id:  competitor.project_id,
        section:     'competitor',
        action:      'update',
        before_data: before as object ?? undefined,
        after_data:  competitor as object,
      },
    })
    res.json({ competitor })
  } catch (err: unknown) {
    if (isPrismaNotFound(err)) { res.status(404).json({ error: 'Not found' }); return }
    console.error('[admin] competitor patch', err)
    res.status(500).json({ error: 'Internal error' })
  }
})

// ---------------------------------------------------------------------------
// DELETE /competitors/:competitorId
// ---------------------------------------------------------------------------
router.delete('/competitors/:competitorId', async (req: Request, res: Response): Promise<void> => {
  try {
    const before = await prisma.projectCompetitor.findUnique({ where: { id: req.params.competitorId } })
    await prisma.projectCompetitor.delete({ where: { id: req.params.competitorId } })
    if (before) {
      await prisma.intelligenceAudit.create({
        data: {
          project_id:  before.project_id,
          section:     'competitor',
          action:      'delete',
          before_data: before as object,
        },
      })
    }
    res.json({ ok: true })
  } catch (err: unknown) {
    if (isPrismaNotFound(err)) { res.status(404).json({ error: 'Not found' }); return }
    console.error('[admin] competitor delete', err)
    res.status(500).json({ error: 'Internal error' })
  }
})

// ---------------------------------------------------------------------------
// POST /projects/:id/units
// ---------------------------------------------------------------------------
router.post('/projects/:id/units', async (req: Request, res: Response): Promise<void> => {
  const parsed = UnitCreateSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0].message }); return }
  const project = await prisma.project.findUnique({ where: { id: req.params.id }, select: { id: true } })
  if (!project) { res.status(404).json({ error: 'Project not found' }); return }
  const unit = await prisma.unitType.create({
    data: { project_id: req.params.id, ...parsed.data },
  })
  res.status(201).json({ unit })
})

// ---------------------------------------------------------------------------
// PATCH /units/:unitId
// ---------------------------------------------------------------------------
router.patch('/units/:unitId', async (req: Request, res: Response): Promise<void> => {
  const parsed = UnitPatchSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0].message }); return }
  try {
    const unit = await prisma.unitType.update({
      where: { id: req.params.unitId },
      data:  parsed.data,
    })
    res.json({ unit })
  } catch (err: unknown) {
    if (isPrismaNotFound(err)) { res.status(404).json({ error: 'Not found' }); return }
    console.error('[admin] unit patch', err)
    res.status(500).json({ error: 'Internal error' })
  }
})

// ---------------------------------------------------------------------------
// DELETE /units/:unitId
// ---------------------------------------------------------------------------
router.delete('/units/:unitId', async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.unitType.delete({ where: { id: req.params.unitId } })
    res.json({ ok: true })
  } catch (err: unknown) {
    if (isPrismaNotFound(err)) { res.status(404).json({ error: 'Not found' }); return }
    console.error('[admin] unit delete', err)
    res.status(500).json({ error: 'Internal error' })
  }
})

// ---------------------------------------------------------------------------
// Zod schemas — Amenity, Connectivity, Image, Document
// ---------------------------------------------------------------------------
const AmenityCreateSchema = z.object({
  name:     z.string().min(1),
  category: z.enum(['sports', 'lifestyle', 'wellness', 'kids', 'security', 'parking']),
})

const AmenityPatchSchema = z.object({
  name:     z.string().min(1).optional(),
  category: z.enum(['sports', 'lifestyle', 'wellness', 'kids', 'security', 'parking']).optional(),
})

const ConnectivityCreateSchema = z.object({
  type:        z.enum(['metro', 'road', 'expressway', 'school', 'hospital', 'mall', 'landmark', 'airport', 'university']),
  name:        z.string().min(1),
  distance_km: z.number().nullable().optional(),
  data_source: z.enum(['brochure', 'google', 'estimated', 'manual']).optional(),
  notes:       z.string().nullable().optional(),
})

const ConnectivityPatchSchema = z.object({
  type:        z.enum(['metro', 'road', 'expressway', 'school', 'hospital', 'mall', 'landmark', 'airport', 'university']).optional(),
  name:        z.string().min(1).optional(),
  distance_km: z.number().nullable().optional(),
  data_source: z.enum(['brochure', 'google', 'estimated', 'manual']).optional(),
  notes:       z.string().nullable().optional(),
})

const ImagePatchSchema = z.object({
  type:       z.enum(['hero', 'exterior', 'interior', 'floor_plan', 'amenity', 'master_plan', 'clubhouse', 'pool', 'location_map']).optional(),
  caption:    z.string().nullable().optional(),
  bhk:        z.number().int().nullable().optional(),
  size_sqft:  z.number().int().nullable().optional(),
  sort_order: z.number().int().optional(),
})

const ImageCreateSchema = z.object({
  url:        z.string().url(),
  type:       z.enum(['hero', 'exterior', 'interior', 'floor_plan', 'amenity', 'master_plan', 'clubhouse', 'pool', 'location_map']),
  caption:    z.string().nullable().optional(),
  bhk:        z.number().int().nullable().optional(),
  size_sqft:  z.number().int().nullable().optional(),
  sort_order: z.number().int().optional(),
})

// ---------------------------------------------------------------------------
// POST /projects/:id/amenities
// ---------------------------------------------------------------------------
router.post('/projects/:id/amenities', async (req: Request, res: Response): Promise<void> => {
  const parsed = AmenityCreateSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0].message }); return }
  const project = await prisma.project.findUnique({ where: { id: req.params.id }, select: { id: true } })
  if (!project) { res.status(404).json({ error: 'Project not found' }); return }
  const amenity = await prisma.amenity.create({
    data: { project_id: req.params.id, ...parsed.data },
  })
  res.status(201).json({ amenity })
})

// ---------------------------------------------------------------------------
// PATCH /amenities/:amenityId
// ---------------------------------------------------------------------------
router.patch('/amenities/:amenityId', async (req: Request, res: Response): Promise<void> => {
  const parsed = AmenityPatchSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0].message }); return }
  try {
    const amenity = await prisma.amenity.update({ where: { id: req.params.amenityId }, data: parsed.data })
    res.json({ amenity })
  } catch (err: unknown) {
    if (isPrismaNotFound(err)) { res.status(404).json({ error: 'Not found' }); return }
    res.status(500).json({ error: 'Internal error' })
  }
})

// ---------------------------------------------------------------------------
// DELETE /amenities/:amenityId
// ---------------------------------------------------------------------------
router.delete('/amenities/:amenityId', async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.amenity.delete({ where: { id: req.params.amenityId } })
    res.json({ ok: true })
  } catch (err: unknown) {
    if (isPrismaNotFound(err)) { res.status(404).json({ error: 'Not found' }); return }
    res.status(500).json({ error: 'Internal error' })
  }
})

// ---------------------------------------------------------------------------
// POST /projects/:id/connectivity
// ---------------------------------------------------------------------------
router.post('/projects/:id/connectivity', async (req: Request, res: Response): Promise<void> => {
  const parsed = ConnectivityCreateSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0].message }); return }
  const project = await prisma.project.findUnique({ where: { id: req.params.id }, select: { id: true } })
  if (!project) { res.status(404).json({ error: 'Project not found' }); return }
  const entry = await prisma.connectivity.create({
    data: { project_id: req.params.id, ...parsed.data },
  })
  res.status(201).json({ entry })
})

// ---------------------------------------------------------------------------
// PATCH /connectivity/:connId
// ---------------------------------------------------------------------------
router.patch('/connectivity/:connId', async (req: Request, res: Response): Promise<void> => {
  const parsed = ConnectivityPatchSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0].message }); return }
  try {
    const entry = await prisma.connectivity.update({ where: { id: req.params.connId }, data: parsed.data })
    res.json({ entry })
  } catch (err: unknown) {
    if (isPrismaNotFound(err)) { res.status(404).json({ error: 'Not found' }); return }
    res.status(500).json({ error: 'Internal error' })
  }
})

// ---------------------------------------------------------------------------
// DELETE /connectivity/:connId
// ---------------------------------------------------------------------------
router.delete('/connectivity/:connId', async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.connectivity.delete({ where: { id: req.params.connId } })
    res.json({ ok: true })
  } catch (err: unknown) {
    if (isPrismaNotFound(err)) { res.status(404).json({ error: 'Not found' }); return }
    res.status(500).json({ error: 'Internal error' })
  }
})

// ---------------------------------------------------------------------------
// GET /projects/:id/images
// ---------------------------------------------------------------------------
router.get('/projects/:id/images', async (req: Request, res: Response): Promise<void> => {
  const images = await prisma.projectImage.findMany({
    where:   { project_id: req.params.id },
    orderBy: { sort_order: 'asc' },
  })
  res.json({ images })
})

// ---------------------------------------------------------------------------
// POST /projects/:id/images  (attach an already-uploaded URL to the gallery)
// ---------------------------------------------------------------------------
router.post('/projects/:id/images', async (req: Request, res: Response): Promise<void> => {
  const parsed = ImageCreateSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0].message }); return }
  const project = await prisma.project.findUnique({ where: { id: req.params.id }, select: { id: true } })
  if (!project) { res.status(404).json({ error: 'Project not found' }); return }
  const image = await prisma.projectImage.create({
    data: { project_id: req.params.id, ...parsed.data },
  })
  res.status(201).json({ image })
})

// ---------------------------------------------------------------------------
// PATCH /images/:imageId
// ---------------------------------------------------------------------------
router.patch('/images/:imageId', async (req: Request, res: Response): Promise<void> => {
  const parsed = ImagePatchSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0].message }); return }
  try {
    const image = await prisma.projectImage.update({ where: { id: req.params.imageId }, data: parsed.data })
    res.json({ image })
  } catch (err: unknown) {
    if (isPrismaNotFound(err)) { res.status(404).json({ error: 'Not found' }); return }
    res.status(500).json({ error: 'Internal error' })
  }
})

// ---------------------------------------------------------------------------
// DELETE /images/:imageId
// ---------------------------------------------------------------------------
router.delete('/images/:imageId', async (req: Request, res: Response): Promise<void> => {
  try {
    const image = await prisma.projectImage.findUnique({ where: { id: req.params.imageId } })
    if (!image) { res.status(404).json({ error: 'Not found' }); return }

    // Delete from Supabase if image source is 'admin' (seed images stay in bucket for backup)
    if ((image as any).source === 'admin' && image.url) {
      const pathMatch = image.url.match(/property-images\/(.+)$/)
      if (pathMatch) {
        try {
          await supabaseAdmin.storage.from('property-images').remove([pathMatch[1]])
          console.log(`[IMAGE_DELETE] Removed from Supabase: ${pathMatch[1]}`)
        } catch (storageErr) {
          console.warn(`[IMAGE_DELETE] Supabase cleanup failed: ${storageErr}`)
        }
      }
    }

    // Delete from DB
    await prisma.projectImage.delete({ where: { id: req.params.imageId } })
    console.log(`[IMAGE_DELETE] Removed from DB: imageId=${req.params.imageId} url=${image.url} source=${(image as any).source}`)
    res.json({ ok: true })
  } catch (err: unknown) {
    if (isPrismaNotFound(err)) { res.status(404).json({ error: 'Not found' }); return }
    console.error('[IMAGE_DELETE_ERROR]', err)
    res.status(500).json({ error: 'Internal error' })
  }
})

// ---------------------------------------------------------------------------
// GET /projects/:id/documents
// ---------------------------------------------------------------------------
router.get('/projects/:id/documents', async (req: Request, res: Response): Promise<void> => {
  const documents = await prisma.projectDocument.findMany({
    where:   { project_id: req.params.id },
    orderBy: { created_at: 'desc' },
  })
  res.json({ documents })
})

// ---------------------------------------------------------------------------
// DELETE /documents/:docId
// ---------------------------------------------------------------------------
router.delete('/documents/:docId', async (req: Request, res: Response): Promise<void> => {
  try {
    const doc = await prisma.projectDocument.findUnique({ where: { id: req.params.docId } })
    if (!doc) { res.status(404).json({ error: 'Not found' }); return }
    // Delete from Supabase Storage if URL is a storage URL
    if (doc.storage_url) {
      const url = new URL(doc.storage_url)
      const pathParts = url.pathname.split('/storage/v1/object/public/')
      if (pathParts.length === 2) {
        const [bucket, ...rest] = pathParts[1].split('/')
        await supabaseAdmin.storage.from(bucket).remove([rest.join('/')])
      }
    }
    await prisma.projectDocument.delete({ where: { id: req.params.docId } })
    res.json({ ok: true })
  } catch (err: unknown) {
    if (isPrismaNotFound(err)) { res.status(404).json({ error: 'Not found' }); return }
    console.error('[admin] document delete', err)
    res.status(500).json({ error: 'Internal error' })
  }
})

// ---------------------------------------------------------------------------
// GET /builders
// ---------------------------------------------------------------------------
router.get('/builders', async (req: Request, res: Response): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20))
  const skip = (page - 1) * limit

  const builders = await prisma.builder.findMany({
    include: { _count: { select: { projects: true } } },
    orderBy: { name: 'asc' },
    skip,
    take: limit,
  })
  const total = await prisma.builder.count()
  res.json({ builders, total, page, limit, pages: Math.ceil(total / limit) })
})

// ---------------------------------------------------------------------------
// POST /builders
// ---------------------------------------------------------------------------
router.post('/builders', async (req: Request, res: Response): Promise<void> => {
  const parsed = BuilderSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message })
    return
  }
  const d = parsed.data
  const builder = await prisma.builder.create({
    data: {
      ...d,
      delivered_projects: d.delivered_projects ?? [],
      ongoing_projects:   d.ongoing_projects   ?? [],
      awards:             d.awards             ?? [],
    },
  })
  res.status(201).json({ builder })
})

// ---------------------------------------------------------------------------
// PATCH /builders/:id
// ---------------------------------------------------------------------------
router.patch('/builders/:id', async (req: Request, res: Response): Promise<void> => {
  const parsed = BuilderPatchSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message })
    return
  }
  try {
    const builder = await prisma.builder.update({
      where: { id: req.params.id },
      data:  parsed.data as Prisma.BuilderUpdateInput,
    })
    res.json({ builder })
  } catch (err: unknown) {
    if (isPrismaNotFound(err)) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    console.error('[admin]', err)
    res.status(500).json({ error: 'Internal error' })
  }
})

// ---------------------------------------------------------------------------
// DELETE /builders/:id
// ---------------------------------------------------------------------------
router.delete('/builders/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.builder.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (err: unknown) {
    if (isPrismaNotFound(err)) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    console.error('[admin]', err)
    res.status(500).json({ error: 'Internal error' })
  }
})

// ---------------------------------------------------------------------------
// ─── BUILDER APPLICATIONS ───────────────────────────────────────────────
router.use('/applications', applicationsRouter)

// POST /upload-image
// ---------------------------------------------------------------------------
const BUCKET = 'property-images'

router.post(
  '/upload-image',
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    const file = req.file
    const slug = ((req.body?.slug as string | undefined) ?? 'unnamed').replace(/[^a-z0-9-]/g, '')

    if (!file) {
      res.status(400).json({ error: 'No file provided' })
      return
    }

    const validation = await validateUploadedFile(file.buffer)
    if (!validation.valid) {
      res.status(400).json({ error: validation.error || 'Invalid file type' })
      return
    }

    const ext  = (file.originalname.split('.').pop()?.toLowerCase()) ?? 'jpg'
    const path = `projects/${slug}-${Date.now()}.${ext}`

    const { error: uploadErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, file.buffer, { contentType: file.mimetype, upsert: true })

    if (uploadErr) {
      res.status(500).json({ error: uploadErr.message })
      return
    }

    const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)
    res.json({ url: data.publicUrl })
  },
)

// ---------------------------------------------------------------------------
// ─── ANALYTICS ─────────────────────────────────────────────────────────────
// ---------------------------------------------------------------------------
router.get('/analytics/summary', async (req: Request, res: Response): Promise<void> => {
  try {
    const totalChats = await prisma.chatSession.count()
    const totalQueries = await prisma.chatMessage.count({ where: { role: 'user' } })
    const zeroResultSearches = await prisma.queryMetrics.count({ where: { had_results: false } })
    const conversionsCount = await prisma.chatAnalytics.count({ where: { conversion_type: { not: null } } })
    const clarificationsAgg = await prisma.queryMetrics.aggregate({ _avg: { clarification_count: true } })

    const topSectorsData = await prisma.queryMetrics.groupBy({
      by: ['sector'],
      _count: { sector: true },
      orderBy: { _count: { sector: 'desc' } },
      where: { sector: { not: null } },
      take: 5
    })

    const topBuildersData = await prisma.queryMetrics.groupBy({
      by: ['builder'],
      _count: { builder: true },
      orderBy: { _count: { builder: 'desc' } },
      where: { builder: { not: null } },
      take: 5
    })

    const conversionRate = totalChats > 0 ? ((conversionsCount / totalChats) * 100).toFixed(1) + '%' : '0%'

    res.json({
      totalChats,
      totalQueries,
      avgQueriesPerChat: totalChats > 0 ? (totalQueries / totalChats).toFixed(1) : 0,
      zeroResultSearches,
      zeroResultSearchRate: totalQueries > 0 ? ((zeroResultSearches / totalQueries) * 100).toFixed(1) + '%' : '0%',
      conversionRate,
      avgClarifications: (clarificationsAgg._avg.clarification_count ?? 0).toFixed(1),
      topSectors: topSectorsData.map(d => ({ sector: d.sector as string, count: d._count.sector })),
      topBuilders: topBuildersData.map(d => ({ builder: d.builder as string, count: d._count.builder }))
    })
  } catch (err) {
    console.error('[analytics/summary]', err)
    res.status(500).json({ error: 'Internal error' })
  }
})

router.get('/analytics/quality', async (req: Request, res: Response): Promise<void> => {
  try {
    const totalSearches = await prisma.queryMetrics.count()
    const zeroResultSearches = await prisma.queryMetrics.count({ where: { had_results: false } })
    const searchWithResults = await prisma.queryMetrics.count({ where: { had_results: true } })
    const agg = await prisma.queryMetrics.aggregate({
      _avg: { clarification_count: true, results_count: true }
    })

    res.json({
      totalSearches,
      zeroResultSearches,
      zeroResultRate: totalSearches > 0 ? ((zeroResultSearches / totalSearches) * 100).toFixed(1) + '%' : '0%',
      searchWithResults,
      searchWithoutResults: zeroResultSearches,
      avgClarifications: (agg._avg.clarification_count ?? 0).toFixed(1),
      avgResultsCount: (agg._avg.results_count ?? 0).toFixed(1)
    })
  } catch (err) {
    console.error('[analytics/quality]', err)
    res.status(500).json({ error: 'Internal error' })
  }
})

router.get('/analytics/users', async (req: Request, res: Response): Promise<void> => {
  try {
    const totalUsers = await prisma.userMemory.count()
    const totalConversions = await prisma.chatAnalytics.count({ where: { conversion_type: { not: null } } })

    const totalChats = await prisma.chatSession.count()
    const searches = await prisma.queryMetrics.count()
    const clicks = await prisma.propertyEvent.count({ where: { action: 'view' } })
    const saves = await prisma.savedProperty.count()

    // A rough approximation of repeated visitors:
    const sessionsGrouped = await prisma.chatSession.groupBy({
      by: ['user_id'],
      _count: { id: true },
      where: { user_id: { not: null } }
    })
    const repeatedVisitors = sessionsGrouped.filter(s => s._count.id > 1).length

    const avgQueriesPerUser = totalUsers > 0 ? (searches / totalUsers) : 0

    const topSectorsData = await prisma.queryMetrics.groupBy({
      by: ['sector'],
      _count: { sector: true },
      orderBy: { _count: { sector: 'desc' } },
      where: { sector: { not: null } },
      take: 5
    })

    res.json({
      totalUsers,
      repeatedVisitors,
      totalConversions,
      avgQueriesPerUser,
      mostActiveSectors: topSectorsData.map(d => ({ sector: d.sector as string, searches: d._count.sector })),
      conversionFunnel: {
        chats: totalChats,
        searches,
        clicks,
        saves,
        conversions: totalConversions
      }
    })
  } catch (err) {
    console.error('[analytics/users]', err)
    res.status(500).json({ error: 'Internal error' })
  }
})


router.get('/analytics/properties', async (req: Request, res: Response): Promise<void> => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const events = await prisma.propertyEvent.findMany({
      where: { created_at: { gte: thirtyDaysAgo } },
      orderBy: { created_at: 'desc' },
      take: 50000,
    })
    const projectIds = [...new Set(events.map((e: any) => e.project_id))]
    const projects = await prisma.project.findMany({
      where: { id: { in: projectIds as string[] } },
      select: { id: true, name: true }
    })
    const projectMap = new Map(projects.map((p: any) => [p.id, p.name]))

    const propertiesMap = new Map<string, any>()
    for (const ev of events as any[]) {
      if (!ev.project_id) continue
      const projectName = projectMap.get(ev.project_id)
      if (!projectName) continue

      if (!propertiesMap.has(ev.project_id)) {
        propertiesMap.set(ev.project_id, {
          projectId: ev.project_id,
          projectName: projectName,
          views: 0,
          shares: 0,
          saves: 0,
          comparisons: 0,
          whatsappInquiries: 0,
          leads: 0,
        })
      }
      
      const p = propertiesMap.get(ev.project_id)
      if (ev.action === 'view' || ev.action === 'gallery') p.views++
      if (ev.action === 'share') p.shares++
      if (ev.action === 'save') p.saves++
      if (ev.action === 'compare') p.comparisons++
      if (ev.action === 'whatsapp') p.whatsappInquiries++
      if (['call', 'whatsapp', 'site_visit'].includes(ev.action)) p.leads++
    }

    const properties = Array.from(propertiesMap.values()).sort((a, b) => (b.views + b.saves) - (a.views + a.saves))

    res.json({ properties })
  } catch (err: unknown) {
    console.error('[admin] analytics properties', err)
    res.status(500).json({ error: 'Internal error' })
  }
})

export default router

