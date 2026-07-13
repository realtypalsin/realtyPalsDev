// backend/src/routes/saved.ts
import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/db'
import { verifyUser } from '../lib/auth'
import { toProjectCard } from '../lib/projectRepository'

const router = Router()

const SaveBodySchema = z.object({
  project_id: z.string().min(1),
})

router.get('/', async (req: Request, res: Response) => {
  const userId = await verifyUser(req)
  if (!userId) { res.status(401).json({ error: 'Auth required' }); return }

  try {
    const saved = await prisma.savedProperty.findMany({
      where: { user_id: userId },
      include: {
        project: {
          include: {
            builder: { select: { name: true, slug: true } },
            unit_types: { orderBy: { bhk: 'asc' } },
            amenities: true,
            connectivity: true,
            images: { orderBy: { sort_order: 'asc' } },
          },
        },
      },
      orderBy: { saved_at: 'desc' },
      take: 20,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const projects = saved.map((s: any) => toProjectCard(s.project))
    res.json({ projects, count: projects.length })
  } catch (err) {
    console.error('[GET /saved]', err)
    res.status(500).json({ error: 'Failed to fetch saved' })
  }
})

router.post('/', async (req: Request, res: Response) => {
  const userId = await verifyUser(req)
  if (!userId) { res.status(401).json({ error: 'Auth required' }); return }

  const parsed = SaveBodySchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'project_id required' }); return }

  const { project_id } = parsed.data

  try {
    await prisma.savedProperty.upsert({
      where: { user_id_project_id: { user_id: userId, project_id } },
      create: { user_id: userId, project_id },
      update: {},
    })

    // Log engagement event for admin analytics
    await prisma.propertyEvent.create({
      data: {
        session_id: req.cookies?.sessionId || 'unknown',
        user_id: userId,
        project_id,
        action: 'save',
      }
    }).catch(err => console.error('[POST /saved] failed to create event:', err))

    res.status(201).json({ ok: true })
  } catch (err) {
    console.error('[POST /saved]', err)
    res.status(500).json({ error: 'Failed to save' })
  }
})

router.get('/:id/check', async (req: Request, res: Response) => {
  const userId = await verifyUser(req)
  if (!userId) { res.status(401).json({ error: 'Auth required' }); return }

  try {
    const saved = await prisma.savedProperty.findUnique({
      where: { user_id_project_id: { user_id: userId, project_id: req.params.id } },
    })
    res.json({ is_saved: !!saved })
  } catch (err) {
    console.error('[GET /saved/:id/check]', err)
    res.status(500).json({ error: 'Failed to check' })
  }
})

// :id param represents project_id (the foreign key), NOT the saved record's internal id.
router.delete('/:id', async (req: Request, res: Response) => {
  const userId = await verifyUser(req)
  if (!userId) { res.status(401).json({ error: 'Auth required' }); return }

  await prisma.savedProperty.deleteMany({
    where: { user_id: userId, project_id: req.params.id },
  })

  // Log engagement event for admin analytics
  await prisma.propertyEvent.create({
    data: {
      session_id: req.cookies?.sessionId || 'unknown',
      user_id: userId,
      project_id: req.params.id,
      action: 'remove_saved',
    }
  }).catch(err => console.error('[DELETE /saved] failed to create event:', err))

  res.json({ ok: true })
})

export default router
