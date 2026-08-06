/**
 * Sentry Server-Side Configuration
 * Error tracking and performance monitoring for backend
 */

import * as Sentry from '@sentry/node'

/**
 * Initialize Sentry for backend
 */
export function initSentryServer(): void {
  const dsn = process.env.SENTRY_DSN
  const env = process.env.NODE_ENV || 'development'

  if (!dsn) {
    console.warn('SENTRY_DSN not set; error tracking disabled')
    return
  }

  Sentry.init({
    dsn,
    environment: env,
    tracesSampleRate: env === 'production' ? 0.1 : 1.0,
    ignoreErrors: [
      // Network errors (expected in production)
      'NetworkError',
      'Request failed',
      // Browser extensions
      'chrome-extension://',
      'moz-extension://',
    ],
  })
}

/**
 * Middleware for Express to capture transactions
 * Note: Sentry v8 has built-in middleware
 */
export function sentryRequestHandler() {
  return (req: any, res: any, next: any) => next()
}

export function sentryErrorHandler() {
  return (err: any, req: any, res: any, next: any) => {
    Sentry.captureException(err)
    next(err)
  }
}

/**
 * Capture exception with context
 */
export function captureException(error: unknown, context?: Record<string, unknown>): void {
  Sentry.withScope(scope => {
    if (context) {
      scope.setContext('custom', context)
    }
    Sentry.captureException(error)
  })
}

/**
 * Set user context
 */
export function setSentryUser(userId: string | null, email?: string, username?: string): void {
  if (!userId) {
    Sentry.setUser(null)
    return
  }
  Sentry.setUser({
    id: userId,
    email: email || undefined,
    username: username || undefined,
  })
}

/**
 * Clear user context
 */
export function clearSentryUser(): void {
  Sentry.setUser(null)
}

/**
 * Add breadcrumb for tracing
 */
export function addBreadcrumb(
  category: string,
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info',
  data?: Record<string, unknown>
): void {
  Sentry.addBreadcrumb({
    category,
    message,
    level,
    data,
    timestamp: Date.now() / 1000,
  })
}

/**
 * Start performance transaction (Sentry v8 uses automatic transactions)
 */
export function startTransaction(name: string, op: string = 'http.request') {
  try {
    return Sentry.startSpan({
      name,
      op,
    }, (span) => span)
  } catch {
    return null
  }
}

/**
 * Flush Sentry
 */
export async function flushSentry(): Promise<boolean> {
  try {
    return await Sentry.close(5000)
  } catch (err) {
    console.error('Sentry flush failed:', err)
    return false
  }
}
