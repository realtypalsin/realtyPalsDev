import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { env } from '../lib/env'
import { notifyLead } from '../lib/notify'

const router = Router()

const LeadSchema = z.object({
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
  if (!env.WEBHOOK_SECRET) return true  // no secret configured — open endpoint
  const header = req.headers['x-webhook-secret']
  return header === env.WEBHOOK_SECRET
}

router.post('/api/leads/webhook', async (req: Request, res: Response) => {
  if (!verifySecret(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const parsed = LeadSchema.safeParse(req.body)
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

export default router
