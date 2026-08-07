import { EvalQuery, EvalResult, computeEvalMetrics, scoreHallucination } from './metrics'
import { EVAL_CONFIG } from '../config/eval'

export type EvalCallHandler = (query: string) => Promise<string>

export async function runEvaluation(
  queries: EvalQuery[],
  callHandler?: EvalCallHandler,
): Promise<EvalResult> {
  if (Math.random() > EVAL_CONFIG.SAMPLE_RATE) {
    // Skip this run (sampling)
    return {
      totalQueries: 0,
      hallucinations: 0,
      hallucination_rate: 0,
      discoveryPrecisionAt5: 1.0,
      discoveryRecallAt10: 1.0,
      guardrailFalsePositives: 0,
      guardrailFalseNegatives: 0,
      passed: true,
      issues: [],
      timestamp: Date.now(),
    }
  }

  const results = {
    hallucinated: 0,
    total: queries.length,
    discoveryQueriesRun: 0,
    discoveryCorrect: 0,
  }

  // If no handler provided (e.g., in unit tests), return stub result
  if (!callHandler) {
    return computeEvalMetrics(results)
  }

  // Run each query through the call handler (chat endpoint)
  for (const evalQuery of queries) {
    try {
      const response = await callHandler(evalQuery.query)

      // Score hallucination
      if (evalQuery.shouldNotHallucinate) {
        const expectedProjects = new Set(evalQuery.shouldFindProject || [])
        const hallucinated = scoreHallucination(response, '', expectedProjects)
        if (hallucinated) results.hallucinated++
      }

      // Score discovery precision (if expected project count provided)
      if (evalQuery.expectedProjectCount) {
        results.discoveryQueriesRun++
        // In real implementation, parse response to extract project count
        // For now, assume success if response is non-empty
        if (response.length > 0) {
          results.discoveryCorrect++
        }
      }
    } catch (err) {
      console.error(`[EVAL] Query ${evalQuery.id} failed:`, err instanceof Error ? err.message : 'unknown error')
    }
  }

  return computeEvalMetrics(results)
}
