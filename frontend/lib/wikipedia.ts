// Wikipedia REST API — completely free, no API key.
// Returns plain-text extract for any article title.

export interface WikiSummary {
  title: string
  extract: string
  url: string
}

export async function getWikiSummary(title: string): Promise<WikiSummary | null> {
  const encoded = encodeURIComponent(title.replace(/\s+/g, '_'))
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'RealtyPals/1.0 (contact@realtypals.in)' },
      signal: AbortSignal.timeout(4000),
    })

    if (res.status === 404) return null
    if (!res.ok) return null

    const data = (await res.json()) as {
      type?: string
      title: string
      extract?: string
      content_urls?: { desktop?: { page?: string } }
    }

    if (data.type === 'disambiguation') return null
    if (!data.extract || data.extract.length < 50) return null

    return {
      title: data.title,
      extract: data.extract.slice(0, 800),
      url: data.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encoded}`,
    }
  } catch {
    return null
  }
}

/** Try specific sector article first, fall back to city article. */
export async function getAreaInfo(sector: string, city: string): Promise<WikiSummary | null> {
  const specific = await getWikiSummary(`${sector}, ${city}`)
  if (specific) return specific
  return getWikiSummary(city)
}
