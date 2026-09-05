import { Router, Request, Response } from 'express'
import { timingSafeEqual } from 'crypto'
import { prisma } from '../lib/db'
import { createAdminSession, requireAdmin, destroyAdminSession } from '../lib/adminAuth'
import { computeCompleteness } from '../lib/completeness'
import { checkRateLimit } from '../lib/cache'

// ProjectDocument has no @relation to Project, and rows may carry either
// project_id or project_slug. Resolve the :id param (which may be an id OR a
// slug) to both, then match on either column.
async function findProjectDocuments(idOrSlug: string) {
  const project = await prisma.project.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    select: { id: true, slug: true },
  })
  if (!project) return null
  const documents = await prisma.projectDocument.findMany({
    where: { OR: [{ project_id: project.id }, { project_slug: project.slug }] },
    orderBy: { created_at: 'desc' },
  })
  return { project, documents }
}

const router = Router()

// Constant-time password compare — avoids leaking length/match via timing.
function passwordMatches(input: string, expected: string): boolean {
  const a = Buffer.from(input)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

// POST /api/v1/admin/auth — exchange the admin password for a session token.
router.post('/auth', async (req: Request, res: Response) => {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown'

  // Rate limit: 50 attempts in dev, 5 in prod per 15 minutes per IP
  const maxAttempts = process.env.NODE_ENV === 'development' ? 50 : 5
  const { allowed } = await checkRateLimit(`admin:login:${ip}`, maxAttempts, 900)
  if (!allowed) {
    res.status(429).json({ error: 'Too many login attempts. Try again later.' })
    return
  }

  const expected = process.env.ADMIN_PASSWORD
  if (!expected) {
    console.error('[admin] ADMIN_PASSWORD not set — refusing login')
    res.status(500).json({ error: 'Admin auth not configured' })
    return
  }

  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  if (!password || !passwordMatches(password, expected)) {
    res.status(401).json({ error: 'Wrong password' })
    return
  }

  const userAgent = (req.headers['user-agent'] as string) || 'unknown'
  const token = await createAdminSession(ip, userAgent)
  res.json({ token })
})

// DELETE /api/v1/admin/auth — logout: clear session token
router.delete('/auth', requireAdmin, async (req: Request, res: Response) => {
  try {
    const token = ((req.cookies as any)?.admin_session ||
      (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : '')) ?? ''

    if (token) {
      await destroyAdminSession(token)
    }
    res.clearCookie('admin_session', { httpOnly: true, secure: true, sameSite: 'strict' })
    res.json({ success: true, message: 'Logged out' })
  } catch (err) {
    console.error('[admin] logout failed:', err)
    res.status(500).json({ error: 'Logout failed' })
  }
})

// GET /api/v1/admin/callbacks — list all callbacks with filters
router.get('/callbacks', requireAdmin, async (req: Request, res: Response) => {
  const { limit = '50', offset = '0', tier, status } = req.query

  try {
    const where: any = {}
    if (tier && tier !== 'all') {
      where.lead_tier = tier as string
    }
    if (status && status !== 'all') {
      where.status = status as string
    }

    const [callbacks, total] = await Promise.all([
      prisma.callbackRequest.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.callbackRequest.count({ where }),
    ])

    res.json({
      callbacks,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    })
  } catch (err) {
    console.error('[admin] callbacks query failed:', err)
    res.status(500).json({ error: 'Failed to fetch callbacks' })
  }
})

// GET /api/v1/admin/callbacks/:id — view single callback
router.get('/callbacks/:id', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const callback = await prisma.callbackRequest.findUnique({
      where: { id },
    })

    if (!callback) {
      res.status(404).json({ error: 'Callback not found' })
      return
    }

    res.json(callback)
  } catch (err) {
    console.error('[admin] callback detail failed:', err)
    res.status(500).json({ error: 'Failed to fetch callback' })
  }
})

// GET /api/v1/admin/stats — funnel metrics
router.get('/stats', requireAdmin, async (req: Request, res: Response) => {
  try {
    const [totalCallbacks, hotLeads, warmLeads, coldLeads, scoreAgg] = await Promise.all([
      prisma.callbackRequest.count(),
      prisma.callbackRequest.count({ where: { lead_tier: 'HOT' } }),
      prisma.callbackRequest.count({ where: { lead_tier: 'WARM' } }),
      prisma.callbackRequest.count({ where: { lead_tier: 'COLD' } }),
      prisma.callbackRequest.aggregate({ _avg: { lead_score: true } }),
    ])

    res.json({
      totalCallbacks,
      hotLeads,
      warmLeads,
      coldLeads,
      avgScore: scoreAgg._avg.lead_score ?? 0,
    })
  } catch (err) {
    console.error('[admin] stats failed:', err)
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

// GET /api/v1/admin/projects — list projects for dashboard & management
router.get('/projects', requireAdmin, async (req: Request, res: Response) => {
  const { limit = '100', offset = '0', q, search } = req.query
  const searchTerm = (q || search) as string | undefined

  // Lightweight health check (layout.tsx calls this on mount; avoid heavy DB joins)
  if (searchTerm === '_check') {
    res.json({ projects: [], total: 0, health: 'ok' })
    return
  }

  try {
    const where: any = {}
    if (searchTerm && typeof searchTerm === 'string') {
      const queryStr = searchTerm.trim()
      where.OR = [
        { name: { contains: queryStr, mode: 'insensitive' } },
        { slug: { contains: queryStr, mode: 'insensitive' } },
        { sector: { contains: queryStr, mode: 'insensitive' } },
        { builder: { name: { contains: queryStr, mode: 'insensitive' } } },
      ]
    }

    // Retry logic for cold-start connection errors
    let projects: any[] = []
    let total = 0
    let retries = 0
    const maxRetries = 2
    const backoffMs = [10, 100] // ms delays on retry

    while (retries <= maxRetries) {
      try {
        [projects, total] = await Promise.all([
          prisma.project.findMany({
            where,
            include: {
              builder: { select: { id: true, name: true, slug: true } },
              unit_types: true,
              images: true,
            },
            orderBy: { name: 'asc' },
            take: parseInt(limit as string),
            skip: parseInt(offset as string),
          }),
          prisma.project.count({ where }),
        ])
        break // Success, exit retry loop
      } catch (err) {
        if (retries < maxRetries) {
          await new Promise(r => setTimeout(r, backoffMs[retries]))
          retries++
        } else {
          throw err // Final retry failed, propagate error
        }
      }
    }

    // Ensure array fields are non-null for frontend safety
    const safeProjects = projects.map(p => ({
      ...p,
      unit_types: p.unit_types ?? [],
      images: p.images ?? [],
    }))

    res.json({ projects: safeProjects, total, limit: parseInt(limit as string), offset: parseInt(offset as string) })
  } catch (err) {
    console.error('[admin] projects query failed:', err)
    res.status(500).json({ error: 'Failed to fetch projects' })
  }
})

// POST /api/v1/admin/projects — create project
router.post('/projects', requireAdmin, async (req: Request, res: Response) => {
  const { name, slug, sector, city = 'Noida', builder_id, status } = req.body

  if (!name || !builder_id || !status) {
    res.status(400).json({ error: 'name, builder_id, and status are required' })
    return
  }

  const generatedSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')

  try {
    const project = await prisma.project.create({
      data: {
        name,
        slug: generatedSlug,
        sector: sector || 'Central Noida',
        city,
        builder_id,
        status,
      },
      include: {
        builder: { select: { id: true, name: true, slug: true } },
        unit_types: true,
        images: true,
      },
    })

    res.status(201).json({ project, ...project })
  } catch (err) {
    console.error('[admin] project create failed:', err)
    res.status(500).json({ error: 'Failed to create project' })
  }
})

// GET /api/v1/admin/projects/:id — get project detail
router.get('/projects/:id', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const project = await prisma.project.findFirst({
      where: {
        OR: [{ id }, { slug: id }]
      },
      include: {
        builder: { select: { id: true, name: true, slug: true, logo_url: true } },
        unit_types: true,
        images: true,
        amenities: true,
        connectivity: true,
        dna: true,
        decision_profile: true,
        persona_profile: true,
        recommendation_profile: true,
        competitors: { orderBy: { sort_order: 'asc' } },
        construction_updates: { orderBy: { update_date: 'desc' } },
        channel_partners: { include: { channel_partner: true }, orderBy: { created_at: 'asc' } },
        payment_plans: { orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }] },
        cost_sheet: true,
      },
    })

    if (!project) {
      res.status(404).json({ error: 'Project not found' })
      return
    }

    const p = project as any
    const safeProject = {
      ...p,
      dna: p.dna ?? null,
      unit_types: p.unit_types ?? [],
      images: p.images ?? [],
      payment_plans: p.payment_plans ?? [],
      // Primary plan — the admin editor edits one plan at a time.
      payment_plan: p.payment_plans?.[0] ?? null,
    }

    res.json({ project: safeProject, ...safeProject })
  } catch (err) {
    console.error('[admin] project detail failed:', err)
    res.status(500).json({ error: 'Failed to fetch project' })
  }
})

// GET /api/v1/admin/projects/:id/documents — brochures & docs for a project
router.get('/projects/:id/documents', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const found = await findProjectDocuments(id)
    if (!found) {
      res.status(404).json({ error: 'Project not found' })
      return
    }
    res.json({ documents: found.documents, total: found.documents.length })
  } catch (err) {
    console.error('[admin] project documents failed:', err)
    res.status(500).json({ error: 'Failed to fetch project documents' })
  }
})

// GET /api/v1/admin/projects/:id/completeness — publish-readiness score
router.get('/projects/:id/completeness', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const project = await prisma.project.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: {
        builder: { select: { id: true, name: true } },
        unit_types: true,
        images: true,
        amenities: true,
        connectivity: true,
        dna: true,
        decision_profile: true,
        persona_profile: true,
        recommendation_profile: true,
        competitors: true,
        cost_sheet: true,
        payment_plans: true,
        construction_milestones: true,
        construction_updates: true,
        lifecycle_updates: true,
        price_history: true,
        channel_partners: true,
      },
    })

    if (!project) {
      res.status(404).json({ error: 'Project not found' })
      return
    }

    // ProjectDocument has no relation to Project — fetch separately.
    const docs = await prisma.projectDocument.findMany({
      where: { OR: [{ project_id: project.id }, { project_slug: project.slug }] },
      select: { doc_type: true },
    })

    // Responded unwrapped: the admin project page does setCompleteness(json) directly.
    res.json(computeCompleteness({ ...project, documents: docs } as any))
  } catch (err) {
    console.error('[admin] project completeness failed:', err)
    res.status(500).json({ error: 'Failed to compute completeness' })
  }
})

// PATCH /api/v1/admin/projects/:id — update project
router.patch('/projects/:id', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params
  const updates = req.body

  try {
    const { id: _, created_at: __, updated_at: ___, builder: ____, unit_types: _____, images: ______, ...validFields } = updates

    if (validFields.possession_date) {
      validFields.possession_date = new Date(validFields.possession_date)
    }

    const project = await prisma.project.update({
      where: { id },
      data: validFields,
      include: {
        builder: { select: { id: true, name: true, slug: true } },
        unit_types: true,
        images: true,
      },
    })

    const safeProject = {
      ...project,
      unit_types: project.unit_types ?? [],
      images: project.images ?? [],
    }

    res.json({ project: safeProject, ...safeProject })
  } catch (err) {
    console.error('[admin] project update failed:', err)
    res.status(500).json({ error: 'Failed to update project' })
  }
})

// DELETE /api/v1/admin/projects/:id — delete project with cascading cleanup
router.delete('/projects/:id', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params
  try {
    const project = await prisma.project.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      select: { id: true }
    })
    if (!project) {
      res.status(404).json({ error: 'Project not found' })
      return
    }

    const targetId = project.id

    await prisma.$transaction(async (tx) => {
      // Clean up all related records to prevent foreign key constraint violations
      await tx.amenity.deleteMany({ where: { project_id: targetId } }).catch(() => {})
      await tx.connectivity.deleteMany({ where: { project_id: targetId } }).catch(() => {})
      await tx.projectImage.deleteMany({ where: { project_id: targetId } }).catch(() => {})
      await tx.unitType.deleteMany({ where: { project_id: targetId } }).catch(() => {})
      await tx.paymentPlan.deleteMany({ where: { project_id: targetId } }).catch(() => {})
      await tx.costSheet.deleteMany({ where: { project_id: targetId } }).catch(() => {})
      await tx.priceHistory.deleteMany({ where: { project_id: targetId } }).catch(() => {})
      await tx.constructionMilestone.deleteMany({ where: { project_id: targetId } }).catch(() => {})
      await tx.constructionUpdate.deleteMany({ where: { project_id: targetId } }).catch(() => {})
      await tx.projectLifecycleUpdate.deleteMany({ where: { project_id: targetId } }).catch(() => {})
      await tx.unitInventory.deleteMany({ where: { project_id: targetId } }).catch(() => {})
      await tx.projectChannelPartner.deleteMany({ where: { project_id: targetId } }).catch(() => {})
      await tx.projectCompetitor.deleteMany({
        where: { OR: [{ project_id: targetId }, { competitor_project_id: targetId }] }
      }).catch(() => {})
      await tx.savedProperty.deleteMany({ where: { project_id: targetId } }).catch(() => {})
      await tx.priceAlert.deleteMany({ where: { project_id: targetId } }).catch(() => {})
      await tx.builderLead.deleteMany({ where: { project_id: targetId } }).catch(() => {})
      await tx.projectDna.deleteMany({ where: { project_id: targetId } }).catch(() => {})
      await tx.decisionProfile.deleteMany({ where: { project_id: targetId } }).catch(() => {})
      await tx.personaProfile.deleteMany({ where: { project_id: targetId } }).catch(() => {})
      await tx.recommendationProfile.deleteMany({ where: { project_id: targetId } }).catch(() => {})

      // Unlink focused project from chat sessions
      await tx.chatSession.updateMany({
        where: { focus_project_id: targetId },
        data: { focus_project_id: null }
      }).catch(() => {})

      // Finally delete the project record
      await tx.project.delete({ where: { id: targetId } })
    })

    res.json({ success: true, message: 'Project deleted successfully' })
  } catch (err: any) {
    console.error('[admin] project delete failed:', err)
    res.status(500).json({ error: err?.message || 'Failed to delete project' })
  }
})

// GET /api/v1/admin/projects/:id/milestones — fetch construction milestones
router.get('/projects/:id/milestones', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params
  try {
    const project = await prisma.project.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      select: { id: true, slug: true }
    })
    if (!project) {
      res.status(404).json({ error: 'Project not found' })
      return
    }

    const milestones = await prisma.constructionMilestone.findMany({
      where: { project_id: project.id },
      orderBy: { sort_order: 'asc' }
    })

    res.json({ milestones })
  } catch (err) {
    console.error('[admin] fetch milestones failed:', err)
    res.status(500).json({ error: 'Failed to fetch milestones' })
  }
})

// PUT /api/v1/admin/projects/:id/milestones — save/update construction milestones
router.put('/projects/:id/milestones', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params
  const { milestones } = req.body as { milestones: Array<{ name: string; status: 'completed' | 'in_progress' | 'upcoming'; date_label?: string; sort_order?: number }> }

  if (!Array.isArray(milestones)) {
    res.status(400).json({ error: 'milestones array required' })
    return
  }

  try {
    const project = await prisma.project.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      select: { id: true, slug: true }
    })
    if (!project) {
      res.status(404).json({ error: 'Project not found' })
      return
    }

    await prisma.$transaction(async (tx) => {
      await tx.constructionMilestone.deleteMany({ where: { project_id: project.id } })
      if (milestones.length > 0) {
        await tx.constructionMilestone.createMany({
          data: milestones.map((m, idx) => ({
            project_id: project.id,
            name: m.name.trim(),
            status: m.status as any,
            date_label: m.date_label ? m.date_label.trim() : null,
            sort_order: m.sort_order ?? (idx + 1)
          }))
        })
      }
    })

    const updated = await prisma.constructionMilestone.findMany({
      where: { project_id: project.id },
      orderBy: { sort_order: 'asc' }
    })

    res.json({ ok: true, milestones: updated })
  } catch (err) {
    console.error('[admin] update milestones failed:', err)
    res.status(500).json({ error: 'Failed to save construction milestones' })
  }
})

// GET /api/v1/admin/builders — list builders
router.get('/builders', requireAdmin, async (req: Request, res: Response) => {
  const { limit = '100', offset = '0', q, search } = req.query
  const searchTerm = (q || search) as string | undefined

  try {
    const where: any = {}
    if (searchTerm && typeof searchTerm === 'string') {
      const queryStr = searchTerm.trim()
      where.OR = [
        { name: { contains: queryStr, mode: 'insensitive' } },
        { slug: { contains: queryStr, mode: 'insensitive' } },
      ]
    }

    const [builders, total] = await Promise.all([
      prisma.builder.findMany({
        where,
        include: {
          _count: { select: { projects: true } },
          projects: {
            select: {
              id: true,
              name: true,
              slug: true,
              sector: true,
              city: true,
              status: true,
            },
            orderBy: { name: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.builder.count({ where }),
    ])

    res.json({ builders, total, limit: parseInt(limit as string), offset: parseInt(offset as string) })
  } catch (err) {
    console.error('[admin] builders query failed:', err)
    res.status(500).json({ error: 'Failed to fetch builders' })
  }
})

// POST /api/v1/admin/builders — create builder
router.post('/builders', requireAdmin, async (req: Request, res: Response) => {
  const {
    name,
    slug,
    founded_year,
    headquarters,
    website,
    logo_url,
    credai_member,
    delivered_units,
    rera_compliance_score,
    iso_certified,
    company_overview,
  } = req.body

  if (!name) {
    res.status(400).json({ error: 'name is required' })
    return
  }

  const { randomUUID } = await import('crypto')
  const baseSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
  const generatedSlug = baseSlug + '-' + randomUUID().slice(0, 8)

  try {
    const builder = await prisma.builder.create({
      data: {
        name,
        slug: generatedSlug,
        founded_year: founded_year ? parseInt(founded_year) : null,
        headquarters: headquarters || null,
        website: website || null,
        logo_url: logo_url || null,
        credai_member: credai_member || false,
        delivered_units: delivered_units ? parseInt(delivered_units) : null,
        rera_compliance_score: rera_compliance_score ? parseInt(rera_compliance_score) : null,
        iso_certified: iso_certified || false,
        description: company_overview || null,
      },
      include: {
        _count: { select: { projects: true } },
      },
    })

    res.status(201).json({ builder })
  } catch (err) {
    console.error('[admin] builder create failed:', err)
    res.status(500).json({ error: 'Failed to create builder' })
  }
})

// PATCH /api/v1/admin/builders/:id — update builder
router.patch('/builders/:id', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params
  const updates = req.body

  try {
    const { id: _, created_at: __, _count: ___, projects: ____, ...validFields } = updates

    // Coerce types for numeric fields
    const data: any = { ...validFields }
    if (data.founded_year) data.founded_year = parseInt(data.founded_year)
    if (data.delivered_units) data.delivered_units = parseInt(data.delivered_units)
    if (data.rera_compliance_score) data.rera_compliance_score = parseInt(data.rera_compliance_score)
    if (data.company_overview) { data.description = data.company_overview; delete data.company_overview }

    const builder = await prisma.builder.update({
      where: { id },
      data,
      include: {
        _count: { select: { projects: true } },
      },
    })

    res.json(builder)
  } catch (err) {
    console.error('[admin] builder update failed:', err)
    res.status(500).json({ error: 'Failed to update builder' })
  }
})

// DELETE /api/v1/admin/builders/:id — delete builder
router.delete('/builders/:id', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params
  try {
    // Check if builder has linked projects before deleting
    const projectCount = await prisma.project.count({
      where: { builder_id: id },
    })

    if (projectCount > 0) {
      res.status(409).json({ error: `Cannot delete: ${projectCount} project(s) linked to this builder` })
      return
    }

    await prisma.builder.delete({ where: { id } })
    res.json({ success: true, message: 'Builder deleted successfully' })
  } catch (err) {
    console.error('[admin] builder delete failed:', err)
    res.status(500).json({ error: 'Failed to delete builder' })
  }
})

// GET /api/v1/admin/leads — list callback/lead requests
router.get('/leads', requireAdmin, async (req: Request, res: Response) => {
  const { status, limit = '50', offset = '0' } = req.query
  try {
    const where: any = {}
    if (status && status !== 'all') {
      where.status = status as string
    }

    const [leads, total] = await Promise.all([
      prisma.callbackRequest.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.callbackRequest.count({ where }),
    ])

    res.json({ leads, total })
  } catch (err) {
    // Do not swallow: an empty list here is indistinguishable from a broken query,
    // which is exactly how the missing lead columns stayed hidden.
    console.error('[admin] leads query failed:', err)
    res.status(500).json({ error: 'Failed to fetch leads' })
  }
})

// PATCH /api/v1/admin/leads/:id — update lead
router.patch('/leads/:id', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params
  const { status, lead_tier } = req.body

  try {
    const lead = await prisma.callbackRequest.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(lead_tier && { lead_tier }),
      },
    })

    res.json(lead)
  } catch (err) {
    console.error('[admin] lead update failed:', err)
    res.status(500).json({ error: 'Failed to update lead' })
  }
})

// GET /api/v1/admin/news — list builder news
router.get('/news', requireAdmin, async (req: Request, res: Response) => {
  const { limit = '50', offset = '0', status } = req.query

  try {
    const where: any = { archived_at: null }
    if (status && status !== 'all') {
      where.status = status as string
    }

    const [news, total] = await Promise.all([
      prisma.builderNews.findMany({
        where,
        include: { builder: { select: { id: true, name: true, slug: true } } },
        orderBy: { created_at: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.builderNews.count({ where }),
    ])

    res.json({ news, total, limit: parseInt(limit as string), offset: parseInt(offset as string) })
  } catch (err) {
    console.error('[admin] news query failed:', err)
    res.status(500).json({ error: 'Failed to fetch news' })
  }
})

// DELETE /api/v1/admin/news/:id — archive (soft delete; reversible)
router.delete('/news/:id', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params
  try {
    await prisma.builderNews.update({
      where: { id },
      data: { archived_at: new Date() },
    })
    res.json({ success: true, message: 'News archived' })
  } catch (err) {
    console.error('[admin] news archive failed:', err)
    res.status(500).json({ error: 'Failed to archive news' })
  }
})

// POST /api/v1/admin/news — create news
router.post('/news', requireAdmin, async (req: Request, res: Response) => {
  const { builder_id, title, description, image_url, link_type, link_target, status } = req.body
  try {
    if (!builder_id || !title || !description) {
      return res.status(400).json({ error: 'Missing required fields: builder_id, title, description' })
    }
    const news = await prisma.builderNews.create({
      data: {
        builder_id,
        title,
        description,
        image_url,
        link_type,
        link_target,
        status: status || 'draft',
      },
      include: { builder: { select: { id: true, name: true, slug: true } } },
    })
    res.status(201).json(news)
  } catch (err) {
    console.error('[admin] news create failed:', err)
    res.status(500).json({ error: 'Failed to create news' })
  }
})

// PATCH /api/v1/admin/news/:id — update news
router.patch('/news/:id', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params
  const { title, description, image_url, link_type, link_target, status, approved_by, approval_notes, published_at, run_as_promo, promo_id } = req.body
  try {
    const data: any = {}
    if (title !== undefined) data.title = title
    if (description !== undefined) data.description = description
    if (image_url !== undefined) data.image_url = image_url
    if (link_type !== undefined) data.link_type = link_type
    if (link_target !== undefined) data.link_target = link_target
    if (status !== undefined) data.status = status
    if (approved_by !== undefined) data.approved_by = approved_by
    if (approval_notes !== undefined) data.approval_notes = approval_notes
    if (published_at !== undefined) data.published_at = published_at ? new Date(published_at) : null
    if (run_as_promo !== undefined) data.run_as_promo = run_as_promo
    if (promo_id !== undefined) data.promo_id = promo_id

    const news = await prisma.builderNews.update({
      where: { id },
      data,
      include: { builder: { select: { id: true, name: true, slug: true } } },
    })
    res.json(news)
  } catch (err) {
    console.error('[admin] news update failed:', err)
    res.status(500).json({ error: 'Failed to update news' })
  }
})

// GET /api/v1/admin/analytics/summary — system analytics
router.get('/analytics/summary', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const [totalChats, totalQueries, zeroResultSearches, totalCallbacks, totalProjects, totalBuilders] = await Promise.all([
      prisma.chatSession.count(),
      prisma.queryMetrics.count(),
      prisma.queryMetrics.count({ where: { had_results: false } }),
      prisma.callbackRequest.count(),
      prisma.project.count(),
      prisma.builder.count(),
    ])

    const avgQueriesPerChat = totalChats > 0 ? (totalQueries / totalChats).toFixed(1) : '0.0'
    const zeroResultSearchRate = totalQueries > 0 ? `${((zeroResultSearches / totalQueries) * 100).toFixed(1)}%` : '0.0%'
    const effectiveConversions = Math.min(totalCallbacks, totalChats)
    const conversionRate = totalChats > 0 ? `${((effectiveConversions / totalChats) * 100).toFixed(1)}%` : totalCallbacks > 0 ? '100.0%' : '0.0%'

    const avgClarificationsAgg = await prisma.queryMetrics.aggregate({
      _avg: { clarification_count: true },
    })
    const avgClarifications = (avgClarificationsAgg._avg.clarification_count || 0).toFixed(1)

    // Top Searched Sectors: Query Metrics first, fallback to Project table sectors
    const sectorGroups = await prisma.queryMetrics.groupBy({
      by: ['sector'],
      _count: { sector: true },
      where: { sector: { not: null } },
      orderBy: { _count: { sector: 'desc' } },
      take: 10,
    })

    let topSectors = sectorGroups.map(g => ({ sector: g.sector || 'Unknown', count: g._count.sector }))

    if (topSectors.length === 0) {
      const projSectors = await prisma.project.findMany({
        select: { sector: true },
      })
      const counts: Record<string, number> = {}
      for (const p of projSectors) {
        if (p.sector) {
          counts[p.sector] = (counts[p.sector] || 0) + 1
        }
      }
      topSectors = Object.entries(counts)
        .map(([sector, count]) => ({ sector, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
    }

    // Top Searched Builders: Query Metrics first, fallback to Builder table
    const builderGroups = await prisma.queryMetrics.groupBy({
      by: ['builder'],
      _count: { builder: true },
      where: { builder: { not: null } },
      orderBy: { _count: { builder: 'desc' } },
      take: 10,
    })

    let topBuilders = builderGroups.map(g => ({ builder: g.builder || 'Unknown', count: g._count.builder }))

    if (topBuilders.length === 0) {
      const builders = await prisma.builder.findMany({
        take: 10,
        select: { name: true, projects: { select: { id: true } } },
        orderBy: { name: 'asc' },
      })
      topBuilders = builders
        .map(b => ({ builder: b.name, count: b.projects.length }))
        .filter(b => b.count > 0)
        .sort((a, b) => b.count - a.count)
    }

    res.json({
      totalChats,
      totalQueries,
      avgQueriesPerChat,
      zeroResultSearches,
      zeroResultSearchRate,
      conversionRate,
      avgClarifications,
      topSectors,
      topBuilders,
      summary: {
        totalProjects,
        totalBuilders,
        totalCallbacks,
        totalUsers: totalChats,
      }
    })
  } catch (err) {
    console.error('[admin] analytics summary failed:', err)
    res.status(500).json({ error: 'Failed to fetch analytics summary' })
  }
})

// GET /api/v1/admin/analytics/quality — data health score
router.get('/analytics/quality', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const [totalSearches, zeroResultSearches, searchWithResults, totalProjects, withImage, withRera] = await Promise.all([
      prisma.queryMetrics.count(),
      prisma.queryMetrics.count({ where: { had_results: false } }),
      prisma.queryMetrics.count({ where: { had_results: true } }),
      prisma.project.count(),
      prisma.project.count({ where: { hero_image_url: { not: null } } }),
      prisma.project.count({ where: { rera_number: { not: null } } }),
    ])

    const searchWithoutResults = zeroResultSearches
    const zeroResultRate = totalSearches > 0 ? `${((zeroResultSearches / totalSearches) * 100).toFixed(1)}%` : '0.0%'
    const completenessScore = totalProjects > 0 ? Math.round(((withImage + withRera) / (totalProjects * 2)) * 100) : 100

    const aggregates = await prisma.queryMetrics.aggregate({
      _avg: { clarification_count: true, results_count: true },
    })
    const avgClarifications = aggregates._avg.clarification_count ? Math.round(aggregates._avg.clarification_count * 10) / 10 : 0
    const avgResultsCount = aggregates._avg.results_count ? Math.round(aggregates._avg.results_count * 10) / 10 : 0

    res.json({
      totalSearches,
      zeroResultSearches,
      zeroResultRate,
      searchWithResults,
      searchWithoutResults,
      avgClarifications,
      avgResultsCount,
      quality: {
        totalProjects,
        withImage,
        withRera,
        completenessScore,
      }
    })
  } catch (err) {
    console.error('[admin] analytics quality failed:', err)
    res.status(500).json({ error: 'Failed to fetch analytics quality' })
  }
})

// GET /api/v1/admin/analytics/users — user stats
router.get('/analytics/users', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const [totalChats, totalQueries, totalClicks, totalSaves, totalConversions] = await Promise.all([
      prisma.chatSession.count(),
      prisma.queryMetrics.count(),
      prisma.propertyEvent.count({ where: { action: { in: ['click', 'view'] } } }),
      prisma.propertyEvent.count({ where: { action: 'save' } }),
      prisma.callbackRequest.count(),
    ])

    const uniqueUsersAgg = await prisma.chatSession.groupBy({
      by: ['user_id'],
      where: { user_id: { not: null } },
    })
    const totalUsers = Math.max(uniqueUsersAgg.length, totalChats > 0 ? 1 : 0)
    const repeatedVisitors = Math.max(0, totalChats - totalUsers)
    const avgQueriesPerUser = totalUsers > 0 ? parseFloat((totalQueries / totalUsers).toFixed(1)) : 0
    // Compute real dynamic avg session duration from DB (created_at vs last_active)
    const sessionsForDuration = await prisma.chatSession.findMany({
      take: 100,
      select: { created_at: true, last_active: true },
    })
    let totalDurationSeconds = 0
    let validDurationCount = 0
    for (const s of sessionsForDuration) {
      const dur = (new Date(s.last_active).getTime() - new Date(s.created_at).getTime()) / 1000
      if (dur > 0) {
        totalDurationSeconds += dur
        validDurationCount++
      }
    }
    const avgSessionDuration = validDurationCount > 0 ? Math.round(totalDurationSeconds / validDurationCount) : 0

    // Dynamic list of active user chat sessions from DB
    const recentSessions = await prisma.chatSession.findMany({
      take: 25,
      orderBy: { last_active: 'desc' },
      select: {
        id: true,
        user_id: true,
        guest_token: true,
        title: true,
        message_count: true,
        created_at: true,
        last_active: true,
        chat_phase: true,
        _count: { select: { query_metrics: true } },
      },
    })

    const activeUserList = recentSessions.map((s) => ({
      id: s.id,
      userLabel: s.user_id ? `User #${s.user_id.slice(0, 6)}` : s.guest_token ? `Guest #${s.guest_token.slice(0, 6)}` : 'Anonymous',
      title: s.title || 'Discovery Session',
      messageCount: s.message_count,
      queriesCount: s._count.query_metrics,
      phase: s.chat_phase,
      lastActive: s.last_active,
    }))

    // Most Searched Sectors: Query metrics first, fallback to Project sectors
    const sectorGroups = await prisma.queryMetrics.groupBy({
      by: ['sector'],
      _count: { sector: true },
      where: { sector: { not: null } },
      orderBy: { _count: { sector: 'desc' } },
      take: 5,
    })

    let mostActiveSectors = sectorGroups.map(g => ({ sector: g.sector || 'Unknown', searches: g._count.sector }))

    if (mostActiveSectors.length === 0) {
      const projSectors = await prisma.project.findMany({
        select: { sector: true },
      })
      const counts: Record<string, number> = {}
      for (const p of projSectors) {
        if (p.sector) {
          counts[p.sector] = (counts[p.sector] || 0) + 1
        }
      }
      mostActiveSectors = Object.entries(counts)
        .map(([sector, searches]) => ({ sector, searches }))
        .sort((a, b) => b.searches - a.searches)
        .slice(0, 5)
    }

    res.json({
      totalUsers,
      repeatedVisitors,
      totalConversions,
      avgSessionDuration,
      avgQueriesPerUser,
      conversionFunnel: {
        chats: totalChats,
        searches: totalQueries,
        clicks: totalClicks,
        saves: totalSaves,
        conversions: totalChats > 0 ? Math.min(totalConversions, totalChats) : totalConversions,
      },
      mostActiveSectors,
      users: activeUserList,
    })
  } catch (err) {
    console.error('[admin] analytics users failed:', err)
    res.status(500).json({ error: 'Failed to fetch users analytics' })
  }
})

// GET /api/v1/admin/analytics/properties — properties analytics
router.get('/analytics/properties', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const projects = await prisma.project.findMany({
      take: 50,
      select: { id: true, name: true, slug: true, status: true, sector: true, price_range_label: true },
      orderBy: { name: 'asc' },
    })

    const events = await (prisma.propertyEvent as any).groupBy({
      by: ['project_id', 'action'],
      _count: { action: true },
      orderBy: { _count: { action: 'desc' } },
      take: 1000,
    })

    const eventMap: Record<string, Record<string, number>> = {}
    for (const ev of events) {
      if (!eventMap[ev.project_id]) eventMap[ev.project_id] = {}
      eventMap[ev.project_id][ev.action] = ev._count.action
    }

    const propertyEngagements = projects
      .map((p) => {
        const pEvents = eventMap[p.id] || {}
        const views = pEvents['view'] || 0
        const saves = pEvents['save'] || 0
        const comparisons = pEvents['compare'] || 0
        const shares = pEvents['share'] || 0
        const whatsappInquiries = pEvents['whatsapp'] || 0
        const total = views + saves + comparisons + shares + whatsappInquiries
        return {
          projectId: p.id,
          projectName: p.name,
          views,
          saves,
          comparisons,
          shares,
          whatsappInquiries,
          total,
          slug: p.slug,
          sector: p.sector,
        }
      })
      .sort((a, b) => b.total - a.total)

    res.json({ properties: propertyEngagements, total: projects.length })
  } catch (err) {
    console.error('[admin] analytics properties failed:', err)
    res.status(500).json({ error: 'Failed to fetch properties analytics' })
  }
})

// GET /api/v1/admin/sector-tiers — Phase 5: Compute and show sector tiers
router.get('/sector-tiers', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { city = 'Noida' } = req.query
    const { computeSectorTier } = await import('../lib/discovery/sectorTiers')

    const sectorIntelligence: any[] = (await (prisma as any).sectorIntelligence?.findMany({
      where: { city: city as string },
    })) || []

    const tiers = sectorIntelligence.map((si: any) =>
      computeSectorTier({
        city: si.city,
        sector: si.sector,
        sector_stage: si.sector_stage,
        avg_price_per_sqft: si.avg_price_per_sqft,
        price_5yr_cagr_pct: si.price_5yr_cagr_pct,
      })
    )

    // Group by tier
    const grouped: Record<string, any[]> = { tier1: [], tier2: [], tier3: [] }
    for (const tier of tiers) {
      grouped[tier.tier].push(tier)
    }

    res.json({
      city,
      tier1: grouped.tier1,
      tier2: grouped.tier2,
      tier3: grouped.tier3,
      total: tiers.length,
    })
  } catch (err) {
    console.error('[admin] sector-tiers failed:', err)
    res.status(500).json({ error: 'Failed to compute sector tiers' })
  }
})

// GET /api/v1/admin/channel-partners — List all available master channel partners
router.get('/channel-partners', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const partners = await (prisma as any).channelPartner.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
    })
    res.json({ partners, channel_partners: partners })
  } catch (err) {
    console.error('[admin] fetch channel-partners failed:', err)
    res.status(500).json({ error: 'Failed to fetch channel partners' })
  }
})

// GET /api/v1/admin/projects/:id/channel-partners — Fetch project's linked partners
router.get('/projects/:id/channel-partners', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const partners = await (prisma as any).projectChannelPartner.findMany({
      where: { project_id: id },
      include: { channel_partner: true },
    })
    res.json({ channel_partners: partners })
  } catch (err) {
    console.error('[admin] fetch project channel-partners failed:', err)
    res.status(500).json({ error: 'Failed to fetch project channel partners' })
  }
})

// PUT /api/v1/admin/projects/:id/channel-partners — Save project's channel partners
router.put('/projects/:id/channel-partners', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { channel_partners } = req.body
    await (prisma as any).projectChannelPartner.deleteMany({ where: { project_id: id } })
    if (Array.isArray(channel_partners) && channel_partners.length > 0) {
      await (prisma as any).projectChannelPartner.createMany({
        data: channel_partners.map((p: any) => ({
          project_id: id,
          channel_partner_id: p.channel_partner_id,
          is_featured: p.is_featured ?? true,
        })),
      })
    }
    const updated = await (prisma as any).projectChannelPartner.findMany({
      where: { project_id: id },
      include: { channel_partner: true },
    })
    res.json({ ok: true, channel_partners: updated })
  } catch (err) {
    console.error('[admin] save project channel-partners failed:', err)
    res.status(500).json({ error: 'Failed to save project channel partners' })
  }
})

// GET /api/v1/admin/projects/:id/updates — Fetch project updates
router.get('/projects/:id/updates', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const updates = await (prisma as any).constructionUpdate.findMany({
      where: { project_id: id },
      orderBy: { update_date: 'desc' },
    })
    res.json({ updates })
  } catch (err) {
    console.error('[admin] fetch updates failed:', err)
    res.status(500).json({ error: 'Failed to fetch updates' })
  }
})

// PUT /api/v1/admin/projects/:id/updates — Save project updates
router.put('/projects/:id/updates', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { updates } = req.body
    await (prisma as any).constructionUpdate.deleteMany({ where: { project_id: id } })
    if (Array.isArray(updates) && updates.length > 0) {
      await (prisma as any).constructionUpdate.createMany({
        data: updates.map((u: any) => ({
          project_id: id,
          title: u.name || 'Site Update',
          description: u.name,
          quarter_label: u.date_label || null,
          update_date: new Date(),
        })),
      })
    }
    res.json({ success: true })
  } catch (err) {
    console.error('[admin] save updates failed:', err)
    res.status(500).json({ error: 'Failed to save updates' })
  }
})

// PATCH /api/v1/admin/projects/:id/dna — save/update project DNA profile
router.patch('/projects/:id/dna', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params
  const data = req.body

  try {
    const project = await prisma.project.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      select: { id: true }
    })
    if (!project) {
      res.status(404).json({ error: 'Project not found' })
      return
    }

    const updated = await (prisma as any).projectDna.upsert({
      where: { project_id: project.id },
      update: { ...data, updated_at: new Date() },
      create: { project_id: project.id, ...data }
    })
    res.json({ success: true, data: updated })
  } catch (err) {
    console.error('[admin] save DNA failed:', err)
    res.status(500).json({ error: 'Failed to save DNA profile' })
  }
})

// PATCH /api/v1/admin/projects/:id/decision-profile — save/update decision profile
router.patch('/projects/:id/decision-profile', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params
  const data = req.body

  try {
    const project = await prisma.project.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      select: { id: true }
    })
    if (!project) {
      res.status(404).json({ error: 'Project not found' })
      return
    }

    const updated = await (prisma as any).decisionProfile.upsert({
      where: { project_id: project.id },
      update: { ...data, updated_at: new Date() },
      create: { project_id: project.id, ...data }
    })
    res.json({ success: true, data: updated })
  } catch (err) {
    console.error('[admin] save decision profile failed:', err)
    res.status(500).json({ error: 'Failed to save decision profile' })
  }
})

// PATCH /api/v1/admin/projects/:id/persona-profile — save/update persona profile
router.patch('/projects/:id/persona-profile', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params
  const data = req.body

  try {
    const project = await prisma.project.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      select: { id: true }
    })
    if (!project) {
      res.status(404).json({ error: 'Project not found' })
      return
    }

    const updated = await (prisma as any).personaProfile.upsert({
      where: { project_id: project.id },
      update: { ...data, updated_at: new Date() },
      create: { project_id: project.id, ...data }
    })
    res.json({ success: true, data: updated })
  } catch (err) {
    console.error('[admin] save persona profile failed:', err)
    res.status(500).json({ error: 'Failed to save persona profile' })
  }
})

// PATCH /api/v1/admin/projects/:id/recommendation-profile — save/update recommendation profile
router.patch('/projects/:id/recommendation-profile', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params
  const data = req.body

  try {
    const project = await prisma.project.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      select: { id: true }
    })
    if (!project) {
      res.status(404).json({ error: 'Project not found' })
      return
    }

    const updated = await (prisma as any).recommendationProfile.upsert({
      where: { project_id: project.id },
      update: { ...data, updated_at: new Date() },
      create: { project_id: project.id, ...data }
    })
    res.json({ success: true, data: updated })
  } catch (err) {
    console.error('[admin] save recommendation profile failed:', err)
    res.status(500).json({ error: 'Failed to save recommendation profile' })
  }
})

// PUT /api/v1/admin/projects/:id/cost-sheet — Upsert full cost sheet
router.put('/projects/:id/cost-sheet', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params
  const data = req.body
  try {
    const project = await prisma.project.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      select: { id: true }
    })
    if (!project) return res.status(404).json({ error: 'Project not found' })

    const updated = await (prisma as any).costSheet.upsert({
      where: { project_id: project.id },
      update: { ...data, updated_at: new Date() },
      create: { project_id: project.id, ...data }
    })
    res.json({ success: true, data: updated })
  } catch (err) {
    console.error('[admin] save cost sheet failed:', err)
    res.status(500).json({ error: 'Failed to save cost sheet' })
  }
})

// GET & PUT /api/v1/admin/projects/:id/payment-plans — Multi payment plan management
router.get('/projects/:id/payment-plans', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params
  try {
    const project = await prisma.project.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      select: { id: true }
    })
    if (!project) return res.status(404).json({ error: 'Project not found' })

    const plans = await (prisma as any).paymentPlan.findMany({
      where: { project_id: project.id },
      orderBy: { created_at: 'asc' }
    })
    res.json({ payment_plans: plans })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payment plans' })
  }
})

router.put('/projects/:id/payment-plans', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params
  const { payment_plans } = req.body
  try {
    const project = await prisma.project.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      select: { id: true }
    })
    if (!project) return res.status(404).json({ error: 'Project not found' })

    if (Array.isArray(payment_plans)) {
      for (const p of payment_plans) {
        if (!p.plan_type) continue
        await (prisma as any).paymentPlan.upsert({
          where: { project_id_plan_type: { project_id: project.id, plan_type: p.plan_type } },
          update: { ...p, updated_at: new Date() },
          create: { project_id: project.id, ...p }
        })
      }
    }
    const updated = await (prisma as any).paymentPlan.findMany({ where: { project_id: project.id } })
    res.json({ success: true, payment_plans: updated })
  } catch (err) {
    console.error('[admin] save payment plans failed:', err)
    res.status(500).json({ error: 'Failed to save payment plans' })
  }
})

// Legacy single-plan PUT route compatibility
router.put('/projects/:id/payment-plan', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params
  const data = req.body
  try {
    const project = await prisma.project.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      select: { id: true }
    })
    if (!project) return res.status(404).json({ error: 'Project not found' })

    const planType = data.plan_type || 'construction_linked'
    const updated = await (prisma as any).paymentPlan.upsert({
      where: { project_id_plan_type: { project_id: project.id, plan_type: planType } },
      update: { ...data, updated_at: new Date() },
      create: { project_id: project.id, plan_type: planType, ...data }
    })
    res.json({ success: true, payment_plan: updated })
  } catch (err) {
    console.error('[admin] save payment plan failed:', err)
    res.status(500).json({ error: 'Failed to save payment plan' })
  }
})

// GET & PUT /api/v1/admin/projects/:id/lifecycle-updates — Delivered project updates
router.get('/projects/:id/lifecycle-updates', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params
  try {
    const project = await prisma.project.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      select: { id: true }
    })
    if (!project) return res.status(404).json({ error: 'Project not found' })

    const updates = await (prisma as any).projectLifecycleUpdate.findMany({
      where: { project_id: project.id },
      orderBy: { update_date: 'desc' }
    })
    res.json({ updates })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch lifecycle updates' })
  }
})

router.put('/projects/:id/lifecycle-updates', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params
  const { updates } = req.body
  try {
    const project = await prisma.project.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      select: { id: true }
    })
    if (!project) return res.status(404).json({ error: 'Project not found' })

    await (prisma as any).projectLifecycleUpdate.deleteMany({ where: { project_id: project.id } })
    if (Array.isArray(updates) && updates.length > 0) {
      await (prisma as any).projectLifecycleUpdate.createMany({
        data: updates.map((u: any) => ({
          project_id: project.id,
          update_type: u.update_type || 'possession_status_change',
          title: u.title || 'Society Update',
          description: u.description || '',
          update_date: u.update_date ? new Date(u.update_date) : new Date(),
          impact: u.impact || null,
          source: u.source || 'Admin Verification',
          verified_by: u.verified_by || 'PropFyndr Data Desk',
          maintenance_fee_monthly_psf: u.maintenance_fee_monthly_psf ? parseFloat(u.maintenance_fee_monthly_psf) : null,
          note: u.note || null
        }))
      })
    }
    const fresh = await (prisma as any).projectLifecycleUpdate.findMany({ where: { project_id: project.id } })
    res.json({ success: true, updates: fresh })
  } catch (err) {
    console.error('[admin] save lifecycle updates failed:', err)
    res.status(500).json({ error: 'Failed to save lifecycle updates' })
  }
})

// GET & PUT /api/v1/admin/projects/:id/price-history — Price history snapshots
router.get('/projects/:id/price-history', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params
  try {
    const project = await prisma.project.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      select: { id: true }
    })
    if (!project) return res.status(404).json({ error: 'Project not found' })

    const history = await (prisma as any).priceHistory.findMany({
      where: { project_id: project.id },
      orderBy: { recorded_at: 'asc' }
    })
    res.json({ price_history: history })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch price history' })
  }
})

router.put('/projects/:id/price-history', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params
  const { price_history } = req.body
  try {
    const project = await prisma.project.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      select: { id: true }
    })
    if (!project) return res.status(404).json({ error: 'Project not found' })

    await (prisma as any).priceHistory.deleteMany({ where: { project_id: project.id } })
    if (Array.isArray(price_history) && price_history.length > 0) {
      await (prisma as any).priceHistory.createMany({
        data: price_history.map((ph: any) => ({
          project_id: project.id,
          quarter_label: ph.quarter_label || 'Q1 2025',
          price_per_sqft: ph.price_per_sqft ? parseFloat(ph.price_per_sqft) : null,
          total_price_cr: ph.total_price_cr ? parseFloat(ph.total_price_cr) : null,
          event_note: ph.event_note || null,
          source: 'admin_update'
        }))
      })
    }
    const fresh = await (prisma as any).priceHistory.findMany({ where: { project_id: project.id } })
    res.json({ success: true, price_history: fresh })
  } catch (err) {
    console.error('[admin] save price history failed:', err)
    res.status(500).json({ error: 'Failed to save price history' })
  }
})

// POST /api/v1/admin/projects/:id/units — Add unit type
router.post('/projects/:id/units', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params
  const data = req.body
  try {
    const project = await prisma.project.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      select: { id: true }
    })
    if (!project) return res.status(404).json({ error: 'Project not found' })

    const unit = await (prisma as any).unitType.create({
      data: {
        project_id: project.id,
        name: data.name || `${data.bhk || 2} BHK Unit`,
        bhk: data.bhk ? parseInt(data.bhk) : 2,
        super_area_sqft: data.super_area_sqft ? parseInt(data.super_area_sqft) : null,
        carpet_area_sqft: data.carpet_area_sqft ? parseInt(data.carpet_area_sqft) : null,
        balconies: data.balconies ? parseInt(data.balconies) : null,
        balcony_area_sqft: data.balcony_area_sqft ? parseInt(data.balcony_area_sqft) : null,
        bathrooms: data.bathrooms ? parseInt(data.bathrooms) : null,
        price_min_cr: data.price_min_cr ? parseFloat(data.price_min_cr) : null,
        price_max_cr: data.price_max_cr ? parseFloat(data.price_max_cr) : null,
        price_label: data.price_label || null,
        price_is_estimated: data.price_is_estimated ?? true,
        views: data.views || []
      }
    })
    res.json({ success: true, unit })
  } catch (err) {
    console.error('[admin] add unit failed:', err)
    res.status(500).json({ error: 'Failed to add unit type' })
  }
})

// PATCH /api/v1/admin/units/:id — Update unit type
router.patch('/units/:id', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params
  const data = req.body
  try {
    const unit = await (prisma as any).unitType.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.bhk !== undefined && { bhk: parseInt(data.bhk) }),
        ...(data.super_area_sqft !== undefined && { super_area_sqft: data.super_area_sqft ? parseInt(data.super_area_sqft) : null }),
        ...(data.carpet_area_sqft !== undefined && { carpet_area_sqft: data.carpet_area_sqft ? parseInt(data.carpet_area_sqft) : null }),
        ...(data.balconies !== undefined && { balconies: data.balconies ? parseInt(data.balconies) : null }),
        ...(data.balcony_area_sqft !== undefined && { balcony_area_sqft: data.balcony_area_sqft ? parseInt(data.balcony_area_sqft) : null }),
        ...(data.bathrooms !== undefined && { bathrooms: data.bathrooms ? parseInt(data.bathrooms) : null }),
        ...(data.price_min_cr !== undefined && { price_min_cr: data.price_min_cr ? parseFloat(data.price_min_cr) : null }),
        ...(data.price_max_cr !== undefined && { price_max_cr: data.price_max_cr ? parseFloat(data.price_max_cr) : null }),
        ...(data.price_label !== undefined && { price_label: data.price_label }),
        ...(data.layout_variant_name !== undefined && { layout_variant_name: data.layout_variant_name }),
        ...(data.towers !== undefined && { towers: data.towers, tower_association: data.towers }),
        ...(data.views !== undefined && { views: data.views })
      }
    })
    res.json({ success: true, unit })
  } catch (err) {
    console.error('[admin] update unit failed:', err)
    res.status(500).json({ error: 'Failed to update unit type' })
  }
})

// DELETE /api/v1/admin/units/:id — Delete unit type
router.delete('/units/:id', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params
  try {
    await (prisma as any).unitType.delete({ where: { id } })
    res.json({ success: true })
  } catch (err) {
    console.error('[admin] delete unit failed:', err)
    res.status(500).json({ error: 'Failed to delete unit type' })
  }
})

export default router
