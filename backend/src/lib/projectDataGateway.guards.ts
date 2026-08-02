/**
 * Project Data Gateway Guards — Validate and sanitize data
 */

import type { FactValidation, DataSource, DataCompleteness } from './projectDataGateway'

/**
 * Validate fact before returning to frontend
 */
export function validateAndSanitizeFact(fact: Partial<FactValidation>): FactValidation | null {
  // Missing required fields
  if (!fact.fact || fact.value === undefined || !fact.source) {
    return null
  }

  // Invalid confidence
  if (typeof fact.confidence !== 'number' || fact.confidence < 0 || fact.confidence > 1) {
    return null
  }

  // Sanitize value
  const sanitized = sanitizeFactValue(fact.value)
  if (sanitized === null) {
    return null
  }

  return {
    fact: String(fact.fact).substring(0, 255),
    value: sanitized,
    source: validateDataSource(fact.source),
    confidence: Math.max(0, Math.min(1, fact.confidence)),
    validated: fact.validated ?? false,
    reason: fact.reason ? String(fact.reason).substring(0, 500) : undefined,
    dataAge: typeof fact.dataAge === 'number' ? Math.abs(fact.dataAge) : undefined,
    lastVerifiedAt: fact.lastVerifiedAt ? validateISODate(fact.lastVerifiedAt) : undefined,
  }
}

/**
 * Sanitize fact value to prevent injection
 */
function sanitizeFactValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.length === 0) return null
    return trimmed.substring(0, 2000)
  }

  if (typeof value === 'number') {
    if (!isFinite(value)) return null
    return value
  }

  if (typeof value === 'boolean') {
    return value
  }

  if (Array.isArray(value)) {
    return value.slice(0, 100).map(v => sanitizeFactValue(v))
  }

  if (typeof value === 'object') {
    // Only allow simple objects, not nested structures
    const obj: Record<string, any> = {}
    for (const [k, v] of Object.entries(value as Record<string, any>)) {
      if (k.length > 100) continue
      const sanitized = sanitizeFactValue(v)
      if (sanitized !== null) {
        obj[k] = sanitized
      }
    }
    return obj
  }

  return null
}

/**
 * Validate data source
 */
function validateDataSource(source: unknown): DataSource {
  const validSources: DataSource[] = ['database', 'google_maps', 'calculator', 'estimated', 'derived']
  if (validSources.includes(source as DataSource)) {
    return source as DataSource
  }
  return 'derived' // Fallback
}

/**
 * Validate ISO date string
 */
function validateISODate(dateStr: unknown): string | undefined {
  if (typeof dateStr !== 'string') return undefined
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return undefined
    return date.toISOString()
  } catch {
    return undefined
  }
}

/**
 * Check if data is too old
 */
export function isDataStale(lastVerifiedAt?: string, maxAgeDays = 90): boolean {
  if (!lastVerifiedAt) return true

  try {
    const verifiedDate = new Date(lastVerifiedAt)
    const ageDays = (Date.now() - verifiedDate.getTime()) / (1000 * 60 * 60 * 24)
    return ageDays > maxAgeDays
  } catch {
    return true
  }
}

/**
 * Validate completeness object
 */
export function validateCompleteness(completeness: Partial<DataCompleteness>): DataCompleteness {
  return {
    complete: Boolean(completeness.complete),
    coverage: typeof completeness.coverage === 'number'
      ? Math.max(0, Math.min(1, completeness.coverage))
      : 0,
    missing: Array.isArray(completeness.missing)
      ? completeness.missing.slice(0, 20).map(m => String(m))
      : [],
    missingByImportance: {
      critical: Array.isArray(completeness.missingByImportance?.critical)
        ? completeness.missingByImportance.critical.slice(0, 10).map(m => String(m))
        : [],
      optional: Array.isArray(completeness.missingByImportance?.optional)
        ? completeness.missingByImportance.optional.slice(0, 10).map(m => String(m))
        : [],
    },
  }
}

/**
 * Handle missing project
 */
export function handleMissingProject(projectId: string): {
  found: boolean
  message: string
} {
  return {
    found: false,
    message: `Project not found: ${String(projectId).substring(0, 100)}`,
  }
}

/**
 * Handle database errors
 */
export function handleDatabaseError(error: Error): {
  message: string
  recoverable: boolean
} {
  if (error.message.includes('connection')) {
    return {
      message: 'Database connection error. Please try again.',
      recoverable: true,
    }
  }

  if (error.message.includes('timeout')) {
    return {
      message: 'Database query timed out. Please try again.',
      recoverable: true,
    }
  }

  if (error.message.includes('constraint')) {
    return {
      message: 'Data validation error. Please contact support.',
      recoverable: false,
    }
  }

  return {
    message: 'Database error. Please try again.',
    recoverable: true,
  }
}

/**
 * Validate and repair incomplete response
 */
export function repairGatewayResponse(response: any): {
  valid: boolean
  repaired: boolean
  message?: string
} {
  // Check required fields
  if (!response.projectId || !response.found) {
    return {
      valid: false,
      repaired: false,
      message: 'Invalid gateway response structure',
    }
  }

  // Data field should exist if found=true
  if (response.found && !response.data) {
    response.data = {}
    return {
      valid: true,
      repaired: true,
      message: 'Repaired: added empty data object',
    }
  }

  // Completeness should exist if found=true
  if (response.found && !response.completeness) {
    response.completeness = {
      complete: false,
      coverage: 0,
      missing: [],
      missingByImportance: { critical: [], optional: [] },
    }
    return {
      valid: true,
      repaired: true,
      message: 'Repaired: added completeness object',
    }
  }

  return {
    valid: true,
    repaired: false,
  }
}

/**
 * Rate limit check
 */
export function checkRateLimit(projectId: string, lastRequestTime: number | null): {
  allowed: boolean
  waitMs?: number
} {
  if (lastRequestTime === null) {
    return { allowed: true }
  }

  const elapsedMs = Date.now() - lastRequestTime
  const minIntervalMs = 1000 // 1 second between requests

  if (elapsedMs < minIntervalMs) {
    return {
      allowed: false,
      waitMs: minIntervalMs - elapsedMs,
    }
  }

  return { allowed: true }
}

/**
 * Concurrent request deduplication
 */
export class RequestDeduplicator {
  private requests = new Map<string, Promise<any>>()
  private timeouts = new Map<string, NodeJS.Timeout>()

  async execute<T>(
    key: string,
    fn: () => Promise<T>,
    ttlMs = 5000
  ): Promise<T> {
    // Return cached promise if exists
    if (this.requests.has(key)) {
      return this.requests.get(key)!
    }

    // Execute and cache
    const promise = fn().catch(err => {
      this.requests.delete(key)
      throw err
    })

    this.requests.set(key, promise)

    // Auto-cleanup after TTL
    this.timeouts.set(
      key,
      setTimeout(() => {
        this.requests.delete(key)
        this.timeouts.delete(key)
      }, ttlMs)
    )

    try {
      return await promise
    } catch (err) {
      this.requests.delete(key)
      throw err
    }
  }

  clear(): void {
    for (const timeout of this.timeouts.values()) {
      clearTimeout(timeout)
    }
    this.requests.clear()
    this.timeouts.clear()
  }
}
