Test Suite:

1. Config Module Verification

# Verify env overrides work
export AI_MAIN_MODEL=gpt-4-turbo
export EMI_RATE=9.5
npm run dev
# In chat: check that EMI descriptions use 9.5%, prompts reference gpt-4-turbo in logs
✅ Expected: Config values pick up env overrides, fall back to defaults if unset

---
2. Chip Inventory from Database

Test in chat UI:

1. Start fresh conversation → wait for discovery chips
  - ✅ Chips show "Popular sectors in Noida" group with real project counts from DB
  - ✅ Budget chips reflect actual price quartiles (not hardcoded Under ₹1.5 Cr)
  - ✅ BHK chips match distinct values in DB (if DB has [2, 3, 4, 5], chips show those)
2. Type "Show me 2 BHK in Sector 75"
  - ✅ Confidence chips offered (if budget unknown) come from inventory, not hardcoded list
  - ✅ Sector/budget/BHK chips in clarification match live DB distinct values
3. Verify caching: Make two identical requests within 10 min
  - ✅ First request queries DB
  - ✅ Second request returns cached result (check server logs for cache hit)

---
3. Blocked Builders from Database

Test in chat UI:

1. Search for a project by a blocked builder (e.g., "Supertech")
  - ✅ If builder exists in DB with legal_flag = "court proceedings", AI response discloses it
  - ✅ Prompt mentions builder name + legal fact from DB, not hardcoded text
2. Verify dynamic list:
  - Add a test builder to DB with legal_flag = "test flag"
  - Search for that builder
  - ✅ Chat mentions builder with test flag (proves DB query, not hardcoded list)

---
4. Config Values in Prompts & Tools

Test in chat UI:

1. Ask for EMI calculation: "EMI on ₹1 Cr"
  - ✅ Response uses FINANCIAL.EMI_RATE from config (default 8.75%)
  - ✅ Tenure defaults to FINANCIAL.LOAN_TENURE_YEARS (default 20 years)
  - ✅ Calibration anchor in prompt matches: "₹1Cr @ 8.75% / 20y = ₹88,493/month"
2. Check tool descriptions in LLM logs:
  - ✅ calculate_emi tool description says "defaults to {FINANCIAL.EMI_RATE}%" (not hardcoded 8.75)

---
5. Conversation State & Dynamic Chips

Test in chat UI:

1. DISCOVERY stage (first message):
  - ✅ Chips from getDiscoveryChips(chipInventory) appear (sectors, budgets, BHKs grouped)
2. CLARIFYING stage (one signal known):
  - ✅ Chips from buildClarificationOptions(intent, inventory) use live options
  - ✅ When sector+BHK known but budget missing, budget chips come from inventory.budgetBuckets
3. SEARCHING stage (ready to search):
  - ✅ Chips offered match getDiscoveryChips(chipInventory) (discovery refresh mid-search)
4. RESEARCH stage (results shown):
  - ✅ Chips from getResearchChips() (compare, price trends, builder risk)

---
6. End-to-End Flow

Complete user journey:

1. Chat starts → Discovery chips show top 3 sectors + budgets + BHKs from DB
2. User clicks "Sector 150 (23 projects)"
3. Ask for budget → Clarification chips show budget buckets from quartiles
4. User clicks "₹1.5–2.5 Cr"
5. Ask for BHK → Chips show 2, 3, 4 BHK from DB
6. User selects 3 BHK → Search executes
7. Results shown → Research chips (compare, trends, builder)
8. User compares 2 projects → AI discloses blocked builders + legal flags from DB
✅ Expected: No hardcoded lists, all options reflect live DB state

---
7. Database Queries (Logs Check)

Enable debug logs and verify DB hits:

Look for these queries in server logs:
-- Chip inventory (on first discovery, then cached)
SELECT DISTINCT sector FROM project WHERE city = 'Noida' GROUP BY sector ...
SELECT price_min_cr FROM unit_type WHERE project.city = 'Noida' ...
SELECT DISTINCT bhk FROM unit_type WHERE project.city = 'Noida' ...

-- Blocked builders (on each chat turn)
SELECT name, legal_flag FROM builder WHERE legal_flag IS NOT NULL
✅ Expected: Queries run, cache hits on repeated requests (no re-query within 10 min)

---
8. TypeScript & Build

npx tsc --noEmit
✅ Expected: No errors, all imports resolve

---
Failure Modes to Watch

┌───────────────────────────────────┬───────────────────────────────────┬───────────────────────────────────────────────┐
│              Symptom              │            Root Cause             │                      Fix                      │
├───────────────────────────────────┼───────────────────────────────────┼───────────────────────────────────────────────┤
│ "Cannot find module 'config'"     │ Import path wrong in file         │ Check import { MODELS } from '../config'      │
├───────────────────────────────────┼───────────────────────────────────┼───────────────────────────────────────────────┤
│ Chips still hardcoded (e.g.,      │ getChipInventory not called in    │ Verify line 411-580 in chat.ts loads and      │
│ "Sector 150")                     │ chat.ts                           │ passes inventory                              │
├───────────────────────────────────┼───────────────────────────────────┼───────────────────────────────────────────────┤
│ EMI still shows 8.75 not env      │ Env var not set or not picked up  │ Export EMI_RATE=9.5 before npm run dev        │
│ override                          │                                   │                                               │
├───────────────────────────────────┼───────────────────────────────────┼───────────────────────────────────────────────┤
│ Blocked builders not shown        │ Prisma query returns empty        │ Check DB has builder with non-null legal_flag │
├───────────────────────────────────┼───────────────────────────────────┼───────────────────────────────────────────────┤
│ Cache not working (query every    │ invalidateChipCache called        │ Search code for cache invalidation calls      │
│ request)                          │ prematurely                       │                                               │
└───────────────────────────────────┴───────────────────────────────────┴───────────────────────────────────────────────┘

---
Sign-Off Criteria (Phase 4 Complete)

- [ ] TypeScript clean (npx tsc --noEmit)
- [ ] Discovery chips show real sector counts + budget quartiles + distinct BHKs
- [ ] Blocked builders injected from DB (not hardcoded list)
- [ ] Config values (EMI, tenure, models) wire through (testable via env override)
- [ ] Conversation state passes inventory to all computeConversationState calls
- [ ] Caching works: second request within 10 min returns cached inventory
- [ ] E2E flow: user → discovery chip → clarification chips → search → results → builder disclosure (all data-driven)
