// Cohere — Reranker (free tier: 1000 calls/month)
// Used as fallback when Jina key not set, or primary if RERANKER=cohere.
// Multilingual model handles Hindi names, Indian addresses correctly.
// Key: https://dashboard.cohere.com

import { CohereClient } from 'cohere-ai'

export interface RerankResult {
  index: number
  relevance_score: number
}

const co = process.env.COHERE_API_KEY
  ? new CohereClient({ token: process.env.COHERE_API_KEY })
  : null

export async function cohereRerank(
  query: string,
  documents: string[],
  topN = 6,
): Promise<RerankResult[]> {
  if (!co || documents.length === 0) return []

  try {
    const res = await co.rerank({
      model: 'rerank-multilingual-v3.0',
      query,
      documents,
      topN: Math.min(topN, documents.length),
    })

    return (res.results ?? []).map((r) => ({
      index: r.index,
      relevance_score: r.relevanceScore,
    }))
  } catch (err) {
    console.warn('[cohere] rerank failed:', (err as Error).message)
    return []
  }
}
