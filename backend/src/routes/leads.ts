// backend/src/routes/leads.ts
import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/db'

const router = Router()

const CallbackSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(10),
  projectName: z.string().optional(),
  projectSlug: z.string().optional(),
  guestToken: z.string().optional(),
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
  const userId = req.headers['x-user-id'] as string | undefined
  const parsed = CallbackSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'Invalid request' }); return }

  const { name, phone, projectName, projectSlug, guestToken } = parsed.data
  const cb = await prisma.callbackRequest.create({
    data: { name, phone, project_name: projectName, project_slug: projectSlug, user_id: userId, guest_token: guestToken },
  })

  fireWebhook('callback_requested', { name, phone, projectName }).catch(() => {})

  res.status(201).json({ callback: cb })
})

router.post('/site-visit', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string | undefined
  const parsed = SiteVisitSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'Invalid request' }); return }

  const { name, phone, projectSlug, projectName, visitDate, timeSlot } = parsed.data

  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true } })
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

  fireWebhook('site_visit_requested', { name, phone, projectName, visitDate, timeSlot }).catch(() => {})

  res.status(201).json({ siteVisit: sv })
})

async function fireWebhook(event: string, data: Record<string, unknown>) {
  const url = process.env.WEBHOOK_URL
  if (!url) return
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, data, ts: Date.now() }),
  })
}

export default router
