// backend/src/routes/admin.ts
import { Router, Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/db'

const router = Router()

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const secret = req.headers['x-admin-secret'] as string
  if (secret !== process.env.ADMIN_SECRET) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }
  next()
}

router.use(requireAdmin)

router.get('/stats', async (_req, res) => {
  const [projects, sessions, leads, callbacks] = await Promise.all([
    prisma.project.count(),
    prisma.chatSession.count(),
    prisma.siteVisitRequest.count(),
    prisma.callbackRequest.count(),
  ])
  res.json({ projects, sessions, leads, callbacks })
})

router.get('/leads', async (_req, res) => {
  const [siteVisits, callbacks] = await Promise.all([
    prisma.siteVisitRequest.findMany({ orderBy: { created_at: 'desc' }, take: 50 }),
    prisma.callbackRequest.findMany({ orderBy: { created_at: 'desc' }, take: 50 }),
  ])
  res.json({ siteVisits, callbacks })
})

export default router
