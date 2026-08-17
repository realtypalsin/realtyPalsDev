import { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://realtypals.in'

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/discover`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/compare`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date('2026-08-16'),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date('2026-08-16'),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ]

  try {
    const [projects, builders] = await Promise.all([
      prisma.project.findMany({
        select: { slug: true },
        where: { slug: { not: '' } },
      }),
      prisma.builder.findMany({
        select: { slug: true },
        where: { slug: { not: '' } },
      }),
    ])

    const projectPages: MetadataRoute.Sitemap = projects.map((p) => ({
      url: `${baseUrl}/property/${p.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    }))

    const builderPages: MetadataRoute.Sitemap = builders.map((b) => ({
      url: `${baseUrl}/builder/${b.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    }))

    return [...staticPages, ...projectPages, ...builderPages]
  } catch (error) {
    console.error('[SITEMAP_GEN_ERROR]', error)
    return staticPages
  }
}

