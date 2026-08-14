/**
 * Chat router module — split from monolithic file into focused modules:
 * - chat-helpers.ts: Utilities (sameSet, cache logic, SSE, formatting)
 * - chat-service.ts: Business logic (intent extraction, enrichment, fallbacks)
 * - chat-router.ts: Route handlers (POST /, GET /session/*, PATCH, DELETE)
 *
 * This file maintains backward compatibility by re-exporting all modules.
 */

export { default } from './chat-router'
export * from './chat-helpers'
export * from './chat-service'
