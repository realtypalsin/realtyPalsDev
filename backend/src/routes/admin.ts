import { Router, Request, Response } from 'express'
import { prisma } from '../lib/db'
import { verifyUser } from '../lib/auth'

const router = Router()

// Admin-only middleware: verify user is an admin
async function requireAdmin(req: Request, res: Response, next: Function) {
  const userId = await verifyUser(req)
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return }

  // For MVP: hardcode admin user ID (replace with DB role check in production)
  const ADMIN_USER_ID = process.env.ADMIN_USER_ID
  if (userId !== ADMIN_USER_ID) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  next()
}

// GET /api/v1/admin/callbacks — list all callbacks with filters
router.get('/callbacks', requireAdmin, async (req: Request, res: Response) => {
  const { limit = '50', offset = '0', tier, sort = 'created_desc' } = req.query

  try {
    const where: any = {}
    if (tier && tier !== 'all') {
      where.lead_tier = tier
    }

    const [callbacks, total] = await Promise.all([
      prisma.callbackRequest.findMany({
        where,
        orderBy: sort === 'score_desc' ? { lead_score: 'desc' } : { created_at: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
        select: {
          id: true,
          name: true,
          phone: true,
          project_name: true,
          intent_tier: true,
          loan_pre_approved: true,
          lead_score: true,
          lead_tier: true,
          ai_summary: true,
          consent_given: true,
          created_at: true,
          projects_saved: true,
          projects_viewed: true,
          budget_min_cr: true,
          budget_max_cr: true,
        },
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
      include: {
        project: {
          select: { id: true, name: true, slug: true, sector: { select: { name: true } }, price_range_label: true },
        },
      },
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
    const [totalCallbacks, hotLeads, warmLeads, coldLeads, avgScore] = await Promise.all([
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
      avgScore: avgScore._avg?.lead_score ?? 0,
    })
  } catch (err) {
    console.error('[admin] stats failed:', err)
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

export default router
