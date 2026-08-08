export interface ChatResponse {
  message: string
  memory_context: {
    user_stated_facts: Record<string, any>
    inferred_preferences: string[]
    open_questions: string[]
  }
  comparison?: {
    matrix: any
    winner: string
    reason: string
  }
  confidence: {
    payment_plans: number
    builder_history: number
    location: number
    possession: number
    overall: number
  }
  chips: any[]
  data_freshness: Record<string, string>
  missing_data: string[]
}
