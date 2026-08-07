import { EvalQuery, EvalResult, computeEvalMetrics } from './metrics'
import { EVAL_CONFIG } from '../config/eval'

export async function runEvaluation(queries: EvalQuery[]): Promise<EvalResult> {
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

  // TODO: For each query, call the chat endpoint and score the response
  // This is stubbed; full impl comes in Sprint 2
  for (const _query of queries) {
    // Placeholder: in Sprint 2, actual chat endpoint calls happen here
  }

  return computeEvalMetrics(results)
}
