# Coding Conventions

**Analysis Date:** 2026-06-14

## Naming Patterns

**Files:**
- React components: PascalCase `.tsx` — `ProjectCard.tsx`, `DiscoveryContent.tsx`, `BuilderReputationCard.tsx`
- Utility modules: camelCase `.ts` — `calculators.ts`, `leadNotify.ts`, `normalize.ts`
- Repository modules: camelCase `.ts` — `projectRepository.ts`
- AI modules: camelCase `.ts` under `lib/ai/` — `prompts.ts`, `tavily.ts`, `jina.ts`
- Route handlers: Next.js convention `app/api/v1/[resource]/route.ts`

**Functions:**
- Pure utilities: camelCase — `calculateEmi`, `formatInr`, `buildCacheKey`
- Async handlers: camelCase — `searchProjects`, `getProjectBySlug`, `notifyLead`
- React components: PascalCase — `ProjectCard`, `CalculatorPanel`
- Internal/private helpers: camelCase prefixed with no export — `toProjectCard`, `scoreProject`, `fireWebhook`

**Variables:**
- Local variables: camelCase — `loanAmount_cr`, `finalResults`, `cacheKey`
- Domain-specific compound names use underscores for units: `price_min_cr`, `budget_max_cr`, `carpet_sqm`
- Constants: UPPER_SNAKE_CASE — `MAX_HISTORY`, `MAX_STEPS`, `REQUEST_TIMEOUT_MS`, `RETRY_DELAYS_MS`
- Array-of-tuples constants typed as `const` — `CATEGORY_ORDER`, `CONN_PRIORITY`

**Types/Interfaces:**
- Interfaces: PascalCase prefixed with no `I` — `EmiResult`, `SearchFilters`, `LeadPayload`, `UserMemoryContext`
- Exported types: PascalCase — `ProjectCard`, `ProjectDetail`, `UnitTypeSummary`
- Zod schemas: PascalCase + `Schema` suffix — `BodySchema`

## Code Style

**Formatting:**
- No standalone Prettier config detected; formatting is enforced via ESLint + `next/core-web-vitals`
- 2-space indentation (consistent across all files observed)
- Single quotes for string literals in most files
- Arrow functions preferred over `function` keyword for inline callbacks
- Trailing commas in multi-line objects/arrays

**Linting:**
- Config: `frontend/.eslintrc.json`
- Extends `next/core-web-vitals` and `plugin:@typescript-eslint/recommended`
- `@typescript-eslint/no-explicit-any`: `warn` (not error) — `any` types are used in several places and suppressed with ESLint comments
- `@typescript-eslint/no-unused-vars`: `warn` with `argsIgnorePattern: "^_"` — unused args prefixed `_` are allowed
- `components/ui/**` overrides relax all TS rules (third-party shadcn/ui components)

**TypeScript:**
- Strict mode enabled in `tsconfig.json`
- Path alias `@/*` maps to `frontend/` root — used consistently across all imports
- `as const` used for fixed-set arrays: `['sports', 'lifestyle', ...] as const`
- `any` casting happens at Prisma boundary (DB rows typed as `any` before mapping to domain types) — marked with `// eslint-disable-next-line @typescript-eslint/no-explicit-any`

## Import Organization

**Order (observed pattern):**
1. Next.js / framework imports — `import { NextRequest } from 'next/server'`
2. Third-party packages — `import { z } from 'zod'`, `import { streamText } from 'ai'`
3. Internal `@/lib/*` imports
4. Internal `@/types/*` type imports (grouped with `import type`)
5. Relative imports (rare, mostly in same directory)

**Path Aliases:**
- `@/*` → `frontend/` root (all internal imports use this)

**Type-only imports:**
- `import type { ... }` used consistently for type-only imports: `import type { ProjectCard } from '@/types/project'`

## Error Handling

**API Route Pattern:**
- Parse body with `safeParse` (Zod), return `400` with structured JSON error immediately on failure
- `try/catch` wraps external API calls; errors are caught, logged, and degraded responses returned
- Webhook calls use retry logic with explicit delay array (`RETRY_DELAYS_MS`) — failed webhooks persisted to DB via `prisma.failedWebhook.create`
- Fire-and-forget DB operations use `.catch((e) => console.error(...))` — never swallow silently

**Stream Error Pattern (chat route):**
```typescript
try {
  // streaming logic
} catch (err) {
  console.error(`[chat] ❌ ERROR after ${Date.now() - t0}ms:`, err)
  send({ type: 'error', message: "I'm having trouble right now. Please try again in a moment." })
} finally {
  clearTimeout(timeoutId)
}
```

**Repository/Service Pattern:**
- Return `null` for not-found: `return project ? toProjectCard(project) : null`
- External service timeouts use `Promise.race` with `setTimeout` returning `null`
- Errors in non-critical paths (cache writes, analytics) are silently caught: `.catch(() => {})`

## Logging

**Framework:** `console` (no structured logger library)

**Patterns:**
- Prefix with bracketed module tag: `[chat]`, `[repo]`, `[lead]`, `[mw]`
- Success / info: `console.log`
- Warnings (expected failures): `console.warn`
- Errors (unexpected): `console.error`
- Log entry format: `[module] action key=value key=value` — e.g. `[chat] ▶ user="..." session=abc uid=xyz`
- Truncate user-provided strings to avoid log bloat: `.slice(0, 120)`, `.slice(0, 8)` for IDs

## Comments

**When to Comment:**
- JSDoc/TSDoc on all exported pure functions — `@param` and description
- Inline comments explain non-obvious math or business rule reasoning
- Magic numbers explained: `// Raised from 3 — complex queries can need up to 5 steps`
- Section dividers use `// ── Section Name ────...` (em-dash style)
- `eslint-disable-next-line` comments when `any` is unavoidable at DB/external boundaries

**JSDoc style:**
```typescript
/**
 * Standard EMI formula: P × r × (1+r)^n / ((1+r)^n - 1)
 * @param principal_cr  Loan amount in crores
 * @param annual_rate   Annual interest rate percent (e.g. 8.5)
 */
export function calculateEmi(...): EmiResult { ... }
```

## Function Design

**Size:** Small single-responsibility functions preferred. Pure utility functions (`calculateEmi`, `formatInr`) are 10–30 lines. Larger orchestration functions (route handlers) are acceptable when they coordinate many steps.

**Parameters:** Named parameters via destructuring for objects. Primitive args passed positionally for small pure functions.

**Return Values:**
- Typed return types always declared on exported functions
- `null` used for optional/not-found returns (not `undefined`)
- Async functions return `Promise<T | null>` for nullable results

## Module Design

**Exports:**
- Named exports preferred over default exports
- Barrel re-exports used for backward compatibility: `export { scoreAndRankProjects as rerankProjects }` at module bottom
- Barrel `index.ts` files not used — import directly from module files

**Validation:**
- Zod used at all API boundaries: every route handler defines a `*Schema` and calls `.safeParse(rawBody)`
- No runtime validation on internal function calls between trusted modules

---

*Convention analysis: 2026-06-14*
