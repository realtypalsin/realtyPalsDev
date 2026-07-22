import type { Metadata } from 'next'
import { API_BASE } from '@/lib/env'

type Params = { slug: string }

async function fetchProject(slug: string) {
  try {
    const res = await fetch(`${API_BASE}/projects/${slug}`, { next: { revalidate: 300 } })
    if (!res.ok) return null
    const data = await res.json()
    return data.project ?? null
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params
  const p = await fetchProject(slug)

  if (!p) {
    return {
      title: 'Property on RealtyPals',
      description: 'AI-guided home buying in Noida. Compare projects, see RERA status, get honest trade-offs.',
    }
  }

  const title = `${p.name}${p.sector ? ` · ${p.sector}` : ''} — ${p.price_range_label ?? ''}`.trim()
  const description =
    p.tagline?.trim() ||
    `${p.name} by ${p.builder?.name ?? 'a verified builder'} in ${p.sector ?? 'Noida'}. ${p.price_range_label ?? ''}${p.possession_label ? ` · Possession ${p.possession_label}` : ''}. Reviewed with RealtyPal AI.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'RealtyPals',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default function PropertyLayout({ children }: { children: React.ReactNode }) {
  return children
}
