/**
 * Classify user intent as "factual" or "advisory" for model routing.
 *
 * FACTUAL: What amenities, possession date, price, comparisons, builder details
 *   Route to: cheap model (llama-3.1-8b-instant) ~ 90% cost reduction
 *
 * ADVISORY: Why/should-I-buy, concerns, recommendations, whether to wait
 *   Route to: smart model (claude-opus) ~ requires reasoning
 */

import type { Intent } from '../discovery';

export type IntentCategory = 'factual' | 'advisory';

const FACTUAL_KEYWORDS = new Set([
  'amenities', 'facilities', 'what', 'list', 'price', 'cost', 'possession',
  'possession date', 'timeline', 'handover', 'bhk', 'bedroom', 'square feet',
  'carpet area', 'size', 'compare', 'difference', 'builder', 'developer',
  'nearby', 'distance', 'metro', 'school', 'hospital', 'connectivity',
  'location', 'area', 'sector', 'when', 'dates', 'possession schedule',
  'emi', 'calculator', 'price range', 'how much', 'cost breakdown',
]);

const ADVISORY_KEYWORDS = new Set([
  'should', 'worth', 'good', 'bad', 'concern', 'risk', 'problem', 'issue',
  'avoid', 'recommend', 'advice', 'opinion', 'why', 'reason', 'wait', 'delay',
  'investment', 'trust', 'reliable', 'safe', 'reputation', 'complaint', 'quality',
  'decision', 'choose', 'best', 'better', 'vs', 'versus', 'comparison advice',
  'trade-off', 'tradeoff', 'pros', 'cons', 'negative', 'positive', 'feel',
]);

/**
 * Classify intent as factual or advisory based on user message and extracted intent.
 * Defaults to 'advisory' when uncertain (safer choice).
 */
export function classifyIntent(userMessage: string, intent: Intent): IntentCategory {
  const lower = userMessage.toLowerCase();

  // Hard signal: explicit comparison query is factual (comparing properties)
  if (intent.is_comparison_query) {
    return 'factual';
  }

  // Count keyword signals
  let factualScore = 0;
  let advisoryScore = 0;

  for (const word of FACTUAL_KEYWORDS) {
    if (lower.includes(word)) factualScore++;
  }

  for (const word of ADVISORY_KEYWORDS) {
    if (lower.includes(word)) advisoryScore++;
  }

  // Factual wins only with clear signal; advisory wins by default
  if (factualScore > advisoryScore && factualScore >= 2) {
    return 'factual';
  }

  // Default: advisory (reasoning required)
  return 'advisory';
}

/**
 * Route intent to model based on category.
 * - factual: use cheap model (llama-3.1-8b-instant)
 * - advisory: use smart model (claude-opus or claude-sonnet)
 *
 * Returns model name to pass to streamWithOpenAI / streamWithGroq.
 */
export function routeToModel(category: IntentCategory): string {
  if (category === 'factual') {
    return 'llama-3.1-8b-instant'; // ~$0.002 per 1K tokens vs $0.015 for claude
  }
  return 'gpt-4o'; // Smart model for reasoning (fallback to this if available)
}
