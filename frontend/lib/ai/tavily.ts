// Tavily — AI web search with content extraction (primary)
// Serper — Google Search API (fallback if Tavily fails/exhausted)
// Both serve the search_web tool in route.ts.

export interface WebResult {
  title: string
  url: string
  content: string
  score: number
}

export interface WebSearchResponse {
  answer: string
  results: WebResult[]
  source: 'tavily' | 'serper' | 'none'
}

// ── Tavily ─────────────────────────────────────────────────────────────────

async function searchTavily(
  query: string,
  maxResults: number,
): Promise<WebSearchResponse> {
  const key = process.env.TAVILY_API_KEY
  if (!key) return { answer: '', results: [], source: 'none' }

  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: key,
      query,
      search_depth: 'basic',
      max_results: maxResults,
      include_answer: true,
      include_domains: [
        'up-rera.in', 'credai.org', '99acres.com', 'magicbricks.com',
        'nobroker.in', 'housing.com', 'economictimes.com', 'hindustantimes.com',
        'thehindu.com', 'ndtv.com', 'moneycontrol.com',
      ],
    }),
    signal: AbortSignal.timeout(5000),
  })

  if (!res.ok) throw new Error(`Tavily ${res.status}`)

  const data = (await res.json()) as {
    answer?: string
    results?: WebResult[]
  }

  return {
    answer: data.answer ?? '',
    results: (data.results ?? []).slice(0, maxResults),
    source: 'tavily',
  }
}

// ── Serper (Google Search) ─────────────────────────────────────────────────

async function searchSerper(
  query: string,
  maxResults: number,
): Promise<WebSearchResponse> {
  const key = process.env.SERPER_API_KEY
  if (!key) return { answer: '', results: [], source: 'none' }

  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ q: query, num: maxResults }),
    signal: AbortSignal.timeout(5000),
  })

  if (!res.ok) throw new Error(`Serper ${res.status}`)

  const data = (await res.json()) as {
    organic?: Array<{ title: string; link: string; snippet: string }>
    answerBox?: { answer?: string }
    knowledgeGraph?: { description?: string }
  }

  const answer =
    data.answerBox?.answer ??
    data.knowledgeGraph?.description ??
    ''

  const results: WebResult[] = (data.organic ?? [])
    .slice(0, maxResults)
    .map((r) => ({
      title: r.title,
      url: r.link,
      content: r.snippet,
      score: 0.5,
    }))

  return { answer, results, source: 'serper' }
}

// ── Public API: Tavily first, Serper fallback ──────────────────────────────

export async function tavilySearch(
  query: string,
  maxResults = 3,
): Promise<WebSearchResponse> {
  try {
    const result = await searchTavily(query, maxResults)
    if (result.results.length > 0 || result.answer) return result
    // Tavily returned empty — try Serper
    return await searchSerper(query, maxResults)
  } catch {
    // Tavily failed — try Serper
    try {
      return await searchSerper(query, maxResults)
    } catch {
      return { answer: '', results: [], source: 'none' }
    }
  }
}

/** Format web search results into a compact LLM context string. */
export function formatTavilyContext(
  answer: string,
  results: WebResult[],
): string {
  const lines: string[] = []
  if (answer) lines.push(`Summary: ${answer}`)
  results.slice(0, 3).forEach((r, i) => {
    lines.push(`\n[Source ${i + 1}] ${r.title} — ${r.url}`)
    lines.push(r.content.slice(0, 400))
  })
  return lines.join('\n').trim()
}
