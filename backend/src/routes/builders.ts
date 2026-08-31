// backend/src/routes/builders.ts
import { Router, Request, Response } from 'express'
import { prisma } from '../lib/db'
import { routeCache } from '../lib/routeCache'

const router = Router()

router.get('/', routeCache(300), async (_req: Request, res: Response) => {
  const builders = await prisma.builder.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      tagline: true,
      logo_url: true,
      founded_year: true,
      headquarters: true,
      website: true,
      cin: true,
      rera_promoter_id: true,
      founder: true,
      parent_group: true,
      credai_member: true,
      iso_certified: true,
      // rera_compliance_score is deliberately NOT selected. It is an
      // analyst-set 0-100 number in the same category as the ProjectDna scores
      // that projectExposure keeps internal: manually entered, frequently
      // unverified, and indistinguishable to a buyer from a measured rating.
      // CLAUDE.md forbids presenting one — "never use fake confidence scores".
      // The verifiable compliance facts (rera_promoter_id, cin) are above and
      // are fine to show, because a buyer can check them against the registry.
      delivered_units: true,
      delivered_projects: true,
      ongoing_projects: true,
      delayed_projects_count: true,
      average_delay_months: true,
      projects_delivered_count: true,
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
    take: 200,
  })
  res.json({ builders })
})

router.get('/:slug', routeCache(3600), async (req: Request, res: Response) => {
  const builder = await prisma.builder.findUnique({
    where: { slug: req.params.slug },
    include: {
      projects: {
        take: 50,
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
