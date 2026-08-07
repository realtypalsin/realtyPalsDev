export interface EvalQuery {
  id: string
  query: string
  intent?: Record<string, unknown>
  expectedProjectCount?: { min: number; max: number }
  shouldFindProject?: string[]
  shouldNotRecommendBuilder?: string[]
  shouldNotHallucinate: boolean
  toolCallExpected?: string
  description: string
}

export interface EvalResult {
  totalQueries: number
  hallucinations: number
  hallucination_rate: number
  discoveryPrecisionAt5: number
  discoveryRecallAt10: number
  guardrailFalsePositives: number
  guardrailFalseNegatives: number
  passed: boolean
  issues: string[]
  timestamp?: number
}

export function scoreHallucination(
  response: string,
  systemPrompt: string,
  expectedProjects: Set<string>
): boolean {
  const mentionedProjects = [...expectedProjects]
  const mentionedInResponse = mentionedProjects.filter((p) =>
    response.toLowerCase().includes(p.toLowerCase())
  ).length
  const mentionedNotInPrompt = response.match(/(?:project|properties?)\s+([A-Z][A-Za-z\s]+)/g) ?? []
  return mentionedNotInPrompt.length > expectedProjects.size
}

export function computeEvalMetrics(results: {
  hallucinated: number
  total: number
  discoveryQueriesRun: number
  discoveryCorrect: number
}): EvalResult {
  const hallucination_rate = results.total > 0 ? results.hallucinated / results.total : 0
  const discoveryPrecisionAt5 = results.discoveryQueriesRun > 0
    ? results.discoveryCorrect / results.discoveryQueriesRun
    : 0

  return {
    totalQueries: results.total,
    hallucinations: results.hallucinated,
    hallucination_rate,
    discoveryPrecisionAt5,
    discoveryRecallAt10: 0.8, // placeholder
    guardrailFalsePositives: 0,
    guardrailFalseNegatives: 0,
    passed: hallucination_rate < 0.05 && discoveryPrecisionAt5 > 0.7,
    issues: hallucination_rate > 0.05 ? ['high hallucination rate'] : [],
    timestamp: Date.now(),
  }
}
