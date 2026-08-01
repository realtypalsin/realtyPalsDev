# Test Suite Setup & Execution

## Quick Start

### Run All Tests Locally
```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test

# E2E tests (requires running dev server)
cd frontend
npm run dev &           # Start dev server in background
npx playwright test     # Run all E2E tests
```

### Run CI Locally
```bash
# Simulate full CI pipeline
npm run check-all      # Frontend: typecheck, lint, build
cd backend && npm run check-all  # Backend: lint, typecheck
cd backend && npm test           # Backend unit tests
cd frontend && npm test          # Frontend unit tests
```

---

## Test Suites (Phase G)

### Backend (7 test files)
| Test File | Tests | Focus |
|-----------|-------|-------|
| `guardrails.test.ts` | 12 | Prompt injection, RERA hallu., price/name fabrication |
| `conversationEngine.test.ts` | 17 | Stage transitions, chip cap ≤4, dedup, stable IDs |
| `confidence.test.ts` | 12 | Confidence scoring (HIGH/MEDIUM/LOW) |
| `scoring.test.ts` | 10 | Project ranking, budget penalties |
| `calculators.test.ts` | 21 | EMI, GST, stamp duty math |
| `adminAuth.test.ts` | 15 | Session mgmt, Bearer tokens, fallback |
| `chat.test.ts` | 14 | SSE, rate-limit, IDOR, fallback, cache logic |

### Frontend (3 extended files)
| Test File | New Tests | Focus |
|-----------|-----------|-------|
| `MessageBubble.test.tsx` | 8 | Chips cap 4, dedup, a11y, no-lying-chip |
| `ProjectDetailPanel.test.tsx` | — | Existing (tabs, payment load, no G+26) |
| `Sidebar.test.tsx` | 6 | Identity display, login/logout, IDOR |

### E2E (2 test files)
| Test File | Tests | Focus |
|-----------|-------|-------|
| `buyer-flow.test.ts` | 13 | Full chat flow, non-repeating chips, no fake success |
| `admin-flow.test.ts` | 11 | Admin workflow, session invalidation, rate limiting |

---

## CI/CD Integration

**File**: `.github/workflows/test.yml`

Runs on every push to `main`/`develop` and PRs.

**Services**:
- PostgreSQL 15 (for backend integration tests)
- Redis 7 (for session/cache tests)

**Jobs**:
1. **test** — unit tests + build (30 min timeout)
2. **e2e** — Playwright tests (45 min timeout)
3. **coverage-gate** — validates safety path coverage

---

## Safety Paths Tested

| Path | Test | Coverage |
|------|------|----------|
| **Input validation** | `guardrails.test.ts` | Prompt injection, DAN, roleplay, PII |
| **RERA fact-checking** | `guardrails.test.ts` | Hallucination detection, valid RERA validation |
| **Price fabrication guard** | `guardrails.test.ts` | Out-of-range price detection |
| **Name fabrication guard** | `guardrails.test.ts` | Unknown project names detected |
| **Stage transitions** | `conversationEngine.test.ts` | All 7 stages (DISCOVERY → DECIDING) |
| **Chip cap (≤4)** | `conversationEngine.test.ts` + `MessageBubble.test.tsx` | Never >4 chips per turn |
| **Chip deduplication** | `conversationEngine.test.ts` + `MessageBubble.test.tsx` | No duplicate labels |
| **Stable chip IDs** | `conversationEngine.test.ts` | Same intent → same IDs (C1) |
| **No hardcoded lifestyle** | `conversationEngine.test.ts` + `MessageBubble.test.tsx` | Dynamic data only (C4) |
| **Confidence scoring** | `confidence.test.ts` | HIGH/MEDIUM/LOW levels correct |
| **Project ranking** | `scoring.test.ts` | Budget penalties, score bounds |
| **Money math** | `calculators.test.ts` | EMI/GST/stamp duty formulas |
| **Admin auth** | `adminAuth.test.ts` | Session tokens, Bearer format |
| **Rate limiting** | `chat.test.ts` + `admin-flow.test.ts` | Global 100/60s, admin 5/15min |
| **IDOR protection** | `chat.test.ts` + `Sidebar.test.tsx` | User session ownership |
| **Cache reuse logic** | `chat.test.ts` | Sector/project/BHK invalidation |
| **SSE streaming** | `chat.test.ts` | Server-Sent Events content-type |
| **Groq fallback** | `chat.test.ts` | Fallback suffix applied |
| **Empty stream guard** | `chat.test.ts` | No null/empty responses |
| **Non-repeating chips** | `buyer-flow.test.ts` | Chips never repeat in history |
| **No fake success UX** | `buyer-flow.test.ts` | Submission validation, loading states |
| **Session invalidation** | `admin-flow.test.ts` | Logout destroys session |

---

## Test Framework Details

### Backend
- **Framework**: Node.js built-in `test` module (no external framework)
- **Assertions**: `node:assert/strict`
- **Run**: `npm test` → `node --require tsx/cjs --test src/lib/**/__tests__/*.test.ts`

### Frontend
- **Framework**: Jest
- **Testing Library**: @testing-library/react
- **Run**: `npm test` → Jest with jsdom

### E2E
- **Framework**: Playwright
- **Browser**: Chromium (headless)
- **Timeout**: 30s per test
- **Report**: HTML report in `playwright-report/`

---

## Debugging Tests

### Backend
```bash
# Run single test file
node --require tsx/cjs --test src/lib/ai/__tests__/guardrails.test.ts

# With debug output
NODE_DEBUG=* npm test
```

### Frontend
```bash
# Run single test file
npm test -- MessageBubble.test.tsx

# Watch mode
npm test -- --watch

# Interactive UI
npm test -- --testUI
```

### E2E
```bash
# Run single test file
npx playwright test e2e/buyer-flow.test.ts

# Debug mode (inspector)
npx playwright test --debug

# Headed mode (see browser)
npx playwright test --headed

# Single browser
npx playwright test --project=chromium
```

---

## Test Data & Mocks

### Backend
- **Mock DB**: Mocks in test files (no real Prisma calls)
- **Mock Redis**: In-memory fallback tested separately
- **Mock AI**: Test data, no actual OpenAI/Groq calls

### Frontend
- **Mock Next.js Image**: Standard test mock
- **Mock Router/Navigation**: jest.mock('next/navigation')
- **Mock Analytics**: Track function mocked, no real events

### E2E
- **Test Server**: Running `npm run dev` on localhost:3000
- **Test Data**: Uses real DB (test environment)
- **Admin Password**: `ADMIN_PASSWORD` env var

---

## CI/CD Debugging

### View Test Logs
1. Go to GitHub repo
2. Click **Actions** tab
3. Click failed workflow
4. Click job name to see logs

### Re-run Failed Tests
```bash
# Locally simulate CI
npm install
npm run check-all       # frontend
cd backend && npm run check-all && npm test
```

### Upload Coverage Reports
```bash
# Manual upload (CI does this automatically)
npx codecov --files ./frontend/coverage/coverage-final.json
```

---

## Performance Notes

- **Backend tests**: ~15-30s (network/DB mocked)
- **Frontend tests**: ~10-20s (Jest with jsdom)
- **E2E tests**: ~45s per scenario (browser initialization)
- **Full CI**: ~15 min (parallel jobs where possible)

---

## Next Steps

1. **Add more integration tests** if database queries become complex
2. **Add performance tests** if chat response time becomes critical
3. **Add visual regression tests** (Playwright Snapshots) for UI changes
4. **Add mutation tests** (stryker) to validate test quality

---

## Troubleshooting

### Backend tests fail: "Cannot find module"
```bash
cd backend
npm ci
npm run db:generate  # Regenerate Prisma types
npm test
```

### Frontend tests fail: "Cannot find module @/"
```bash
cd frontend
npm ci
npm test
```

### E2E tests fail: "Connection refused"
```bash
# Ensure dev server is running
cd frontend
npm run dev
# In another terminal:
npx playwright test e2e/
```

### Rate limit test fails
- Check Redis is running: `redis-cli ping`
- Check PostgreSQL is running: `psql $DATABASE_URL`

---

## Test Coverage Report

To view coverage:
```bash
# Frontend
cd frontend && npm test -- --coverage

# Backend
cd backend && npm test -- --coverage
```

Reports generate in:
- Frontend: `frontend/coverage/`
- Backend: `backend/coverage/`

View HTML report:
```bash
open ./frontend/coverage/lcov-report/index.html
open ./backend/coverage/lcov-report/index.html
```

---

## Questions?

See `.claude/TEST_INVENTORY.md` for full test details, coverage summary, and safety path validation.
