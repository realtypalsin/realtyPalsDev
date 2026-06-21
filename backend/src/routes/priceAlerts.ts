// backend/src/routes/priceAlerts.ts
// GET/POST/DELETE /api/v1/price-alerts
// Ported from frontend/app/api/v1/price-alerts/route.ts
import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/db'
import { verifyUser } from '../lib/auth'

const router = Router()

const CreateSchema = z.object({
  project_id: z.string().uuid(),
  project_slug: z.string().min(1),
  target_price_cr: z.number().positive(),
  guest_token: z.string().optional(),
})

// POST /price-alerts — guest_token in body OR verified userId
router.post('/', async (req: Request, res: Response) => {
  let body: unknown
  try { body = req.body } catch { res.status(400).json({ error: 'Invalid JSON' }); return }

  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' })
    return
  }

  const d = parsed.data
  const userId = await verifyUser(req)

  if (!userId && !d.guest_token) {
    res.status(401).json({ error: 'Auth required' })
    return
  }

  const alert = await prisma.priceAlert.create({
    data: {
      project_id: d.project_id,
      project_slug: d.project_slug,
      target_price_cr: d.target_price_cr,
      user_id: userId ?? undefined,
      guest_token: d.guest_token,
    },
  })

  res.status(201).json({ success: true, id: alert.id })
})

// GET /price-alerts?guest_token= — userId from token OR guest_token from query
router.get('/', async (req: Request, res: Response) => {
  const user_id = await verifyUser(req)
  const guest_token = typeof req.query['guest_token'] === 'string' ? req.query['guest_token'] : undefined

  if (!user_id && !guest_token) {
    res.status(401).json({ error: 'Auth required' })
    return
  }

  const alerts = await prisma.priceAlert.findMany({
    where: {
      ...(user_id ? { user_id } : {}),
      ...(guest_token ? { guest_token } : {}),
      notified: false,
    },
    orderBy: { created_at: 'desc' },
  })

  res.json({ alerts })
})

// DELETE /price-alerts?id= — requires userId (no guest delete)
router.delete('/', async (req: Request, res: Response) => {
  const id = typeof req.query['id'] === 'string' ? req.query['id'] : undefined
  if (!id) { res.status(400).json({ error: 'id required' }); return }

  const userId = await verifyUser(req)
  if (!userId) { res.status(401).json({ error: 'Auth required' }); return }

  await prisma.priceAlert.deleteMany({ where: { id, user_id: userId } })
  res.json({ success: true })
})

export default router
