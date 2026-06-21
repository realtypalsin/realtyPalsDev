import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import multer from 'multer'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '../lib/db'
import { validateAdminToken, makeAdminToken } from '../lib/adminAuth'

const router = Router()

// ---------------------------------------------------------------------------
// Supabase admin client (service role — bypasses RLS)
// ---------------------------------------------------------------------------
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ''
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    ''
  return createClient(url, key)
}

// ---------------------------------------------------------------------------
// Multer — memory storage, 10 MB limit
// ---------------------------------------------------------------------------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
})

// ---------------------------------------------------------------------------
// requireAdmin middleware
// ---------------------------------------------------------------------------
function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.admin_token as string | undefined
  if (!validateAdminToken(token)) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  next()
}

// ---------------------------------------------------------------------------
// POST /auth — login (no admin token required)
// ---------------------------------------------------------------------------
router.post('/auth', async (req: Request, res: Response): Promise<void> => {
  const { password } = (req.body ?? {}) as { password?: string }
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword || password !== adminPassword) {
    res.status(401).json({ error: 'Invalid password' })
    return
  }
  const token = makeAdminToken(password)
  const isProduction = process.env.NODE_ENV === 'production'
  res.cookie('admin_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    secure: isProduction,
    path: '/',
  })
  res.json({ ok: true })
})

// ---------------------------------------------------------------------------
// DELETE /auth — logout (no admin token required)
// ---------------------------------------------------------------------------
router.delete('/auth', (_req: Request, res: Response): void => {
  res.clearCookie('admin_token', { path: '/' })
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
router.get('/leads', async (_req: Request, res: Response): Promise<void> => {
  const [siteVisits, callbacks] = await Promise.all([
    prisma.siteVisitRequest.findMany({ orderBy: { created_at: 'desc' }, take: 50 }),
    prisma.callbackRequest.findMany({ orderBy: { created_at: 'desc' }, take: 50 }),
  ])
  res.json({ siteVisits, callbacks })
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
  possession_label:   z.string().optional(),
  possession_date:    z.string().optional(),
  description:        z.string().optional(),
  long_description:   z.string().optional(),
  design_theme:       z.string().optional(),
  architect:          z.string().optional(),
  hero_image_url:     z.string().optional(),
  marketing_claims:   z.array(z.string()).optional(),
  ai_search_keywords: z.array(z.string()).optional(),
})

const ProjectPatchSchema = z.object({
  name:               z.string().min(2).optional(),
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
  possession_label:   z.string().optional(),
  possession_date:    z.string().optional(),
  description:        z.string().optional(),
  long_description:   z.string().optional(),
  design_theme:       z.string().optional(),
  architect:          z.string().optional(),
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
})

const BuilderPatchSchema = z.object({
  name:          z.string().min(2).optional(),
  slug:          z.string().min(2).optional(),
  founded_year:  z.number().int().nullable().optional(),
  headquarters:  z.string().nullable().optional(),
  website:       z.string().nullable().optional(),
  credai_member: z.boolean().optional(),
})

// ---------------------------------------------------------------------------
// GET /projects
// ---------------------------------------------------------------------------
router.get('/projects', async (req: Request, res: Response): Promise<void> => {
  const search = (req.query.q as string | undefined) ?? ''
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
  })
  res.json({ projects })
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
  const project = await prisma.project.create({
    data: {
      name:               d.name,
      slug:               d.slug,
      builder_id:         d.builder_id,
      sector:             d.sector,
      city:               d.city,
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
    },
  })
  if (!project) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.json({ project })
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
  const updated = await prisma.project.update({
    where: { id: req.params.id },
    data: {
      ...d,
      possession_date: d.possession_date ? new Date(d.possession_date) : undefined,
    },
  })
  res.json({ project: updated })
})

// ---------------------------------------------------------------------------
// DELETE /projects/:id
// ---------------------------------------------------------------------------
router.delete('/projects/:id', async (req: Request, res: Response): Promise<void> => {
  await prisma.project.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

// ---------------------------------------------------------------------------
// GET /builders
// ---------------------------------------------------------------------------
router.get('/builders', async (_req: Request, res: Response): Promise<void> => {
  const builders = await prisma.builder.findMany({
    include: { _count: { select: { projects: true } } },
    orderBy: { name: 'asc' },
  })
  res.json({ builders })
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
  const builder = await prisma.builder.update({
    where: { id: req.params.id },
    data:  parsed.data,
  })
  res.json({ builder })
})

// ---------------------------------------------------------------------------
// DELETE /builders/:id
// ---------------------------------------------------------------------------
router.delete('/builders/:id', async (req: Request, res: Response): Promise<void> => {
  await prisma.builder.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

// ---------------------------------------------------------------------------
// POST /upload-image
// ---------------------------------------------------------------------------
const BUCKET = 'property-images'

router.post(
  '/upload-image',
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    const file = req.file
    const slug = (req.body?.slug as string | undefined) ?? 'unnamed'

    if (!file) {
      res.status(400).json({ error: 'No file provided' })
      return
    }

    const ext      = (file.originalname.split('.').pop()?.toLowerCase()) ?? 'jpg'
    const path     = `projects/${slug}-${Date.now()}.${ext}`
    const supabase = getSupabaseAdmin()

    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file.buffer, { contentType: file.mimetype, upsert: true })

    if (uploadErr) {
      res.status(500).json({ error: uploadErr.message })
      return
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    res.json({ url: data.publicUrl })
  },
)

export default router
