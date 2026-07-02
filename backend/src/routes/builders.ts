// backend/src/routes/builders.ts
import { Router, Request, Response } from 'express'
import { prisma } from '../lib/db'

const router = Router()

router.get('/', async (_req: Request, res: Response) => {
  const builders = await prisma.builder.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      tagline: true,
      logo_url: true,
      founded_year: true,
      headquarters: true,
      credai_member: true,
      delivered_units: true,
      delivered_projects: true,
      ongoing_projects: true,
      awards_count: true,
      description: true,
      delivery_score: true,
      construction_quality_score: true,
      verification_level: true,
      intelligence_completeness: true,
      legal_flag: true,
      _count: { select: { projects: true } },
    },
    orderBy: { name: 'asc' },
  })
  res.json({ builders })
})

router.get('/:slug', async (req: Request, res: Response) => {
  const builder = await prisma.builder.findUnique({
    where: { slug: req.params.slug },
    include: {
      projects: {
        select: {
          id: true,
          name: true,
          slug: true,
          sector: true,
          city: true,
          status: true,
          tagline: true,
          possession_date: true,
          land_area_acres: true,
          total_towers: true,
          total_units: true,
          rera_number: true,
          unit_types: {
            select: { bhk: true, price_min_cr: true, price_max_cr: true },
          },
          images: {
            where: { type: 'hero' },
            take: 1,
            select: { url: true },
          },
        },
        orderBy: { name: 'asc' },
      },
    },
  })

  if (!builder) { res.status(404).json({ error: 'Builder not found' }); return }
  res.json({ builder })
})

export default router
