// backend/src/lib/chat/reactionDetector.ts
// Sentiment detection for property reactions via keyword heuristics

export type PropertyReaction = {
  projectId: string
  sentiment: 'interested' | 'concerned' | 'rejected'
  signals: string[] // keywords that triggered this classification
  timestamp: Date
}

// Keyword heuristics for sentiment detection
const INTERESTED_KEYWORDS = [
  'love',
  'perfect',
  'definitely',
  'great',
  'excellent',
  'amazing',
  'wonderful',
  'ideal',
  'exactly what',
  "i'll take it",
  'very interested',
  'interested in this',
  'this one',
  'shortlist this',
  'save this',
]

const CONCERNED_KEYWORDS = [
  'worried',
  'concerned',
  'expensive',
  'too long',
  'worried about',
  'hesitant',
  'risky',
  'delay',
  'overpriced',
  'too pricey',
  'far from',
  'traffic',
  'pollution',
  'unsafe',
  'legal issue',
]

const REJECTED_KEYWORDS = [
  'ruled out',
  'no way',
  'not for me',
  'skip',
  'pass on',
  'forget it',
  "don't like",
  'hate',
  'avoid',
  'too far',
  'too expensive',
  'terrible',
  'worst',
  'never',
  'not interested',
]

function extractSentiment(text: string): { sentiment: PropertyReaction['sentiment']; signals: string[] } | null {
  const lowerText = text.toLowerCase()

  // Check rejected first (strongest signal)
  const rejectedMatches = REJECTED_KEYWORDS.filter(kw => lowerText.includes(kw))
  if (rejectedMatches.length > 0) {
    return { sentiment: 'rejected', signals: rejectedMatches }
  }

  // Then concerned
  const concernedMatches = CONCERNED_KEYWORDS.filter(kw => lowerText.includes(kw))
  if (concernedMatches.length > 0) {
    return { sentiment: 'concerned', signals: concernedMatches }
  }

  // Then interested
  const interestedMatches = INTERESTED_KEYWORDS.filter(kw => lowerText.includes(kw))
  if (interestedMatches.length > 0) {
    return { sentiment: 'interested', signals: interestedMatches }
  }

  return null
}

// Detect reactions on DRILLDOWN or COMPARISON queries
// Returns array of property reactions found in the user message
export function detectPropertyReactions(
  userMessage: string,
  queryKind: string | undefined,
  mentionedProjectIds: string[]
): PropertyReaction[] {
  if (!['DRILLDOWN', 'COMPARISON'].includes(queryKind ?? '')) {
    return []
  }

  const result = extractSentiment(userMessage)
  if (!result) {
    return []
  }

  // Apply sentiment to all mentioned projects in this message
  return mentionedProjectIds.map(projectId => ({
    projectId,
    sentiment: result.sentiment,
    signals: result.signals,
    timestamp: new Date(),
  }))
}
