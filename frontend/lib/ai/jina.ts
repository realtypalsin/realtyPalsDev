// Jina AI — Reranker + Embeddings (free 1M tokens). Key: https://jina.ai
// Reranker: improves which properties surface as top results
// Embeddings: 1024-dim vectors for semantic similarity search

export interface RerankResult {
  index: number
  relevance_score: number
}

export async function embed(text: string): Promise<number[] | null> {
  const key = process.env.JINA_API_KEY
  if (!key) return null

  try {
    const res = await fetch('https://api.jina.ai/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'jina-embeddings-v3',
        input: [text],
        dimensions: 1024,
        task: 'retrieval.query',
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      console.warn(`[jina] embed ${res.status}`)
      return null
    }

    const data = (await res.json()) as { data: Array<{ embedding: number[] }> }
    return data.data?.[0]?.embedding ?? null
  } catch (err) {
    console.warn('[jina] embed failed:', (err as Error).message)
    return null
  }
}

export async function embedDocument(text: string): Promise<number[] | null> {
  const key = process.env.JINA_API_KEY
  if (!key) return null

  try {
    const res = await fetch('https://api.jina.ai/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'jina-embeddings-v3',
        input: [text],
        dimensions: 1024,
        task: 'retrieval.passage',
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      console.warn(`[jina] embedDoc ${res.status}`)
      return null
    }

    const data = (await res.json()) as { data: Array<{ embedding: number[] }> }
    return data.data?.[0]?.embedding ?? null
  } catch (err) {
    console.warn('[jina] embedDoc failed:', (err as Error).message)
    return null
  }
}

export async function rerank(
  query: string,
  documents: string[],
  topN = 6,
): Promise<RerankResult[]> {
  const key = process.env.JINA_API_KEY
  if (!key || documents.length === 0) return []

  try {
    const res = await fetch('https://api.jina.ai/v1/rerank', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'jina-reranker-v2-base-multilingual',
        query,
        documents,
        top_n: Math.min(topN, documents.length),
      }),
      signal: AbortSignal.timeout(4000),
    })

    if (!res.ok) {
      console.warn(`[jina] rerank ${res.status}`)
      return []
    }

    const data = (await res.json()) as {
      results: Array<{ index: number; relevance_score: number }>
    }
    return data.results ?? []
  } catch (err) {
    console.warn('[jina] rerank failed:', (err as Error).message)
    return []
  }
}

/**
 * Jina Reader — extract clean Markdown from any URL.
 * GET r.jina.ai/{url} — uses same Jina API key.
 * Use for RERA pages, news articles, builder websites.
 */
export async function jinaRead(url: string, maxChars = 3000): Promise<string | null> {
  const key = process.env.JINA_API_KEY
  if (!key) return null

  try {
    const res = await fetch(`https://r.jina.ai/${encodeURIComponent(url)}`, {
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: 'text/markdown',
        'X-Return-Format': 'markdown',
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      console.warn(`[jina reader] ${res.status} for ${url}`)
      return null
    }
    const text = await res.text()
    return text.slice(0, maxChars)
  } catch (err) {
    console.warn('[jina reader] failed:', (err as Error).message)
    return null
  }
}
