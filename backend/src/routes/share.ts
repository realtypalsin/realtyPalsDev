import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/db'

const router = Router()

const CreateShareSchema = z.object({
  projectSlugs: z.array(z.string()).min(1).max(10),
})

// POST /api/v1/share — create shareable shortlist
router.post('/', async (req: Request, res: Response) => {
  const parsed = CreateShareSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'Invalid request' }); return }

  const { projectSlugs } = parsed.data

  try {
    const share = await prisma.sharedShortlist.create({
      data: {
        project_slugs: projectSlugs,
      },
    })

    res.json({ id: share.id, url: `/s/${share.id}` })
  } catch (err) {
    res.status(500).json({ error: 'Failed to create share' })
  }
})

// GET /api/v1/share/:id — fetch shortlist
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const share = await prisma.sharedShortlist.findUnique({
      where: { id },
    })

    if (!share || new Date(share.expires_at) < new Date()) {
      res.status(404).json({ error: 'Share not found or expired' })
      return
    }

    res.json({ projectSlugs: share.project_slugs })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch share' })
  }
})

export default router
