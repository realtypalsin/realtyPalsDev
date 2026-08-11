// backend/src/lib/ai/providerStatus.ts
// In-memory circuit breaker & blacklisting for failed/stalled AI provider keys.
// If a key returns 404/401/403 or times out, it is blacklisted for 10 minutes
// so subsequent LLM calls skip it instantly (0ms) instead of hanging 10 seconds.

const failedKeys = new Map<string, number>() // envKey -> expireTimestamp

export function markKeyFailed(envKey: string, ttlMs = 10 * 60 * 1000) {
  console.warn(`[CIRCUIT_BREAKER] ⛔ Blacklisting failed key '${envKey}' for ${Math.round(ttlMs / 1000)}s`)
  failedKeys.set(envKey, Date.now() + ttlMs)
}

export function isKeyFailed(envKey: string): boolean {
  const expire = failedKeys.get(envKey)
  if (!expire) return false
  if (Date.now() > expire) {
    failedKeys.delete(envKey)
    return false
  }
  return true
}

export function clearFailedKeys() {
  failedKeys.clear()
}
