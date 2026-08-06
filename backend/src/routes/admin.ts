import { Router, Request, Response } from 'express'
import { timingSafeEqual } from 'crypto'
import { prisma } from '../lib/db'
import { createAdminSession, requireAdmin, destroyAdminSession } from '../lib/adminAuth'
import { computeCompleteness } from '../lib/completeness'

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

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown'
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

  try {
    const where: any = {}
    if (searchTerm && typeof searchTerm === 'string' && searchTerm.trim() !== '_check') {
      const queryStr = searchTerm.trim()
      where.OR = [
        { name: { contains: queryStr, mode: 'insensitive' } },
        { slug: { contains: queryStr, mode: 'insensitive' } },
        { sector: { contains: queryStr, mode: 'insensitive' } },
        { builder: { name: { contains: queryStr, mode: 'insensitive' } } },
      ]
    }

    const [projects, total] = await Promise.all([
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
        decision_profile: true,
        persona_profile: true,
        payment_plans: { orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }] },
        cost_sheet: true,
      },
    })

    if (!project) {
      res.status(404).json({ error: 'Project not found' })
      return
    }

    const safeProject = {
      ...project,
      unit_types: project.unit_types ?? [],
      images: project.images ?? [],
      payment_plans: project.payment_plans ?? [],
      // Primary plan — the admin editor edits one plan at a time.
      payment_plan: project.payment_plans?.[0] ?? null,
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

// DELETE /api/v1/admin/projects/:id — delete project
router.delete('/projects/:id', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params
  try {
    await prisma.project.delete({ where: { id } })
    res.json({ success: true, message: 'Project deleted successfully' })
  } catch (err) {
    console.error('[admin] project delete failed:', err)
    res.status(500).json({ error: 'Failed to delete project' })
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
  const { name, slug, founded_year, headquarters, website, logo_url } = req.body

  if (!name) {
    res.status(400).json({ error: 'name is required' })
    return
  }

  const generatedSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')

  try {
    const builder = await prisma.builder.create({
      data: {
        name,
        slug: generatedSlug,
        founded_year: founded_year ? parseInt(founded_year) : null,
        headquarters: headquarters || null,
        logo_url: logo_url || null,
      },
      include: {
        _count: { select: { projects: true } },
      },
    })

    res.status(201).json({ builder, ...builder })
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

    const builder = await prisma.builder.update({
      where: { id },
      data: validFields,
      include: {
        _count: { select: { projects: true } },
      },
    })

    res.json({ builder, ...builder })
  } catch (err) {
    console.error('[admin] builder update failed:', err)
    res.status(500).json({ error: 'Failed to update builder' })
  }
})

// DELETE /api/v1/admin/builders/:id — delete builder
router.delete('/builders/:id', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params
  try {
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

    const events = await prisma.propertyEvent.groupBy({
      by: ['project_id', 'action'],
      _count: { action: true },
    })

    const eventMap: Record<string, Record<string, number>> = {}
    for (const ev of events) {
      if (!eventMap[ev.project_id]) eventMap[ev.project_id] = {}
      eventMap[ev.project_id][ev.action] = ev._count.action
    }

    const propertyEngagements = projects.map((p) => {
      const pEvents = eventMap[p.id] || {}
      return {
        projectId: p.id,
        projectName: p.name,
        views: pEvents['view'] || 0,
        saves: pEvents['save'] || 0,
        comparisons: pEvents['compare'] || 0,
        shares: pEvents['share'] || 0,
        whatsappInquiries: pEvents['whatsapp'] || 0,
        slug: p.slug,
        sector: p.sector,
      }
    })

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

    const sectorIntelligence = await prisma.sectorIntelligence.findMany({
      where: { city: city as string },
    })

    const tiers = sectorIntelligence.map((si) =>
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

export default router
