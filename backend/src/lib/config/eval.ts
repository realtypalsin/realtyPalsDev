export const EVAL_CONFIG = {
  // Thresholds
  MIN_HALLUCINATION_RATE: 0.05, // flag if >5% of answers fabricate facts
  MIN_PRECISION_AT_K: {
    '5': 0.7, // top 5 discovery results should be ≥70% relevant
    '10': 0.6,
  },
  MIN_RECALL_AT_K: {
    '5': 0.6,
    '10': 0.8,
  },

  // Guardrail scoring
  GUARDRAIL_FALSE_POSITIVE_THRESHOLD: 0.1, // flag if >10% of good answers blocked
  GUARDRAIL_FALSE_NEGATIVE_THRESHOLD: 0.05, // flag if >5% of bad answers pass

  // Eval set size
  GOLDEN_TEST_SET_SIZE: 30,
  SAMPLE_RATE: 1.0, // run full eval every turn (set to 0.1 in prod to sample)
}
