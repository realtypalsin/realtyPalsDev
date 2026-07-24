/**
 * Add delay between tests to prevent rate limiting on external APIs (Groq).
 * Groq free tier: 6K-14K TPM. Each chat request ~3K tokens.
 * After 2 requests, rate limit (429) triggers. Add 1-2s delay between tests.
 */
export async function delay(ms: number = 1500): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Wrap a test to auto-delay after execution.
 * Used for tests that call external AI APIs.
 */
export async function withDelay<T>(fn: () => Promise<T>, ms?: number): Promise<T> {
  const result = await fn()
  await delay(ms)
  return result
}
