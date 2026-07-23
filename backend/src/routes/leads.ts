import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { timingSafeEqual } from 'crypto'
import { prisma } from '../lib/db'
import { verifyUser } from '../lib/auth'
import { trackConversion } from '../lib/analytics/tracking'
import { env } from '../lib/env'
import { notifyLead } from '../lib/notify'
import { checkRateLimit } from '../lib/cache'
import { loadLeadProfile, scoreLead } from '../lib/leadProfile'

const router = Router()

// GET /count — must be registered BEFORE any /:id route to avoid param collision.
router.get('/count', async (req: Request, res: Response) => {
  const userId = await verifyUser(req)
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return }

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const count = await prisma.siteVisitRequest.count({
    where: { created_at: { gte: startOfDay } },
  })
  res.json({ count })
})

const CallbackSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(10),
  projectName: z.string().optional(),
  project_name: z.string().optional(), // frontend sends snake_case
  projectSlug: z.string().optional(),
  project_slug: z.string().optional(), // frontend sends snake_case
  session_id: z.string().optional(),
  guestToken: z.string().optional(),
  intent_tier: z.enum(['immediate', '1-3-months', 'exploring']).optional(),
  loan_status: z.enum(['pre_approved', 'need_help', 'cash']).optional(),
  consent_given: z.boolean().default(false),
})

const SiteVisitSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(10),
  projectSlug: z.string().min(1),
  projectName: z.string(),
  visitDate: z.string(),
  timeSlot: z.string(),
  guestToken: z.string().optional(),
})

router.post('/callback', async (req: Request, res: Response) => {
  // Callbacks work for anonymous users (guestToken) OR authenticated users
  const userId = (await verifyUser(req)) ?? undefined
  const guestToken = (req.body as any).guestToken

  // Rate limit by userId if authenticated, otherwise by guestToken or IP
  const rateLimitKey = userId ? `callback:${userId}` : guestToken ? `callback:guest:${guestToken}` : `callback:ip:${req.ip}`
  const rl = await checkRateLimit(rateLimitKey, 5, 3600)
  if (rl.remaining <= 0) { res.status(429).json({ error: 'Too many requests' }); return }
  const parsed = CallbackSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.errors })
    return
  }

  const { name, phone, projectName, project_name, projectSlug, project_slug, session_id, intent_tier, loan_status } = parsed.data

  // Support both camelCase and snake_case from frontend
  const finalProjectName = projectName || project_name
  const finalProjectSlug = projectSlug || project_slug

  // Get project and builder info for analytics
  const project = finalProjectSlug ? await prisma.project.findUnique({
    where: { slug: finalProjectSlug },
    select: { id: true, builder_id: true }
  }) : null

  const cb = await prisma.callbackRequest.create({
    data: { name, phone, project_name: finalProjectName, project_slug: finalProjectSlug, user_id: userId, guest_token: guestToken },
  })

  // Load buyer profile once, reuse for both BuilderLead and webhook enrichment
  const profile = await loadLeadProfile(userId, guestToken)

  // ─── ANALYTICS: Track conversion
  if (session_id && project) {
    await Promise.all([
      trackConversion(session_id, 'callback_requested', project.id, project.builder_id),
      // Also create BuilderLead record
      prisma.builderLead.create({
        data: {
          builder_id: project.builder_id,
          project_id: project.id,
          lead_type: 'callback_requested',
          name,
          phone,
          email: undefined,
          source_session: session_id,
          source_intent: profile as any,
          status: 'new',
        }
      })
    ]).catch(err => console.error('[leads] Analytics tracking failed:', err))
  }

  // Enrich lead with the buyer profile we already have, so builders get a qualified lead.
  const loanPreApproved = loan_status === 'pre_approved' || profile.loan_pre_approved === true

  // Check if project price fits buyer budget
  let projectFitsBudget = false
  if (project && profile.budget_cr) {
    const { price_range_min, price_range_max } = project
    if (price_range_min && price_range_max && profile.budget_cr.min && profile.budget_cr.max) {
      // Overlap: buyer budget intersects project price range
      projectFitsBudget = profile.budget_cr.max >= price_range_min && profile.budget_cr.min <= price_range_max
    }
  }

  // Check if project sector matches buyer preference
  const sectorMatches = project && profile.preferred_sector ? project.sector?.name === profile.preferred_sector : false

  const { score, tier } = scoreLead({
    loanPreApproved,
    intentTier: intent_tier ?? null,
    projectFitsBudget,
    savedCount: profile.engagement?.projects_saved,
    viewedCount: profile.engagement?.projects_viewed,
    sectorMatches,
  })
  // Send ONLY what user explicitly filled + qualified metadata
  // Do NOT spread user preferences (preferred_sector, etc) — send project's actual sector
  fireWebhook('callback_requested', {
    // User-provided form data
    name, phone, project_name: finalProjectName,
    intent_tier: intent_tier ?? null,
    loan_status,

    // Project data (not user preference)
    bhk: project?.bhk ?? null,
    sector: project?.sector?.name ?? null,
    price_range: project?.price_range_label ?? null,

    // Engagement metrics (facts, not preferences)
    projects_saved: profile.engagement?.projects_saved ?? 0,
    projects_viewed: profile.engagement?.projects_viewed ?? 0,

    // Qualified lead metadata
    budget_min_cr: profile.budget_cr?.min ?? null,
    budget_max_cr: profile.budget_cr?.max ?? null,
    loan_pre_approved: loanPreApproved,
    lead_score: score,
    lead_tier: tier,
    ai_summary: profile.ai_summary ?? null,
  }).catch((e) => console.error('[leads] webhook failed:', e))

  res.status(201).json({ callback: cb })
})

router.post('/site-visit', async (req: Request, res: Response) => {
  // Verify user is authenticated (signup required per CLAUDE.md)
  const userId = await verifyUser(req)
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return }

  // Rate limit: 5 site-visit requests per hour per user
  const rateLimit = await checkRateLimit(`site-visit:${userId}`, 5, 3600)
  if (rateLimit.remaining <= 0) { res.status(429).json({ error: 'Too many requests' }); return }

  const parsed = SiteVisitSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'Invalid request' }); return }

  const { name, phone, projectSlug, projectName, visitDate, timeSlot } = parsed.data

  if (visitDate) {
    const visitMs = new Date(visitDate).getTime()
    if (isNaN(visitMs) || visitMs <= Date.now()) {
      res.status(400).json({ error: 'Visit date must be in the future' }); return
    }
  }

  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true, builder_id: true } })
  if (!project) { res.status(404).json({ error: 'Project not found' }); return }

  const sv = await prisma.siteVisitRequest.create({
    data: {
      project_id: project.id,
      project_slug: projectSlug,
      project_name: projectName,
      name, phone,
      visit_date: new Date(visitDate),
      time_slot: timeSlot,
    },
  })

  // ─── ANALYTICS: Track conversion
  const { session_id } = req.body
  if (session_id) {
    await Promise.all([
      trackConversion(session_id, 'site_visit_requested', project.id, project.builder_id),
      prisma.builderLead.create({
        data: {
          builder_id: project.builder_id,
          project_id: project.id,
          lead_type: 'site_visit_requested',
          name,
          phone,
          email: undefined,
          source_session: session_id,
          status: 'new',
        }
      })
    ]).catch(err => console.error('[leads] Analytics tracking failed:', err))
  }

  fireWebhook('site_visit_requested', { name, phone, projectName, visitDate, timeSlot }).catch((e) => console.error('[leads] webhook failed:', e))

  res.status(201).json({ siteVisit: sv })
})

async function fireWebhook(event: string, data: Record<string, unknown>) {
  const url = process.env.WEBHOOK_URL
  if (!url) {
    console.error('[leads] ⚠️ WEBHOOK_URL not configured — lead webhook was not sent. Configure WEBHOOK_URL in environment.')
    return
  }
  const body = JSON.stringify({ event, data, ts: Date.now() })

  // Sign the payload so the receiver can verify it actually came from us.
  const secret = process.env.WEBHOOK_SECRET
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (secret) {
    const { createHmac } = await import('crypto')
    headers['X-Signature'] = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex')
  }

  // One retry on failure — leads are the revenue event; don't drop them silently.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { method: 'POST', headers, body, signal: AbortSignal.timeout(5000) })
      if (res.ok) return
    } catch (e) {
      if (attempt === 1) throw e
    }
    await new Promise((r) => setTimeout(r, 500))
  }
}

const WebhookLeadSchema = z.object({
  type: z.enum(['callback', 'site_visit']),
  name: z.string().min(1).max(100),
  phone: z.string().min(8).max(20),
  project_name: z.string().optional(),
  project_slug: z.string().optional(),
  visit_date: z.string().optional(),
  time_slot: z.string().optional(),
  message: z.string().max(500).optional(),
  timestamp: z.string(),
})

function verifySecret(req: Request): boolean {
  const secret = env.WEBHOOK_SECRET
  if (!secret) return process.env.NODE_ENV !== 'production'  // closed in prod
  const header = String(req.headers['x-webhook-secret'] ?? '')
  const a = Buffer.from(header)
  const b = Buffer.from(secret)
  return a.length === b.length && timingSafeEqual(a, b)
}

router.post('/webhook', async (req: Request, res: Response) => {
  if (!verifySecret(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const parsed = WebhookLeadSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
  }

  // Respond immediately — don't block the frontend
  res.status(202).json({ accepted: true })

  // Process async
  try {
    const result = await notifyLead(parsed.data)
    console.log(`[leads] ✅ ${parsed.data.type} | ${parsed.data.name} | wa:${result.whatsapp} email:${result.email}`)
  } catch (err) {
    console.error('[leads] ❌ notification failed:', err instanceof Error ? err.message : err)
  }
})

// GET /metrics — lead funnel analytics for dashboard
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const callbackCount = await prisma.builderLead.count({
      where: { lead_type: 'callback_requested' },
    })
    const visitCount = await prisma.siteVisitRequest.count()
    const scoreAgg = await prisma.builderLead.aggregate({
      _avg: { lead_score: true },
      where: { lead_type: 'callback_requested' },
    })
    const hotCount = await prisma.builderLead.count({
      where: { lead_type: 'callback_requested', lead_tier: 'HOT' },
    })
    const conversionRate = callbackCount > 0 ? (visitCount / callbackCount) * 100 : 0

    res.json({
      callbacksRequested: callbackCount,
      siteVisitsScheduled: visitCount,
      visitConversionRate: conversionRate,
      avgLeadScore: scoreAgg._avg.lead_score ?? 0,
      hotLeadsCount: hotCount,
    })
  } catch (err) {
    console.error('[leads:metrics] error:', err)
    res.status(500).json({ error: 'Failed to fetch metrics' })
  }
})

export default router
