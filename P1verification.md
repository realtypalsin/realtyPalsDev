REVIEW GUIDE: How to Verify Phase 1

A. Typecheck Both Workspaces

# Backend
cd backend && npx tsc --noEmit

# Frontend
cd frontend && npx tsc --noEmit
Expect: Zero errors. If errors appear, they're pre-existing (unused vars like trackConversion, needsPurposeClarification).

B. Unit Tests (Optional, no new tests yet)

# Backend intent extraction (only real test suite)
npm test -w backend

# Frontend calculators + components
npm test -w frontend
Expect: Both pass (or skip if missing test runtime setup).

C. Security Fixes Verification (Manual Curl Tests)

B.1 IDOR: Builder Leads (1.1)

# Issue: any builder could edit any lead
# Fix: Added owner check
curl -X PATCH \
  http://localhost:3002/api/builder/leads/{lead-id} \
  -H "Authorization: Bearer <builder-B-token>" \
  -H "Content-Type: application/json" \
  -d '{"status":"converted"}' \
# Expected: 403 Forbidden if lead belongs to builder-A, not builder-B

B.2 IDOR: Builder News (1.2)

curl -X DELETE http://localhost:3002/api/builder/news/{news-id-from-builder-a} \
  -H "Authorization: Bearer <builder-b-token>"
# Expected: 403 Forbidden

B.3 Fail-Open Admin (1.3)

# Set env ADMIN_USER_IDS="" (empty)
# Try any admin-only endpoint
curl http://localhost:3002/api/v1/admin/xyz
# Expected: 401/403 (not 200)

B.4 Rate Limit: Builder Register (1.9)

# Submit 5 registrations rapidly from same IP
for i in {1..6}; do
  curl -X POST http://localhost:3001/api/v1/builder-registration \
    -H "Content-Type: application/json" \
    -d '{...valid payload...}'
  # Expected: items 1-5 return 201, item 6 returns 429
done

D. Functional Fixes Verification

D.1 Sector Disambiguation (1.4)

# Chat query: "show me sector 10"
# Expected: clarification chips from sectorDisambiguation, not empty results
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "show me sector 10",
    "sessionId": "..."
  }'
# Should return blocks with ambiguity chips mentioning multiple sectors

D.2 Enum Case Fixes (1.5)

# SQL: select distinct status from projects;
# Expected output: under_construction, ready_to_move, new_launch (all lowercase)

# API: get a ready_to_move project, check ranking boost in discovery results
curl "http://localhost:3001/api/chat?sector=10&status=ready_to_move"
# Ready-to-move projects should rank higher (score boost at scoring.ts:302)

# Check sector connectivity: query a sector with metro, roads, landmarks
# Expected: metroStations, keyRoads, nearbyLandmarks arrays non-empty

D.3 Groq Fallback (1.6)

# Simulate OpenAI failure by setting OPENAI_API_KEY="" or invalid
# Send chat query, expect fallback to Groq
# Expected: response completes via Groq (not crash with GroqStreamStallError)

D.4 GATHERING Loop (1.7)

# Multi-turn chat: ask budget ambiguous question 3 times
# Expected: NO hardcoded budgetMax: 1.5, bhk: [3] injected
# Should see clarification chips instead

D.5 Logo Upload 413 Fix (1.8)

# Upload 2MB base64 logo via builder registration form
# Previously would return 413; now should succeed
curl -X POST http://localhost:3001/api/v1/builder-registration \
  -d '{...base64 logo ~2MB...}'
# Expected: 201 success

E. Data Sanity Checks (SQL)

E.1 Enum Values Correct

SELECT DISTINCT status FROM projects;
-- Expected: only under_construction, ready_to_move, new_launch

SELECT DISTINCT type FROM connectivity;
-- Expected: metro, road, expressway, school, hospital, mall, landmark (no HIGHWAY, METRO, etc)

E.2 Sector/City Format

SELECT DISTINCT sector FROM projects LIMIT 5;
-- Expected: "Sector N" format (not bare "10", not "Sector 10 City Name")

SELECT DISTINCT city FROM projects;
-- Expected: normalized {Noida, Greater Noida, Greater Noida West} only

---
F. End-to-End Chat Test

1. Start new chat session
2. Test ambiguous query: "Show me Sector 10"
  - Expected: Clarification chips ("Sector 10 Noida", "Sector 10 Greater Noida West") NOT empty results
3. Select a sector
  - Expected: Project list with no fabricated Elite-X data, enum cases correct
4. Open project detail → Analysis tab
  - Expected: No "2100+ units" Elite-X text (fix deferred to Phase 2)

---
✅ When All Tests Pass

Mark Phase 1 complete. Then proceed to Phase 2: Kill Fabrication (IntelligenceTab/LocationTab/guardrail).

Any failures? Report exact error + curl output; I'll debug live.


VERIFICATION GUIDE: Phase 1 Security + Correctness Hotfixes

A. Code Review Checklist (Read-Only)

1.1 IDOR: Builder Leads

File: frontend/app/api/builder/leads/[id]/route.ts:30-37
Check:
grep -A 10 "params.id" frontend/app/api/builder/leads/[id]/route.ts | grep -E "builder_id|findFirst"
Expected: Line mentions builder_id in where clause; calls findFirst w/ user ID scope

1.2 IDOR: Builder News

File: frontend/app/api/builder/news/[id]/route.ts (PATCH line ~13, DELETE line ~45)
Check:
grep -B 2 -A 5 "existingNews\|builder_id" frontend/app/api/builder/news/[id]/route.ts | head -20
Expected: Both handlers load account via user, check existingNews.builder_id === account.builder_id

1.3 Fail-Open Admin

File: frontend/lib/auth.ts:62
Check:
grep -A 2 "ADMIN_USER_IDS.length" frontend/lib/auth.ts
Expected: if (ADMIN_USER_IDS.length === 0) { return null } (fails closed on empty list)

1.4 Sector Disambiguation

File: backend/src/routes/chat.ts:298, ~503-533
Check:
grep "sectorDisambiguation" backend/src/routes/chat.ts | head -3
Expected: Assignment to discoveryResult.sectorDisambiguation + returns in response blocks

1.5 Enum Case Fixes

Files: backend/src/lib/discovery/scoring.ts:302, sectors.ts:34,39,46
Check:
grep "ready_to_move\|'metro'\|'road'" backend/src/lib/discovery/{scoring,sectors}.ts
Expected: All lowercase enum values (no READY_TO_MOVE, METRO, HOSPITAL)

1.6 Groq Fallback Error Handling

File: backend/src/routes/chat.ts:676, GroqStreamStallError import
Check:
grep -B 2 "GroqStreamStallError" backend/src/routes/chat.ts | head -5
Expected: Import statement + try/catch wrapping Groq call

1.7 GATHERING Loop Fix

File: backend/src/routes/chat.ts:384
Check:
grep -A 3 "GATHERING" backend/src/routes/chat.ts | grep -v "budgetMax\|bhk: \[3\]"
Expected: NO hardcoded budget/bhk injection; falls through to clarification chips

1.8 Logo Upload Size

File: backend/src/index.ts:59
Check:
grep "express.json" backend/src/index.ts
Expected: express.json({ limit: '5mb' })

1.9 Rate Limiting

File: backend/src/routes/builderRegistration.ts:78-88
Check:
grep -B 2 -A 5 "checkRateLimit" backend/src/routes/builderRegistration.ts | head -10
Expected: Rate limit check keyed by IP, returns 429 if exceeded

1.10 Upload Validation

File: backend/src/routes/builderRegistration.ts:uploadLogoToSupabase()
Check:
grep -E "ALLOWED_EXTS|MAX_SIZE_BYTES|sanitized" backend/src/routes/builderRegistration.ts
Expected: Ext allowlist (png/jpg/jpeg/svg/webp), 2MB byte check, sanitized filename

1.11 Admin API Endpoints

Files: backend/src/routes/admin.ts:111 (leads), ~150 (news)
Check:
grep -E "router.get\('\/leads|router.get\('\/news" backend/src/routes/admin.ts
Expected: Both GET endpoints exist, return paginated results w/ pagination

1.12 Booking Amount %

File: frontend/components/property-detail/ProjectPricingTab.tsx:109
Check:
grep -A 2 "firstMilestone.pct\|bookingAmtPct" frontend/components/property-detail/ProjectPricingTab.tsx
Expected: Derived from first milestone pct, null if missing; StatCard rendered conditionally

1.13 Backend Port

Files: frontend/lib/backend-api.ts:8, components/BuilderRegistrationForm.tsx:81
Check:
grep "NEXT_PUBLIC_BACKEND_URL\|localhost:300" frontend/lib/backend-api.ts frontend/components/BuilderRegistrationForm.tsx | grep -v node_modules
Expected: Both use NEXT_PUBLIC_BACKEND_URL w/ default localhost:3001 (not 3002)

---
B. Runtime Verification Tests

B.1 IDOR Protection (Manual Test)

# Need: 2 builder accounts (A, B) with leads assigned to A

# Attempt: Builder B tries to update Builder A's lead
curl -X PATCH http://localhost:3002/api/builder/leads/{A-lead-id} \
  -H "Authorization: Bearer <B-token>" \
  -H "Content-Type: application/json" \
  -d '{"status":"converted"}'

# Expected: 403 Forbidden

B.2 Rate Limit

# Send 6 registrations rapidly from same IP
for i in {1..6}; do
  curl -X POST http://localhost:3001/api/v1/builder-registration \
    -H "Content-Type: application/json" \
    -d '{...valid payload...}'
  sleep 0.2
done

# Expected: items 1-5 return 201, item 6 returns 429

B.3 Logo Upload (2MB Base64)

# Create 2MB base64 png (or use existing test image)
base64_2mb=$(cat test-logo-2mb.png | base64)

curl -X POST http://localhost:3001/api/v1/builder-registration \
  -H "Content-Type: application/json" \
  -d "{\"logo_url\":\"data:image/png;base64,$base64_2mb\",...}"

# Expected: 201 (previously would return 413)

B.4 Sector Disambiguation

# Send chat query with ambiguous sector
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"show me sector 10","sessionId":"..."}'

# Expected: response includes clarification chips (sector10_noida, sector10_gnw, etc)

B.5 Enum Cases

-- Verify DB enum values are lowercase
SELECT DISTINCT status FROM projects LIMIT 5;
-- Expected: under_construction, ready_to_move, new_launch

SELECT DISTINCT type FROM connectivity LIMIT 5;
-- Expected: metro, road, expressway, school, hospital, mall, landmark

B.6 Admin Endpoints Exist

# Verify endpoints respond (auth required on prod)
curl http://localhost:3001/api/v1/admin/leads
curl http://localhost:3001/api/v1/admin/news

# Expected: 200 (or 401 if auth required) + JSON response

B.7 Payment Plan Booking %

# Open a project detail in UI with payment plan
# Check ProjectPricingTab: "Booking Amount" card should show first milestone %
# or be hidden if no milestones

# Expected: No undefined/null display, clean render

---
