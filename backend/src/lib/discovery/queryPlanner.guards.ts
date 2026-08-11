/**
 * Query Planner Guards — Validate input and handle edge cases
 */

export interface ValidationError {
  type: 'input_error' | 'parsing_error' | 'timeout_error'
  message: string
  recoverable: boolean
}

/**
 * Validate user message for anomalies
 */
export function validateUserMessage(message: string | undefined): ValidationError | null {
  if (!message) {
    return {
      type: 'input_error',
      message: 'Empty message',
      recoverable: true,
    }
  }

  const trimmed = message.trim()

  // Too short
  if (trimmed.length < 3) {
    return {
      type: 'input_error',
      message: 'Message too short (minimum 3 characters)',
      recoverable: true,
    }
  }

  // Too long (likely copy-paste error)
  if (trimmed.length > 2000) {
    return {
      type: 'input_error',
      message: 'Message too long (maximum 2000 characters)',
      recoverable: true,
    }
  }

  // Mostly special characters (not normal query)
  const specialCharRatio = (trimmed.match(/[^a-z0-9\s?'.₹,–-]/gi) || []).length / trimmed.length
  if (specialCharRatio > 0.75) {
    return {
      type: 'parsing_error',
      message: 'Message contains too many special characters',
      recoverable: true,
    }
  }

  // Repeated characters (spam detection)
  if (/(.)\1{9,}/.test(trimmed)) {
    return {
      type: 'parsing_error',
      message: 'Message contains excessive repetition',
      recoverable: true,
    }
  }

  return null
}

/**
 * Sanitize message for processing
 */
export function sanitizeMessage(message: string): string {
  return message
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    // eslint-disable-next-line no-useless-escape
    .replace(/[^\w\s?'.\-]/g, '') // Remove special chars except basic punctuation
    .substring(0, 2000) // Cap length
}

/**
 * Handle missing project IDs gracefully
 */
export function getMissingProjectClarification(confidence: number, detectedProjects: string[]): string {
  if (detectedProjects.length === 0) {
    return 'I need a project name to answer that. Which project are you asking about? (e.g., "ATS Pristine", "Godrej Air")'
  }

  if (confidence < 0.5) {
    const projects = detectedProjects.join(', ')
    return `Did you mean ${projects}? Or is there another project you'd like to know about?`
  }

  return 'Please confirm the project name.'
}

/**
 * Handle missing required fields
 */
export function getMissingFieldsClarification(missingCritical: string[], intent: string): string {
  const field = missingCritical[0]
  const fieldNames = {
    price_min_cr: 'price information',
    gst_rate_pct: 'GST rates',
    stamp_duty_pct: 'stamp duty rates',
    connectivity_count: 'connectivity data',
    possession_date: 'possession timeline',
    builder_name: 'builder information',
    construction_progress_pct: 'construction status',
  }

  const displayName = fieldNames[field as keyof typeof fieldNames] || field
  return `I have partial data for this project. Missing: ${displayName}. Please contact our team for complete details.`
}

/**
 * Validate intent detection confidence
 */
export function validateIntentConfidence(confidence: number, intent: string): {
  isValid: boolean
  suggestion?: string
} {
  if (confidence >= 0.85) {
    return { isValid: true }
  }

  if (confidence >= 0.7) {
    return {
      isValid: true,
      suggestion: `I think you're asking about ${intent}, but I'm not 100% sure.`,
    }
  }

  return {
    isValid: false,
    suggestion: "I'm not sure what you're asking. Could you rephrase that?",
  }
}

/**
 * Handle concurrent request deduplication
 */
export function generateRequestKey(projectId: string, intent: string, timestamp: number): string {
  const bucket = Math.floor(timestamp / 5000) // 5 second buckets
  return `${projectId}:${intent}:${bucket}`
}

/**
 * Validate component specs for rendering
 */
export function validateComponentSpec(spec: any): {
  valid: boolean
  error?: string
} {
  if (!spec) {
    return { valid: false, error: 'Empty component spec' }
  }

  if (!spec.type) {
    return { valid: false, error: 'Missing component type' }
  }

  if (typeof spec.type !== 'string') {
    return { valid: false, error: 'Invalid component type' }
  }

  if (!spec.props) {
    return { valid: false, error: 'Missing component props' }
  }

  if (typeof spec.props !== 'object') {
    return { valid: false, error: 'Invalid component props' }
  }

  return { valid: true }
}

/**
 * Handle null/undefined values in facts
 */
export function sanitizeFact(value: unknown): unknown {
  if (value === null || value === undefined) {
    return 'Not available'
  }

  if (typeof value === 'string') {
    return value.trim() || 'Not available'
  }

  if (typeof value === 'number') {
    if (!isFinite(value)) {
      return 'Invalid value'
    }
    return value
  }

  return value
}

/**
 * Validate data age and freshness
 */
export function assessDataFreshness(lastVerifiedAt?: string, dataAge?: number): {
  fresh: boolean
  confidence_penalty: number
  warning?: string
} {
  if (!lastVerifiedAt && !dataAge) {
    return {
      fresh: false,
      confidence_penalty: 0.1,
      warning: 'Data age unknown',
    }
  }

  const days = dataAge || (lastVerifiedAt ? Math.floor((Date.now() - new Date(lastVerifiedAt).getTime()) / (1000 * 60 * 60 * 24)) : 0)

  if (days > 90) {
    return {
      fresh: false,
      confidence_penalty: 0.25,
      warning: `Data is ${days} days old`,
    }
  }

  if (days > 30) {
    return {
      fresh: false,
      confidence_penalty: 0.15,
      warning: `Data is ${days} days old`,
    }
  }

  if (days > 7) {
    return {
      fresh: true,
      confidence_penalty: 0.05,
      warning: `Data is ${days} days old`,
    }
  }

  return {
    fresh: true,
    confidence_penalty: 0,
  }
}

/**
 * Handle timeout scenarios
 */
export function createTimeoutError(context: string, timeoutMs: number): ValidationError {
  return {
    type: 'timeout_error',
    message: `Request to ${context} timed out after ${timeoutMs}ms`,
    recoverable: true,
  }
}

/**
 * Fallback response when pipeline fails
 */
export function createFallbackResponse(error: ValidationError | Error, projectId?: string): string {
  if (error instanceof Error) {
    if (error.message.includes('timeout')) {
      return 'The request took too long. Please try again or contact our team for help.'
    }
    if (error.message.includes('not found')) {
      return `I couldn't find information about this project. Please verify the project name or contact our team.`
    }
    if (error.message.includes('database')) {
      return 'I have trouble accessing data right now. Please try again in a moment.'
    }
  }

  const ve = error as ValidationError
  if (ve.type === 'timeout_error') {
    return 'The request took too long. Please try again.'
  }

  return 'I encountered an issue processing your request. Please try rephrasing or contact our team.'
}
