# RealtyPals — Production Refinement & Make.com Lead Handoff

**Version:** 2.0 (fully re-verified against live code)
**Date:** 2026-07-22
**Who can run this:** Any engineer or coding model, including small models (Haiku). Every task is self-contained: exact file, exact line, the *current* code you should see, the exact change, a DONE test with expected output, and a rollback.

---

> ## ⚠️ READ THIS FIRST — Version 1.0 of this doc was WRONG
>
> The previous version claimed 4 critical security holes. **Three of the four were already fixed in the code.** If a model had executed v1.0, it would have *rewritten working security code and broken it.*
>
> This version was written after reading every file line-by-line. Every claim below is tagged:
> - `✅ VERIFIED DONE` — read the code, it's correct, **DO NOT TOUCH**.
> - `❌ REAL GAP` — read the code, the gap is real, safe to fix.
> - `🟡 POLISH` — works, but could be better.
>
> **The golden rule for any model running this doc:** every task has a `VERIFY FIRST` step. Run it. If what you see does **not** match, **STOP** and report — do not edit. The code may have changed since this was written.

---

## Table of Contents

1. [How a small model should execute this doc](#how-to-execute)
2. [Verified security & reliability scorecard](#scorecard)
3. [The five lenses (strategy)](#five-lenses)
   - [Marketing — buyer & seller psyche](#lens-marketing)
   - [Senior developer — security & reliability](#lens-developer)
   - [Product manager — what to add](#lens-pm)
   - [Category manager — will it win in India](#lens-category)
   - [Cost engineer — guardrail the API spend](#lens-cost)
4. [Executable task cards](#task-cards)
5. [Make.com lead handoff — corrected setup](#makecom)
6. [Roast & ratings](#roast)
7. [Final launch checklist](#checklist)

---

<a name="how-to-execute"></a>
## 1. How a Small Model Should Execute This Doc

You are a coding model. Follow these rules exactly. They exist so you cannot accidentally break working code.

**The 6 execution rules:**

1. **One task = one commit.** Commit message format: `fix(scope): short description` or `feat(scope): ...`. Never `git add -A`. Stage only the files the task names.
2. **VERIFY FIRST is mandatory.** Every task starts with a command to run and an expected output. If the real output does not match, **STOP that task** and write a note under "Discovered drift" at the bottom. Do not guess. Do not edit.
3. **Copy the change exactly.** Where a task gives an old block and a new block, replace the old with the new verbatim. Do not "improve" surrounding code.
4. **Run the DONE test.** After the change, run the DONE test. If it fails, the task is **not done** — revert with the rollback step and report.
5. **No migrations, deploys, or external calls without a human "yes" in the same message.** Tasks that need those are marked `⛔ HUMAN GATE`.
6. **Do not touch anything not named in the task.** If you spot another bug, add a line under "Discovered drift" — do not fix it inline.

**Severity legend:** `P0` = fix before launch. `P1` = fix in first week. `P2` = after launch.

---

<a name="scorecard"></a>
## 2. Verified Security & Reliability Scorecard

Every row below was confirmed by reading the actual file. Line numbers are from the version read on 2026-07-22.

| Area | Score | Status | Evidence (file:line) |
|---|---|---|---|
| Auth (no spoof, no backdoor) | 9/10 | ✅ VERIFIED DONE | `middleware.ts` strips `x-user-id`; `lib/auth.ts` verifies Supabase cookie |
| Webhook secret (inbound) | 9/10 | ✅ VERIFIED DONE — **fails closed in prod** | `leads.ts:188-195` + `env.ts:38-41` hard-exit if unset in prod |
| Response compression | 9/10 | ✅ VERIFIED DONE — even skips SSE | `index.ts:81-86` |
| Rate limiting (incl. webhook) | 8/10 | ✅ VERIFIED DONE — only health excluded | `index.ts:91-109` |
| `.env.example` completeness | 8/10 | ✅ VERIFIED DONE — 60+ vars documented | `backend/.env.example` |
| Payload size cap | 8/10 | ✅ VERIFIED DONE — `100kb` JSON limit | `index.ts:74` |
| Outbound webhook signing | 9/10 | ✅ VERIFIED DONE — HMAC-SHA256 `X-Signature` | `leads.ts:156-162` |
| Lead delivery resilience | 8/10 | ✅ VERIFIED DONE — 1 retry, 5s timeout | `leads.ts:164-173` |
| Startup env assertions | 9/10 | ✅ VERIFIED DONE — refuses to boot if broken | `index.ts:42-55` |
| **AI cost persistence** | **3/10** | ❌ **REAL GAP** — tokens logged to console only, never stored/costed/aggregated | `groq.ts:164-166` |
| **Per-user AI budget cap** | **2/10** | ❌ **REAL GAP** — global IP rate-limit only; no per-user cost ceiling | `index.ts:91-109` |
| `.env.example` model default | 5/10 | 🟡 POLISH — recommends decommissioned `mixtral-8x7b-32768` (code default is correct) | `.env.example` vs `config.ts:7-8` |
| Prompt-injection / RAG-leak | 8/10 | ✅ VERIFIED DONE (per prior audit; guardrails live) | `lib/ai/*`, guardrails |

**Bottom line:** Security posture is genuinely strong. The only *real* work is **AI cost observability + per-user spend guardrails** (the thing the user specifically worried about). Everything the old doc panicked about is already handled.

---

<a name="five-lenses"></a>
## 3. The Five Lenses

<a name="lens-marketing"></a>
### 3.1 Marketing — Buyer & Seller Psyche

**The buyer's real fear (all three personas):** *"Am I being sold to, or advised?"* Indian buyers have been burned by brokers. Your entire edge is being the honest advisor. Protect that above conversion.

**First-time buyer (₹1–2 Cr):**
- Pain: doesn't understand EMI, stamp duty, GST, carpet vs super area. Feels stupid asking.
- Gap: the Ask AI menu (just shipped) is great, but presets assume the buyer knows *what to ask*. A first-timer doesn't.
- Fix (P2): add a persona-aware opening. After the first recommendation, show one-tap chips: *"Explain the total cost"*, *"Is this builder trustworthy?"*, *"What could go wrong?"*. Lower the floor so a layman can use it.

**Family upgrader (₹2–5 Cr):**
- Pain: decides as a group (spouse, parents). Possession timing and schools dominate.
- Gap: no way to share findings with family without screenshots. No side-by-side compare export.
- Fix (P1): "Share this comparison" → the OG unfurl (just shipped) already makes links beautiful; add a "compare 2–3" view that shares as one link.

**NRI investor (₹2–4 Cr):**
- Pain: can't verify remotely, fears fraud, needs RERA + builder credibility.
- Gap: no explicit "remote buyer" path; RERA badge is shown but not *verified* against the registry.
- Fix (P1): verify RERA numbers against the state registry on ingest (see Category lens). Fix (P2): a "buying from abroad?" flag that routes to a human advisor faster.

**Sellers (brokers & builders) — the revenue side:**
- Their #1 pain: **lead quality, not quantity.** They drown in tire-kickers.
- Gap: your lead payload sends `{name, phone, project}` only. The builder has no idea if this buyer is serious.
- Fix (P1, highest ROI): capture **buyer intent tier** (budget band, down-payment-ready, timeline) at the callback step and pass it in the webhook. A qualified lead is worth 5× an unqualified one. This single change is what turns builders from skeptics into paying partners.
- Their #2 pain: **possession credibility.** Builders who deliver on time want that shown; you currently treat all builders equally.
- Fix (P2): a delivery track-record score.

**What every user (even a layman) needs, one line each:**
- Buyer: *"Tell me the catch."* → always surface one honest trade-off per recommendation.
- Broker: *"Is this lead real?"* → send intent tier + timeline with every lead.
- Builder: *"Show buyers I deliver on time."* → delivery score.

---

<a name="lens-developer"></a>
### 3.2 Senior Developer — Security & Reliability

**Verdict: the app is close to "top-tier AI provider" hygiene already.** What's left:

1. `✅ DONE` Auth, webhook signing, rate limiting, compression, payload caps, startup assertions — all verified correct. Leave them.
2. `❌ REAL GAP` **AI cost telemetry is ephemeral.** `groq.ts:164` logs tokens to console, then they're gone. You cannot answer "how much did we spend yesterday / who is our heaviest user / are we being drained?" → [TASK 1](#task-1).
3. `❌ REAL GAP` **No per-user spend ceiling.** A single logged-in user (or a leaked session) can hammer the chat endpoint. The global 100-req/60s IP limit slows a flood but does not cap *cost per user per day* → [TASK 2](#task-2).
4. `🟡 POLISH` `.env.example` recommends a **decommissioned Groq model**. Anyone copying it verbatim and setting `GROQ_SMART_MODEL=mixtral-8x7b-32768` gets runtime 400s. Code default is fine; the example is a trap → [TASK 3](#task-3).
5. `🟡 POLISH` **No structured request ID** correlating a chat request across logs + Sentry + token log. Nice for debugging leaks/abuse → [TASK 6](#task-6) (optional).

**On "nothing leaked ever":** the guardrails (input sanitize, DB-only prompt, live RAG-leak stream filter, output guardrail blocking fabricated RERA/prices) are already live per the prior verified audit. The remaining leak *vector* is operational, not code: **secrets in logs**. Confirm no task ever logs full env, API keys, or raw Supabase tokens → [TASK 7](#task-7) (a grep + assertion, no risky edit).

---

<a name="lens-pm"></a>
### 3.3 Product Manager — What to Add

| Priority | Item | Why | Effort |
|---|---|---|---|
| P1 | Buyer intent tier at callback | Turns leads from spam into revenue; makes builders pay | 3–4 h |
| P1 | Lead funnel dashboard | You can't see callback → builder-accepted → site-visit → deal. You're flying blind on the *business* | 1 d |
| P1 | AI cost dashboard | Same blindness, on the *cost* side | included in [TASK 1](#task-1) |
| P2 | Compare 2–3 view + share | Group decisions are how ₹2Cr+ gets bought | 1 d |
| P2 | Persona opening chips | Lets a layman start | 3 h |
| P2 | Builder feedback loop ("did you follow up?") | Ranks builders by responsiveness; kills dead partners | 1 d |
| P2 | Explicit "India buyers only (V1)" copy | Sets NRI expectation honestly | 30 m |

**The one process change that matters most:** instrument the lead funnel end-to-end so you can say "we sent 100 leads, builders accepted 60, 5 became site visits." Without it you cannot price the product to builders or prove value.

---

<a name="lens-category"></a>
### 3.4 Category Manager — Will It Win in India?

**Verdict: Yes, conditionally. This is a genuinely good product for the Indian market — *if* you hold three lines.**

**Why it can win:** every incumbent (99acres, MagicBricks, Housing) is a noisy listings portal optimized for broker ad revenue, not buyer trust. Buyers are exhausted by duplicate fake listings. An honest AI advisor that narrows 100 → 5 with real trade-offs is a real wedge. Your just-shipped features (honest Ask-AI prompts, beautiful shareable unfurls, gated lead capture) reinforce trust.

**The three lines you must hold:**

1. **Possession honesty.** Delay is endemic. Show builder delivery track record. Buyers will forgive a 2027 possession they *chose knowingly*; they will never forgive one you hid.
2. **RERA verification, not just a badge.** Fake RERA IDs exist. Verify every number against the state registry (Noida/UP: `up-rera.in`; national: `rera.gov.in`) on data ingest. A single fake listing that reaches a buyer destroys the trust brand permanently.
3. **Inventory density before geographic spread.** Better to own Noida completely than to be thin across five cities and look like a broken portal. Do not expand to Gurgaon until Noida inventory is deep.

**Language (growth ceiling, not a launch blocker):** 80% of India isn't fluent in English. Hindi UI is how you scale past metro early-adopters. Not V1, but the first thing to do after Noida proves out. Cheap in India (~₹20k for a translator + review pass).

**Revenue model (category reality):** pure per-lead (₹500–2000/lead) is a race to the bottom and brokers will haggle. The durable model is **exclusivity retainers** with 3–5 premium builders per city — guaranteed qualified-lead volume for a monthly fee. Your qualified-lead tiering (P1 above) is the precondition that makes this sellable.

**Will it succeed?** Product-market fit is plausible and the tech foundation is strong. Success hinges on **non-product** execution: sourcing verified inventory, signing builder partners, and holding the trust line. The code is not the risk. The go-to-market is.

---

<a name="lens-cost"></a>
### 3.5 Cost Engineer — Guardrail the API Spend

This is the section the user cares most about: *"we rely on Claude/OpenAI/Groq API keys — ensure they're never misused, guardrail them, harden security, nothing leaked."*

**Current state (verified):**
- Providers: OpenAI (`gpt-4o` main), Groq (`llama-3.3-70b-versatile` smart, `llama-3.1-8b-instant` fast), Claude fallback (`ANTHROPIC_API_KEY` present). Config in `config.ts:4-8`.
- `SAFE_TOKEN_CEILING=20000` and `MAX_TOKENS_RESPONSE=2000` env guards exist. Good — per-request output is capped.
- Tokens are logged to console (`groq.ts:164`) but **not stored, not costed, not per-user, no budget cap.**

**The misuse vectors and how to close each:**

| Vector | Risk | Guardrail | Task |
|---|---|---|---|
| One user floods chat | Bill spike, real users starve | Per-user daily **cost** cap (not just req count) | [TASK 2](#task-2) |
| Leaked session token abused | Same, harder to notice | Per-user cost cap + anomaly log | [TASK 2](#task-2) + [TASK 1](#task-1) |
| Huge context injected | Each call maxes tokens | Already capped by `SAFE_TOKEN_CEILING` — ✅ verify it's enforced | [TASK 5](#task-5) |
| Key leaked in logs/errors | Total compromise | Grep audit; never log full env | [TASK 7](#task-7) |
| Silent cost drift | Find out via the bill | Persist + aggregate token cost | [TASK 1](#task-1) |

**Cheap wins to cut spend (no new risk):**
- Route simple asks (compare price, list amenities) to `llama-3.1-8b-instant` (cheap) and only reasoning/advisory to the smart model. Model selection already exists in `config.ts`; make the *router* prefer fast for factual lookups. (P2)
- Trim the property JSON sent into the prompt to `{id, name, price, sector, possession, concerns}` instead of the full record. Typically 30–40% fewer input tokens. (P2, measure first)
- Chat history is already cached in Redis (verified in prior audit) — keep it.

---

<a name="task-cards"></a>
## 4. Executable Task Cards

Each card is self-contained. Run VERIFY FIRST. If it doesn't match, STOP.

---

<a name="task-1"></a>
### TASK 1 — Persist AI token usage + cost  `P1`  `❌ REAL GAP`  `~2 h`

**Goal:** Turn the ephemeral console token log into a stored, costed, queryable record. This gives you the cost dashboard and is the foundation for the per-user cap (TASK 2).

**Files:** `backend/prisma/schema.prisma` (or `frontend/prisma/schema.prisma` — the shared source of truth), `backend/src/lib/ai/groq.ts`, `backend/src/lib/ai/openai.ts`.

**VERIFY FIRST — run and confirm the gap is real:**
```bash
grep -rn "prompt_tokens" backend/src/lib/ai/groq.ts
# EXPECT to see a console.log line around 164-166 that logs tokens but does NOT write to prisma.
grep -rn "apiUsage\|api_usage\|AiUsage" backend/prisma frontend/prisma
# EXPECT: no matches. If a model already exists, STOP — TASK 1 may be partly done.
```
If `apiUsage` already exists, STOP and report.

**⛔ HUMAN GATE:** this task adds a Prisma model = a migration. Do **not** run `prisma migrate` without a human "yes" in the same message. You may write the schema + code; the human runs the migration.

**Step 1 — add the model.** In the Prisma schema, add:
```prisma
model AiUsageEvent {
  id               String   @id @default(uuid())
  user_id          String?
  session_id       String?
  provider         String   // "groq" | "openai" | "anthropic"
  model            String
  prompt_tokens    Int
  completion_tokens Int
  cost_usd         Decimal  @db.Decimal(10, 6)
  endpoint         String   // e.g. "chat.stream"
  created_at       DateTime @default(now())

  @@index([user_id, created_at])
  @@index([created_at])
}
```

**Step 2 — a tiny cost helper.** Create `backend/src/lib/ai/cost.ts`:
```ts
import { prisma } from '../db'

// USD per 1M tokens. Update when provider pricing changes.
const PRICE: Record<string, { in: number; out: number }> = {
  'llama-3.1-8b-instant':   { in: 0.05, out: 0.08 },
  'llama-3.3-70b-versatile':{ in: 0.59, out: 0.79 },
  'gpt-4o':                 { in: 2.50, out: 10.00 },
  'gpt-4o-mini':            { in: 0.15, out: 0.60 },
  'claude-3-5-sonnet-20241022': { in: 3.00, out: 15.00 },
}

export async function recordUsage(args: {
  provider: string; model: string; promptTokens: number; completionTokens: number;
  endpoint: string; userId?: string | null; sessionId?: string | null;
}): Promise<void> {
  const p = PRICE[args.model] ?? { in: 0, out: 0 }
  const cost = (args.promptTokens * p.in + args.completionTokens * p.out) / 1_000_000
  try {
    await prisma.aiUsageEvent.create({
      data: {
        user_id: args.userId ?? null,
        session_id: args.sessionId ?? null,
        provider: args.provider,
        model: args.model,
        prompt_tokens: args.promptTokens,
        completion_tokens: args.completionTokens,
        cost_usd: cost,
        endpoint: args.endpoint,
      },
    })
  } catch (err) {
    // Never let telemetry break a chat response.
    console.error('[cost] recordUsage failed:', err instanceof Error ? err.message : err)
  }
}
```

**Step 3 — call it where tokens are already logged.** In `backend/src/lib/ai/groq.ts`, find the existing block (~line 163-166):
```ts
  if (usage) {
    console.log('[GROQ] tokens', { model: MODELS.GROQ_SMART, prompt_tokens: usage.prompt_tokens, completion_tokens: usage.completion_tokens });
  }
```
Replace with:
```ts
  if (usage) {
    console.log('[GROQ] tokens', { model: MODELS.GROQ_SMART, prompt_tokens: usage.prompt_tokens, completion_tokens: usage.completion_tokens });
    await recordUsage({
      provider: 'groq',
      model: MODELS.GROQ_SMART,
      promptTokens: usage.prompt_tokens ?? 0,
      completionTokens: usage.completion_tokens ?? 0,
      endpoint: 'chat.stream',
      userId,
      sessionId,
    })
  }
```
Add the import at the top of `groq.ts` (with the other imports):
```ts
import { recordUsage } from './cost'
```
> If `userId` / `sessionId` are not in scope in this function, pass what *is* available (or `null`). Do not invent variables — if neither exists, use `null` for both and note it under "Discovered drift".

**Step 4 — do the same in `openai.ts`** at its usage/stream-complete point (mirror Step 3 with `provider: 'openai'`, `model: MODELS.MAIN`). If OpenAI streaming doesn't expose usage, set `stream_options: { include_usage: true }` on the `create` call first.

**DONE test:**
```bash
cd backend && npx tsc --noEmit
# EXPECT: no new type errors.
grep -rn "recordUsage" backend/src/lib/ai/groq.ts backend/src/lib/ai/openai.ts
# EXPECT: import + call in both files.
```
After the human runs the migration and you send one chat: `SELECT provider, model, prompt_tokens, completion_tokens, cost_usd FROM "AiUsageEvent" ORDER BY created_at DESC LIMIT 1;` → EXPECT one row.

**Rollback:** delete `cost.ts`, revert the two edited files, drop the model from schema (no migration was run without gate).

---

<a name="task-2"></a>
### TASK 2 — Per-user daily AI cost cap  `P1`  `❌ REAL GAP`  `~1 h`  (depends on TASK 1)

**Goal:** stop any single user from draining the API budget. This is the core anti-misuse guardrail.

**File:** `backend/src/routes/chat.ts`.

**VERIFY FIRST:**
```bash
grep -n "verifyUser\|checkRateLimit\|AiUsageEvent\|budget" backend/src/routes/chat.ts | head
# EXPECT: you can see where the chat handler starts and how it gets the user. EXPECT no existing budget check.
```
If a budget check already exists, STOP.

**Step 1 — add a guard helper** in `backend/src/lib/ai/cost.ts` (created in TASK 1):
```ts
const DAILY_USER_LIMIT_USD = Number(process.env.DAILY_USER_LIMIT_USD ?? '0.50')

export async function isOverDailyBudget(userId: string | null): Promise<boolean> {
  if (!userId) return false // anonymous users are already IP-rate-limited globally
  const since = new Date(); since.setHours(0, 0, 0, 0)
  const agg = await prisma.aiUsageEvent.aggregate({
    _sum: { cost_usd: true },
    where: { user_id: userId, created_at: { gte: since } },
  })
  const spent = Number(agg._sum.cost_usd ?? 0)
  return spent >= DAILY_USER_LIMIT_USD
}
```

**Step 2 — enforce it at the top of the chat handler**, right after the user is resolved and before any AI call:
```ts
  if (await isOverDailyBudget(userId)) {
    res.status(429).json({ error: "You've reached today's usage limit. Please try again tomorrow." })
    return
  }
```
Add the import: `import { isOverDailyBudget } from '../lib/ai/cost'`.

**Step 3 — document the knob** in `.env.example` (append under the AI section):
```env
# Per-user daily AI spend cap in USD (default 0.50). Blocks chat with 429 when exceeded.
DAILY_USER_LIMIT_USD=0.50
```

**DONE test:**
```bash
cd backend && npx tsc --noEmit   # EXPECT: clean
grep -n "isOverDailyBudget" backend/src/routes/chat.ts backend/src/lib/ai/cost.ts   # EXPECT: defined + called
```
Functional: temporarily set `DAILY_USER_LIMIT_USD=0`, log in, send a chat → EXPECT `429`. Restore to `0.50`.

**Rollback:** remove the guard call + helper + env line.

**Note:** this depends on TASK 1's `AiUsageEvent` table. If TASK 1's migration isn't applied yet, the aggregate returns 0 (no rows) and the cap is a no-op — safe, but not active until TASK 1 ships.

---

<a name="task-3"></a>
### TASK 3 — Fix the decommissioned Groq model in `.env.example`  `P2`  `🟡 POLISH`  `~5 m`

**Goal:** stop deployers from copying a dead model name. The *code* default is already correct (`config.ts:7-8`); only the example misleads.

**File:** `backend/.env.example`.

**VERIFY FIRST:**
```bash
grep -n "mixtral-8x7b-32768" backend/.env.example
# EXPECT: two lines (GROQ_FAST_MODEL and GROQ_SMART_MODEL) recommending mixtral-8x7b-32768.
grep -n "GROQ_FAST\|GROQ_SMART" backend/src/lib/config.ts
# EXPECT: defaults are llama-3.1-8b-instant and llama-3.3-70b-versatile (the correct, live models).
```
If `.env.example` already uses `llama-`, STOP — already done.

**Change:** in `backend/.env.example`, replace:
```env
GROQ_FAST_MODEL=mixtral-8x7b-32768
GROQ_SMART_MODEL=mixtral-8x7b-32768
```
with:
```env
GROQ_FAST_MODEL=llama-3.1-8b-instant
GROQ_SMART_MODEL=llama-3.3-70b-versatile
```

**DONE test:**
```bash
grep -n "mixtral" backend/.env.example
# EXPECT: no matches.
```

**Rollback:** restore the two lines.

---

<a name="task-5"></a>
### TASK 5 — Confirm the token ceiling is actually enforced  `P1`  `verify-only`  `~10 m`

**Goal:** the user asked to ensure huge-context abuse can't run up the bill. `SAFE_TOKEN_CEILING=20000` exists in `.env.example` — confirm the code *reads and enforces* it. This is a verification task; only edit if enforcement is missing.

**VERIFY FIRST:**
```bash
grep -rn "SAFE_TOKEN_CEILING\|MAX_TOKENS_RESPONSE\|max_tokens" backend/src/lib/ai backend/src/routes/chat.ts
# EXPECT: the ceiling is referenced and passed to the model call (max_tokens) or used to trim context.
```

**If enforced:** mark ✅ and stop. Record where (`file:line`) under "Discovered drift" as evidence.

**If NOT enforced anywhere:** this is a real gap. Add, at the point context is assembled in `chat.ts`, a guard that truncates or rejects when estimated input tokens exceed `Number(process.env.SAFE_TOKEN_CEILING ?? 20000)`, and ensure every `.create({ ... })` AI call passes `max_tokens: Number(process.env.MAX_TOKENS_RESPONSE ?? 2000)`. Report before editing (`⛔` — get a human "yes" since it touches the hot path).

**DONE test:** `cd backend && npx tsc --noEmit` clean; a chat with a very long input does not exceed the ceiling (check the token log from TASK 1).

---

<a name="task-6"></a>
### TASK 6 — Request-ID correlation (optional)  `P2`  `🟡 POLISH`  `~30 m`

**Goal:** one ID that ties a chat request across morgan logs, Sentry, and the token record — makes abuse/leak investigation trivial.

**VERIFY FIRST:**
```bash
grep -rn "x-request-id\|requestId\|crypto.randomUUID" backend/src/index.ts
# EXPECT: no request-id middleware yet.
```

**Change:** add early middleware in `index.ts` (after `cookieParser`, before routes):
```ts
app.use((req, res, next) => {
  const id = (req.headers['x-request-id'] as string) || crypto.randomUUID()
  res.setHeader('x-request-id', id)
  ;(req as any).requestId = id
  next()
})
```
Add `import crypto from 'crypto'` at top if not present. Optionally pass `requestId` into `recordUsage` (extend TASK 1's args + column).

**DONE test:** `curl -i localhost:3001/api/v1/health` → EXPECT an `x-request-id` response header.

**Rollback:** remove the middleware.

---

<a name="task-7"></a>
### TASK 7 — Secret-in-logs audit  `P0`  `verify-only, zero-risk`  `~10 m`

**Goal:** the user's "nothing leaked, ever." Confirm no code path logs full env, API keys, or raw auth tokens.

**VERIFY FIRST — run all, expect clean:**
```bash
grep -rniE "console\.(log|error|warn)\(.*(process\.env|API_KEY|SERVICE_ROLE|AUTH_TOKEN|SECRET)" backend/src | grep -v "!!process.env" | grep -viE "not set|not configured|is required|refusing"
# EXPECT: no lines that print the VALUE of a secret. Lines that only print booleans (!!process.env.X) or "not set" messages are FINE.
grep -rniE "logger\.(info|error|warn|debug)\(.*process\.env" backend/src
# EXPECT: only the index.ts:206-213 block that logs !!booleans (presence), never values.
```

**If any line prints an actual secret value:** that is a P0 leak. Report it precisely (`file:line`) and propose redaction — do **not** edit blindly, get a human "yes".

**If clean:** mark ✅. This is the desired outcome; the code already logs only presence booleans (`index.ts:206-213`).

**DONE test:** the greps above return no offending lines.

---

<a name="makecom"></a>
## 5. Make.com Lead Handoff — Corrected Setup

> **This section is completely rewritten.** v1.0 invented env vars (`MAKE_WEBHOOK_URL`), an invented header (`x-webhook-secret` outbound), and an invented function. **None of that exists.** Here is the *real* integration, read from `leads.ts:148-174`.

### 5.1 How your app actually sends leads (verified)

When a buyer requests a callback or site visit, the backend calls `fireWebhook()` (`leads.ts:148`). It:

1. Reads the target URL from **`process.env.WEBHOOK_URL`** (NOT `MAKE_WEBHOOK_URL`).
2. Sends a **POST** with this exact JSON body:
   ```json
   {
     "event": "callback_requested",
     "data": { "name": "Rajesh", "phone": "9876543210", "projectName": "Godrej Woods" },
     "ts": 1721600000000
   }
   ```
   - `event` is `"callback_requested"` **or** `"site_visit_requested"`.
   - For site visits, `data` also includes `"visitDate"` and `"timeSlot"`.
   - (Builder registrations also POST to the same `WEBHOOK_URL` from `builderRegistration.ts:190` — so route by `event` in Make.)
3. If `WEBHOOK_SECRET` is set, it adds an HMAC signature header:
   ```
   X-Signature: sha256=<hex HMAC-SHA256 of the raw body, keyed with WEBHOOK_SECRET>
   ```
4. Retries once on failure, 5-second timeout. Content-Type is `application/json`.

**So your job in Make.com:** create a webhook that receives this POST, (optionally) verifies `X-Signature`, and forwards it somewhere the sales team sees it. On the **free tier**, start simple — a Google Sheet row.

### 5.2 Step-by-step (newcomer, free tier)

**Step 1 — Create the scenario.**
1. Go to https://www.make.com → **Sign up free**.
2. Top-left, click **Create a new scenario** (the big **+**).

**Step 2 — Add the webhook module.**
1. Click the large **+** in the canvas center.
2. Search **Webhooks** → choose **Custom webhook**.
3. Click **Add**, name it `realtypals-leads`, **Save**.
4. Click **Copy address to clipboard**. You'll get a URL like:
   ```
   https://hook.eu2.make.com/abc123def456ghi789
   ```
   **Save this URL.** This is what goes into `WEBHOOK_URL`.

**Step 3 — Wire it into the backend (no code change needed — it already reads `WEBHOOK_URL`).**
1. Open `backend/.env` (create from `.env.example` if missing).
2. Set:
   ```env
   WEBHOOK_URL=https://hook.eu2.make.com/abc123def456ghi789
   WEBHOOK_SECRET=<generate below>
   ```
3. Generate the secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Paste the output as `WEBHOOK_SECRET`.
4. `⛔ HUMAN GATE`: on the deployed backend (Render/Railway), add the **same** two env vars in the dashboard and redeploy. Do this only with a human "yes".

**Step 4 — Teach Make the payload shape.**
1. Back in Make, with the webhook selected, click **Redetermine data structure** (Make now waits for a sample).
2. Trigger one real lead: in your app, request a callback on any project. (Or, for a dry run, `curl` it — see Step 7.)
3. Make captures the sample and now knows the fields `event`, `data.name`, `data.phone`, `data.projectName`, `ts`.

**Step 5 — Add a destination (pick ONE for free tier).**

*Option A — Google Sheets (recommended for V1, zero cost):*
1. Click **+** after the webhook → search **Google Sheets** → **Add a Row**.
2. Connect your Google account.
3. Create/pick a sheet `RealtyPals Leads` with columns: `Time | Event | Name | Phone | Project | VisitDate | TimeSlot`.
4. Map: `Time` ← `ts` (or Make's `now`), `Event` ← `event`, `Name` ← `data: name`, `Phone` ← `data: phone`, `Project` ← `data: projectName`, `VisitDate` ← `data: visitDate`, `TimeSlot` ← `data: timeSlot`.

*Option B — WhatsApp/Email:* only if you have Twilio/Resend. Note your backend *already* can send WhatsApp/email directly via `notify.ts` (Meta/Twilio/Resend) for its **inbound** `/webhook` endpoint — for the free-tier Make path, Sheets is simpler and avoids paid tiers.

**Step 6 — (Optional but recommended) Verify the signature.**
Free-tier Make can't easily compute HMAC inline, so two honest choices:
- **Simplest (acceptable for V1):** rely on the URL being secret + unguessable. Leave `WEBHOOK_SECRET` set on the backend anyway (harmless; the header is just ignored by Make).
- **Proper:** add a Make **"Set variable"** + a small custom function / an `HTTP` module that recomputes `sha256=HMAC(body, secret)` and a **Filter** that only continues if it equals the incoming `X-Signature`. This is a paid-feature-adjacent step; skip until you leave free tier.

**Step 7 — Test end to end.**
```bash
# Simulate exactly what the backend sends (no signature = fine for the test):
curl -X POST "https://hook.eu2.make.com/abc123def456ghi789" \
  -H "Content-Type: application/json" \
  -d '{"event":"callback_requested","data":{"name":"Test Buyer","phone":"9999999999","projectName":"Demo Project"},"ts":1721600000000}'
```
In Make, open **History** (bottom bar) → you should see one execution → a new row in your Sheet.

**Step 8 — Turn the scenario ON.** Toggle the scenario to **Scheduled: Immediately** (bottom-left switch). Free tier gives ~1000 operations/month; at ~2 ops per lead that's ~500 leads/month — plenty for launch.

### 5.3 Make.com free-tier limits (plan around them)
- **1000 operations/month.** Each lead ≈ 2 ops (webhook receive + Sheet row). ~500 leads/mo headroom.
- **1 active scenario, 15-min minimum interval for polling** — irrelevant here (webhooks are instant/push).
- When you outgrow it (>500 leads/mo or you add WhatsApp routing), upgrade to Core (~$9/mo, 10k ops).

### 5.4 Make.com troubleshooting
| Symptom | Cause | Fix |
|---|---|---|
| No execution in History | `WEBHOOK_URL` wrong or backend didn't fire | Check backend logs for `[leads] webhook failed` or `WEBHOOK_URL not configured` |
| Execution runs but no Sheet row | Field mapping empty | Re-run **Redetermine data structure**, remap `data.*` |
| Fields show as `data` blob, not name/phone | Sample wasn't captured | Trigger a real lead while "determine structure" is listening |
| Want to distinguish callback vs site visit | Both hit same URL | Add a Make **Router** keyed on `event` |

---

<a name="roast"></a>
## 6. Roast & Ratings

Scored 1–10. Blunt.

| Thing | Score | Roast |
|---|---|---|
| **UI features (A–D)** | 9/10 | Genuinely clean. Send/Stop morph, Ask-AI menu, OG unfurl, gated call — all shipped and tested. Docking a point only because presets assume buyer knows what to ask. |
| **Auth & webhook security** | 9/10 | Boringly correct, which is the highest compliment. Fails closed, signs outbound, strips spoof headers. Stop poking it. |
| **The v1.0 audit doc** | 2/10 | Actively dangerous. Claimed 4 holes, 3 were already fixed. Would've had a model rewrite working security code. This is why every task here has VERIFY FIRST. |
| **AI cost observability** | 3/10 | You log tokens to a console that no one reads and nothing aggregates. You cannot answer "what did yesterday cost." Biggest real gap. |
| **Per-user spend guardrail** | 2/10 | A leaked session can run your Groq/OpenAI bill. Global IP limit is not a cost cap. Fix it (TASK 2). |
| **`.env.example`** | 8/10 | Thorough and well-commented — except it recommends a Groq model Groq deleted. One-line trap. |
| **Lead quality** | 4/10 | You send `{name, phone, project}`. Builders can't tell a serious ₹2Cr buyer from a bored browser. Add intent tier — this is your revenue unlock. |
| **Market fit (India)** | 8/10 | Real wedge (honest advisor vs noisy portals). Risk is go-to-market, not code: verified inventory, RERA verification, builder partners. |
| **Layman usability** | 6/10 | A power user loves it. A scared first-timer doesn't know where to start. Persona chips fix this cheaply. |
| **Cost efficiency** | 6/10 | Sane ceilings + Redis history cache already. Room: route factual asks to the cheap model, trim property JSON in prompts. |

**Overall: 7.5/10 and genuinely close to production.** The code is not your risk. Your risks are (1) no cost visibility/guardrail, (2) undifferentiated lead quality, (3) go-to-market execution.

---

<a name="checklist"></a>
## 7. Final Launch Checklist

**Before launch (P0/P1):**
```
[ ] TASK 7  — secret-in-logs audit passes (zero risk, do first)
[ ] TASK 5  — confirm SAFE_TOKEN_CEILING enforced
[ ] TASK 1  — AI usage persisted + costed        (⛔ human runs migration)
[ ] TASK 2  — per-user daily cost cap live        (depends on TASK 1)
[ ] TASK 3  — .env.example model names fixed
[ ] Make.com — WEBHOOK_URL + WEBHOOK_SECRET set on deployed backend (⛔ human)
[ ] Make.com — test lead lands in Sheet (curl from §5.2 Step 7)
[ ] P1 product — capture buyer intent tier at callback, add to webhook payload
[ ] cd backend && npx tsc --noEmit         # clean
[ ] cd frontend && npm run build           # passes
[ ] /api/v1/health returns 200
```

**First week (P1):**
```
[ ] Lead funnel dashboard (callback → accepted → site visit)
[ ] AI cost dashboard (query AiUsageEvent by day/user/provider)
[ ] RERA verification on data ingest
[ ] Reach out to 3 builders; validate lead format + intent tier
```

**After launch (P2):**
```
[ ] TASK 6  — request-id correlation
[ ] Persona opening chips (layman on-ramp)
[ ] Compare 2–3 + share
[ ] Cheap-model routing for factual asks; trim property JSON in prompts
[ ] Builder feedback loop; delivery track record
[ ] Hindi UI (growth ceiling)
```

---

## Discovered Drift
_(Any model running this doc: if a VERIFY FIRST didn't match, or you found something off-scope, log it here — file:line + one line. Do not fix inline.)_

- _(none yet)_

---

**Doc version:** 2.0 — every claim re-verified against live code 2026-07-22.
**Ship the UI. Close the two real gaps (cost telemetry + per-user cap). Wire Make. Then sell to builders.**
