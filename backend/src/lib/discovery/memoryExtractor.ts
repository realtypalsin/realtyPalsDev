import type { ConversationMemory } from './types'

export function extractBudget(content: string): { min: number; max: number } | null {
  const match = content.match(/(\d+)[-–to\s]+(\d+)\s*(crore|lakh)/i)
  if (!match) return null
  const [, min, max, unit] = match
  const multiplier = unit.toLowerCase() === 'crore' ? 1 : 0.01
  return { min: parseInt(min) * multiplier, max: parseInt(max) * multiplier }
}

export function extractTimeline(content: string): string | null {
  const match = content.match(/(\d+)\s*[-–]?\s*(year|month)s?/i)
  if (!match) return null
  const num = match[1]
  const unit = match[2].toLowerCase()
  return `${num} ${unit}${parseInt(num, 10) > 1 ? 's' : ''}`
}

export function extractPainPoints(content: string): string[] {
  const painPointKeywords = ['concerned', 'want', 'worried', 'important', 'prefer', 'need', 'must']
  const points: string[] = []

  painPointKeywords.forEach((keyword) => {
    const regex = new RegExp(`(${keyword}[^.!?]{0,80})`, 'gi')
    const matches = Array.from(content.matchAll(regex))
    matches.forEach((match) => {
      const cleaned = match[1].replace(/[^a-zA-Z0-9\s]/g, '').trim()
      if (cleaned.length > 5) points.push(cleaned)
    })
  })

  return Array.from(new Set(points))
}

export function buildConversationMemory(chatHistory: { role: string; content: string }[]): ConversationMemory {
  const recentMessages = chatHistory.slice(-10).map((m) => m.content).join(' ')

  const budget = extractBudget(recentMessages)
  const timeline = extractTimeline(recentMessages)
  const painPoints = extractPainPoints(recentMessages)

  return {
    user_budget_min_cr: budget?.min,
    user_budget_max_cr: budget?.max,
    user_timeline: timeline || undefined,
    user_pain_points: painPoints,
    user_priorities: [],
    projects_discussed: [],
    stage: 'CLARIFYING',
    confident_facts: budget ? { budget: { value: budget, source: 'user_stated', confidence: 95 } } : {}
  }
}
