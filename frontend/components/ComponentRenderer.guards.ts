/**
 * Component Renderer Guards — Validate specs and handle rendering errors
 */

import type { ComponentSpec, ComponentResponse } from '@/types/property'

/**
 * Validate component spec before rendering
 */
export function validateComponentSpec(spec: any): {
  valid: boolean
  sanitized?: ComponentSpec
  error?: string
} {
  // Type checks
  if (!spec || typeof spec !== 'object') {
    return { valid: false, error: 'Invalid spec: not an object' }
  }

  if (!spec.type || typeof spec.type !== 'string') {
    return { valid: false, error: 'Missing or invalid component type' }
  }

  if (!spec.props || typeof spec.props !== 'object') {
    return { valid: false, error: 'Missing or invalid component props' }
  }

  // Sanitize
  const sanitized = sanitizeComponentSpec(spec)

  return {
    valid: true,
    sanitized,
  }
}

/**
 * Sanitize component spec to prevent injection
 */
function sanitizeComponentSpec(spec: any): ComponentSpec {
  return {
    type: String(spec.type).substring(0, 100) as any,
    props: sanitizeProps(spec.props),
    title: spec.title ? String(spec.title).substring(0, 500) : undefined,
    description: spec.description ? String(spec.description).substring(0, 2000) : undefined,
  }
}

/**
 * Sanitize props object
 */
function sanitizeProps(props: any): Record<string, any> {
  if (!props || typeof props !== 'object') {
    return {}
  }

  const sanitized: Record<string, any> = {}
  let propCount = 0

  for (const [key, value] of Object.entries(props)) {
    // Limit prop count
    if (propCount >= 50) break
    propCount++

    // Sanitize key
    const cleanKey = String(key)
      .substring(0, 100)
      .replace(/[^a-zA-Z0-9_]/g, '_')

    if (cleanKey.length === 0) continue

    // Sanitize value
    const cleanValue = sanitizeValue(value, 0)
    if (cleanValue !== undefined) {
      sanitized[cleanKey] = cleanValue
    }
  }

  return sanitized
}

/**
 * Recursively sanitize values
 */
function sanitizeValue(value: any, depth = 0): any {
  // Prevent deep nesting
  if (depth > 10) return undefined

  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === 'string') {
    // XSS prevention
    if (value.length > 5000) {
      return value.substring(0, 5000)
    }
    // Remove script tags and event handlers
    return value
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/on\w+\s*=/gi, '')
  }

  if (typeof value === 'number') {
    return isFinite(value) ? value : null
  }

  if (typeof value === 'boolean') {
    return value
  }

  if (Array.isArray(value)) {
    // Limit array size
    return value
      .slice(0, 100)
      .map(v => sanitizeValue(v, depth + 1))
      .filter(v => v !== undefined)
  }

  if (typeof value === 'object') {
    // Limit object size
    const obj: Record<string, any> = {}
    let count = 0

    for (const [k, v] of Object.entries(value)) {
      if (count >= 20) break
      const cleanKey = String(k).substring(0, 100)
      const cleanValue = sanitizeValue(v, depth + 1)
      if (cleanValue !== undefined) {
        obj[cleanKey] = cleanValue
        count++
      }
    }

    return obj
  }

  return undefined
}

/**
 * Validate component response
 */
export function validateComponentResponse(response: any): {
  valid: boolean
  sanitized?: ComponentResponse
  error?: string
} {
  if (!response || typeof response !== 'object') {
    return { valid: false, error: 'Invalid response: not an object' }
  }

  // Check required fields
  if (typeof response.summary !== 'string') {
    return { valid: false, error: 'Missing or invalid summary' }
  }

  if (typeof response.confidence !== 'number') {
    return { valid: false, error: 'Missing or invalid confidence' }
  }

  if (!Array.isArray(response.components)) {
    return { valid: false, error: 'Missing or invalid components array' }
  }

  // Sanitize
  const sanitized = sanitizeComponentResponse(response)

  return {
    valid: true,
    sanitized,
  }
}

/**
 * Sanitize component response
 */
function sanitizeComponentResponse(response: any): ComponentResponse {
  const specs = response.components
    .slice(0, 20) // Limit components
    .map((spec: any) => {
      const validated = validateComponentSpec(spec)
      return validated.valid ? validated.sanitized! : null
    })
    .filter(Boolean)

  return {
    summary: String(response.summary).substring(0, 5000),
    confidence: Math.max(0, Math.min(1, Number(response.confidence) || 0)),
    components: specs,
    sources: Array.isArray(response.sources)
      ? response.sources.slice(0, 10).map((s: any) => String(s).substring(0, 100))
      : [],
    intent: response.intent,
    projectId: response.projectId ? String(response.projectId).substring(0, 100) : undefined,
  }
}

/**
 * Handle rendering errors gracefully
 */
export function handleComponentRenderError(
  componentType: string,
  error: Error
): {
  fallback: string
  severity: 'error' | 'warning'
  recoverable: boolean
} {
  if (error.message.includes('timeout')) {
    return {
      fallback: 'Component took too long to load',
      severity: 'warning',
      recoverable: true,
    }
  }

  if (error.message.includes('undefined')) {
    return {
      fallback: `Missing data for ${componentType}`,
      severity: 'warning',
      recoverable: true,
    }
  }

  if (error.message.includes('type')) {
    return {
      fallback: `Invalid data type for ${componentType}`,
      severity: 'error',
      recoverable: false,
    }
  }

  return {
    fallback: `Error rendering ${componentType}`,
    severity: 'error',
    recoverable: true,
  }
}

/**
 * Check if props are complete for component type
 */
export function validatePropsForComponent(
  componentType: string,
  props: Record<string, any>
): {
  complete: boolean
  missing: string[]
} {
  const requiredProps: Record<string, string[]> = {
    'property-card': ['name'],
    'emi-calculator': ['principal', 'ratePercentage', 'tenure'],
    'amenities-grid': ['amenities'],
    'connectivity-list': ['connectivity'],
    'builder-card': ['builderName'],
    'timeline': ['milestones'],
    'payment-breakdown': ['basePrice'],
    'location-scorecard': ['score'],
    'confidence-badge': ['confidence'],
    'risk-meter': ['riskLevel'],
  }

  const required = requiredProps[componentType] || []
  const missing = required.filter(prop => !(prop in props) || props[prop] === null || props[prop] === undefined)

  return {
    complete: missing.length === 0,
    missing,
  }
}

/**
 * Debounce rapid component re-renders
 */
export class RenderDebouncer {
  private timers = new Map<string, NodeJS.Timeout>()

  debounce(id: string, fn: () => void, delayMs = 100): void {
    if (this.timers.has(id)) {
      clearTimeout(this.timers.get(id)!)
    }

    const timer = setTimeout(() => {
      fn()
      this.timers.delete(id)
    }, delayMs)

    this.timers.set(id, timer)
  }

  clear(id?: string): void {
    if (id) {
      clearTimeout(this.timers.get(id))
      this.timers.delete(id)
    } else {
      for (const timer of this.timers.values()) {
        clearTimeout(timer)
      }
      this.timers.clear()
    }
  }
}

/**
 * Handle streaming timeout
 */
export function createStreamTimeoutError(timeoutMs: number): Error {
  return new Error(`SSE stream timeout after ${timeoutMs}ms`)
}

/**
 * Detect incomplete streaming (stream closed early)
 */
export function isStreamIncomplete(response: ComponentResponse): {
  incomplete: boolean
  reason?: string
} {
  // No components rendered
  if (response.components.length === 0) {
    return {
      incomplete: true,
      reason: 'No components were rendered',
    }
  }

  // Very low confidence
  if (response.confidence < 0.5) {
    return {
      incomplete: true,
      reason: 'Data confidence too low',
    }
  }

  // No summary
  if (!response.summary || response.summary.length < 10) {
    return {
      incomplete: true,
      reason: 'Summary too brief or missing',
    }
  }

  return { incomplete: false }
}
