# Testing Patterns

**Analysis Date:** 2026-06-14

## Test Framework

**Runner:**
- Jest 30.x
- Config: `frontend/jest.config.js`
- Uses `next/jest` wrapper for Next.js environment support

**Assertion Library:**
- Jest built-in (`expect`, `toBe`, `toBeGreaterThan`, etc.)
- `@testing-library/jest-dom` 6.x installed (DOM matchers available)
- `@testing-library/react` 16.x installed (component testing available)

**Test Environment:**
- `jest-environment-jsdom` — DOM environment for all tests

**Run Commands:**
```bash
cd frontend && npm test              # Run all tests
cd frontend && npm run test:watch    # Watch mode
# Coverage: no dedicated script — run manually:
cd frontend && npx jest --coverage
```

## Test File Organization

**Location:**
- Centralized in `frontend/__tests__/` directory (not co-located with source)

**Naming:**
- Pattern: `{module-name}.test.ts` or `{module-name}.test.tsx`
- Current file: `frontend/__tests__/calculators.test.ts`

**Structure:**
```
frontend/
└── __tests__/
    └── calculators.test.ts    # Tests for lib/calculators.ts
```

## Test Structure

**Suite Organization:**
```typescript
describe('calculateEmi', () => {
  it('computes correct EMI for 1Cr at 8.5% for 20 years', () => {
    const r = calculateEmi(1, 8.5, 20)
    expect(r.emi_monthly).toBeGreaterThan(85000)
    expect(r.emi_monthly).toBeLessThan(88000)
    expect(r.tenure_months).toBe(240)
    expect(r.principal).toBe(10000000)
  })

  it('total_payment = principal + interest', () => {
    const r = calculateEmi(2, 9, 25)
    expect(r.total_interest).toBeGreaterThan(0)
    expect(r.total_payment).toBe(r.principal + r.total_interest)
  })
})
```

**Patterns:**
- No `beforeEach`/`afterEach` setup — pure functions require no setup/teardown
- Test description names are human-readable sentences describing the business rule
- Multiple assertions per test when verifying a single result object
- Edge case tests included: zero interest rate, missing optional parameters

## Mocking

**Framework:** Jest built-in (`jest.fn()`, `jest.mock()`)

**Current usage:** No mocks present in existing tests — all tested functions are pure (no external deps).

**Installed but not yet used:**
- `@testing-library/user-event` 14.x — for simulating user interactions in component tests
- `@testing-library/react` — for rendering and querying React components

**Expected mock patterns for future tests:**
```typescript
// Mocking Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    project: { findMany: jest.fn(), findUnique: jest.fn() },
    chatSession: { create: jest.fn(), findUnique: jest.fn() },
  },
}))

// Mocking Redis
jest.mock('@/lib/redis', () => ({
  getCached: jest.fn().mockResolvedValue(null),
  setCached: jest.fn().mockResolvedValue(undefined),
  makeKey: jest.fn((...parts: string[]) => parts.join(':')),
}))
```

**What to Mock:**
- Prisma client in repository/service tests
- Redis cache functions
- External HTTP calls (`fetch`, `tavilySearch`, `jinaRead`)
- `process.env` values in environment-dependent tests

**What NOT to Mock:**
- Pure calculation functions (`calculateEmi`, `calculateStampDuty`, `calculateGst`, `formatInr`)
- Pure data transformation functions (`toProjectCard`, `scoreProject`)
- Type utilities

## Fixtures and Factories

**Test Data:**
- Inline values passed directly as function arguments — no factory pattern yet
- Numeric inputs in domain units (crores) matching real-world values

Example from `calculators.test.ts`:
```typescript
const r = calculateEmi(1, 8.5, 20)      // 1Cr principal, 8.5% rate, 20yr
const r = calculateStampDuty(2, 'male') // 2Cr property, male buyer
const r = calculateGst(0.4, 'under_construction', 85) // 40L, UC, 85sqm
```

**Location:**
- No separate fixtures directory exists — test data is inline
- Seed data in `frontend/prisma/seed.ts` and `frontend/prisma/data/seed-data.ts` (not used by tests)

## Coverage

**Requirements:** None enforced — no coverage threshold configured in `jest.config.js`

**View Coverage:**
```bash
cd frontend && npx jest --coverage
```

## Test Types

**Unit Tests:**
- Scope: Pure library functions (calculators, formatters)
- Location: `frontend/__tests__/`
- Approach: Call function with known input, assert on output shape and values

**Integration Tests:**
- Not present — no test files for route handlers, repositories, or AI pipeline

**E2E Tests:**
- Not configured — no Playwright, Cypress, or similar tool installed

**Component Tests:**
- Not present — `@testing-library/react` is installed but no `.test.tsx` files exist

## Current Test Coverage Gaps

The test suite is minimal. Only `lib/calculators.ts` is tested. The following are untested:

- `frontend/lib/repositories/projectRepository.ts` — core search, scoring, ranking logic
- `frontend/app/api/v1/chat/route.ts` — entire AI chat pipeline
- `frontend/middleware.ts` — admin auth and session validation
- `frontend/lib/leadNotify.ts` — webhook retry and DB fallback logic
- `frontend/lib/redis.ts` — cache helpers
- All React components in `frontend/components/`

## Common Patterns

**Async Testing:**
```typescript
// Not yet used — future pattern for repository tests:
it('returns null for missing project', async () => {
  (prisma.project.findUnique as jest.Mock).mockResolvedValue(null)
  const result = await getProjectBySlug('nonexistent')
  expect(result).toBeNull()
})
```

**Error Testing:**
```typescript
// Existing pattern — testing boundary/edge inputs:
it('handles 0% rate — no interest charged', () => {
  const r = calculateEmi(1, 0, 10)
  expect(r.total_interest).toBe(0)
})

it('defaults to male if gender omitted', () => {
  const r = calculateStampDuty(1)
  expect(r.stamp_duty_rate).toBe(7)
})
```

---

*Testing analysis: 2026-06-14*
