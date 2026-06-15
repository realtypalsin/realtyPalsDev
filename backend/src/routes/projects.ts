// backend/src/routes/projects.ts
import { Router, Request, Response } from 'express'
import { prisma } from '../lib/db'

const router = Router()

router.get('/', async (req: Request, res: Response) => {
  const { sector, bhk, budget_max_cr, status, city } = req.query as Record<string, string>

  const projects = await prisma.project.findMany({
    where: {
      ...(city && { city: { contains: city, mode: 'insensitive' } }),
      ...(sector && { sector: { contains: sector, mode: 'insensitive' } }),
      ...(status && { status: status as Parameters<typeof prisma.project.findMany>[0]['where']['status'] }),
      ...(bhk && { unit_types: { some: { bhk: parseInt(bhk) } } }),
      ...(budget_max_cr && { unit_types: { some: { price_min_cr: { lte: parseFloat(budget_max_cr) } } } }),
    },
    include: {
      builder: { select: { name: true, slug: true } },
      unit_types: { select: { bhk: true, price_min_cr: true, price_max_cr: true, carpet_area_sqft: true } },
      images: { where: { type: 'hero' }, take: 1, select: { url: true } },
    },
    take: 20,
  })

  res.json({ projects })
})

router.get('/:slug', async (req: Request, res: Response) => {
  const project = await prisma.project.findUnique({
    where: { slug: req.params.slug },
    include: {
      builder: true,
      unit_types: true,
      images: { orderBy: { sort_order: 'asc' } },
      amenities: true,
      connectivity: { orderBy: { distance_km: 'asc' } },
    },
  })

  if (!project) { res.status(404).json({ error: 'Not found' }); return }
  res.json({ project })
})

export default router
