/**
 * Sentry Client-Side Configuration
 * Error tracking and performance monitoring for frontend
 */

import * as Sentry from '@sentry/nextjs'

/**
 * Initialize Sentry for frontend
 */
export function initSentryClient(): void {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
  const env = process.env.NODE_ENV || 'development'

  if (!dsn) {
    console.warn('NEXT_PUBLIC_SENTRY_DSN not set; frontend error tracking disabled')
    return
  }

  Sentry.init({
    dsn,
    environment: env,
    tracesSampleRate: env === 'production' ? 0.1 : 1.0,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    ignoreErrors: [
      // Network/user action errors (expected)
      'NetworkError',
      'Failed to fetch',
      'Network request failed',
      // Browser extensions
      'chrome-extension://',
      'moz-extension://',
      // Third-party errors
      'https://pagead2.googlesyndication.com',
    ],
  })
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
export function setSentryUser(userId: string, email?: string, username?: string): void {
  Sentry.setUser({
    id: userId,
    email,
    username,
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
  })
}

/**
 * Start performance transaction
 */
export function startTransaction(name: string, op: string = 'http.request') {
  return Sentry.startSpan({ name, op }, (span) => span)
}
