import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://propfyndr.in'
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/', '/auth', '/dashboard', '/saved', '/_next/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}

