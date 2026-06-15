// backend/src/routes/saved.ts
import { Router, Request, Response } from 'express'
import { prisma } from '../lib/db'

const router = Router()

router.get('/', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string
  if (!userId) { res.status(401).json({ error: 'Auth required' }); return }

  const saved = await prisma.savedProperty.findMany({
    where: { user_id: userId },
    include: {
      project: {
        include: {
          builder: { select: { name: true } },
          images: { where: { type: 'hero' }, take: 1 },
          unit_types: { select: { bhk: true, price_min_cr: true, price_max_cr: true } },
        },
      },
    },
    orderBy: { saved_at: 'desc' },
  })

  res.json({ saved })
})

router.post('/', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string
  const { projectId } = req.body as { projectId: string }
  if (!userId) { res.status(401).json({ error: 'Auth required' }); return }
  if (!projectId) { res.status(400).json({ error: 'projectId required' }); return }

  try {
    const saved = await prisma.savedProperty.create({ data: { user_id: userId, project_id: projectId } })
    res.status(201).json({ saved })
  } catch {
    res.status(409).json({ error: 'Already saved' })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string
  if (!userId) { res.status(401).json({ error: 'Auth required' }); return }

  await prisma.savedProperty.deleteMany({ where: { id: req.params.id, user_id: userId } })
  res.json({ ok: true })
})

export default router
