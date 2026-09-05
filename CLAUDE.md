# CLAUDE.md

## Core AI Developer Guardrails (Karpathy's Rules)
1. **Ask, don't assume.** If something is unclear, ask before writing a single line. Never make silent assumptions about intent, architecture, or requirements.
2. **Simplest solution first.** Always implement the simplest thing that could work. Do not add abstractions or flexibility that weren't explicitly requested.
3. **Don't touch unrelated code.** If a file or function is not directly part of the current task, do not modify it, even if you think it could be improved.
4. **Flag uncertainty explicitly.** If you are not confident about an approach or technical detail, say so before proceeding. Confidence without certainty causes more damage than admitting a gap.

## Communication Preferences & Behaviors
* **No filler phrases:** Never open responses with filler phrases like "Great question!", "Of course!", "Certainly!", or similar warmups. Start every response with the actual answer. No preamble, no acknowledgment of the question.
* **Match complexity:** Match response length to task complexity. Simple questions get direct, short answers. Complex tasks get full, detailed responses. Never pad responses with restatements of the question or closing sentences that repeat what you just said.
* **Show approaches first:** Before any significant task, show 2-3 ways you could approach this work. Wait for explicit choice before proceeding.
* **Scope of changes:** Only modify files, functions, and lines of code directly related to the current task. Do not refactor, rename, reorganize, reformat, or "improve" anything not explicitly asked to change. If you notice something worth fixing elsewhere, mention it in a note at the end. Do not touch it.
* **Destructive changes:** Before making any change that significantly alters existing content (rewriting sections, changing flow), stop. Describe exactly what you're about to change and why. Wait for confirmation.
* **Deletion gates:** Before deleting any file, overwriting existing code, dropping database records, or removing dependencies: stop. List exactly what will be affected. Ask for explicit confirmation. Only proceed after a "yes" in the current message.
* **Irreversible side effects:** The following require explicit in-session confirmation, no exceptions: deploying to environments, running migrations, schema changes, sending external API calls, executing irreversible commands.
* **Task wrap-up:** After any coding task, end with: Files changed (list every file touched) / What was modified (one line per file) / Files intentionally not touched / Follow-up needed.
* **External actions:** Never send, post, publish, share, or schedule anything on my behalf without explicit confirmation in the current message.
* **Complex problem solving:** For architecture decisions, debugging complex issues, or non-trivial features: work through the problem step by step before writing code. Show reasoning. Identify uncertainty. Then implement.

## Memory and Stack Persistence
* **MEMORY.md:** Maintain MEMORY.md in project root. Record significant decisions: What was decided / Why / What was rejected and why. Read MEMORY.md at session start. Never contradict a logged decision without flagging it.
* **Session Summaries:** On "session end" or "wrapping up", write to MEMORY.md: Worked on / Completed / In progress / Decisions made / Next session priorities.
* **ERRORS.md:** Maintain ERRORS.md in project root. When an approach takes >2 attempts, log: What didn't work / What worked instead / Note for next time. Consult ERRORS.md before suggesting similar approaches.
* **Extended Thinking:** For system architecture, performance tradeoffs, database design, or long-term technical decisions: use extended thinking. Work through step by step, surface tradeoffs, flag scale assumptions, then recommend.

---

# PropFyndr

AI-powered real estate advisor for Indian home buyers.

## Purpose Of This File
This is not a rulebook to skim once. It's the working memory of the product — read it the way a senior engineer reads a design doc before touching a critical system: to understand *why* things are the way they are, not just what's allowed.

This file exists because the alternative — re-explaining context every session, drifting product decisions one PR at a time, guessing at intent — is slower and produces worse work. Treat it as the asset that lets every session start where the last one left off.

Consult before implementing features, modifying schemas, generating UI, creating APIs, or writing AI prompts.

The goal:
* Prevent feature creep
* Maintain product consistency
* Preserve business requirements
* Reduce repeated context sharing
* Improve AI-generated code quality
* Align all development with product vision

**If something here is stale or contradicts the live code, say so before proceeding — then fix the doc.** A CLAUDE.md nobody trusts is worse than no CLAUDE.md.

---

## Product Vision
PropFyndr is not a listings website. Not a broker marketplace. Not a generic chatbot.

PropFyndr is an **AI-powered real estate advisor**.

The product exists to help home buyers make better decisions faster.
Traditional portals force users to browse hundreds of listings.
PropFyndr asks users what they want and recommends suitable properties with clear reasoning.

**The AI advisor is the product. The property database exists to support the advisor.**

---

## Product Philosophy
Every feature must support at least one goal:
1. Reduce buyer research effort
2. Improve buyer confidence
3. Surface trade-offs honestly
4. Help buyers reach decisions faster
5. Generate qualified sales leads

If a feature does not improve one of these outcomes, it should not be built.

---

## Core Principles

### Conversation First
Primary experience is conversation. Users describe needs naturally.
Example: "I need a 3BHK near a metro under 1.5 crore."
AI understands intent and provides recommendations.
Do not force users through complicated filter systems.

### Trust First
Trust matters more than conversion. The AI must:
* Show negatives
* Explain trade-offs
* Admit uncertainty
* Avoid exaggeration

Never hide property weaknesses.

### Honest Recommendations
Bad: "This is a perfect property."
Good: "This property fits your budget and location requirements but possession is expected in 18 months."

---

## Chat Experience: Meeting the ChatGPT Power-User

Target user increasingly arrives having already lived inside ChatGPT/Claude daily. They don't think in "search filters" — they think in conversation, memory, and follow-up refinement. If the chat feels dumber than what they use for everything else, trust dies in the first message. Design to that bar, not to a "real estate chatbot" bar.

**What that user expects, and what we owe them:**

1. **No form-filling disguised as chat.** They'll say "3BHK, Sector 150, under 1.5cr, possession within a year" in one line — parse all four facts at once, don't ask them back one field at a time when they've already given four.
2. **Persistent memory within a session, referenced naturally.** If they said "budget 1.5cr" three messages ago and now say "show me something bigger," don't ask for budget again — reuse it, and say so ("still within your 1.5cr range"). This is what `focus_project_id`, `summary_location/financial/timeline` exist for — use them, don't just store them.
3. **Correction without restart.** "Actually make that 2 crore" should silently revise intent and re-run recommendations — not restart the conversation or ask "are you changing your budget?"
4. **Meta-awareness.** They may ask "what have I told you so far?" or "what are you assuming about me?" — the assistant should be able to answer honestly from `IntentState`, not deflect.
5. **Any DB-backed fact, answered directly, no hand-waving.** Amenities, payment plans, builder history, possession dates — see [Chat Interface Capabilities](#chat-interface-capabilities). A ChatGPT user is used to instant, confident answers; "I don't have that information" is only acceptable when it's literally true, never a proxy for "we didn't wire that up."
6. **Reasoning shown, not asserted.** ChatGPT users are trained to expect an explanation, not a verdict. Every recommendation carries a reason + trade-off (see [Recommendation Framework](#recommendation-framework)) — this is the same instinct as citations in an AI answer, applied to property data.
7. **Proactive, not passive.** After answering, suggest the next useful question ("Want to compare this with a similar project 10 min away?") instead of waiting silently. Power users expect the assistant to carry momentum.
8. **Escalation feels like a favor, not a funnel.** When the AI can't go further (site visit, live pricing, negotiation), say so plainly and hand off to a human — don't disguise a lead-capture form as "one more question."
9. **Tone: capable peer, not sales rep.** No exclamation-mark enthusiasm, no "Great choice!" filler. Match the flat, direct, competent tone the user already expects from a good AI assistant — see [Communication Preferences](#communication-preferences--behaviors) for the bar this codebase already holds itself to; the chat's voice should hold buyers to the same bar.

**Product implication:** every gap between "what ChatGPT would do here" and "what PropFyndr actually does" is a churn risk, not a nice-to-have. When scoping a chat feature, ask: *would a power user notice we're worse at this than their default assistant?* If yes, that's the bar to close first — ahead of anything else on the roadmap.

---

## Target Market
Launch Market: Noida
Future Markets: Gurgaon, Bangalore, Mumbai, Hyderabad
Do not build multi-city architecture into V1 UI.

---

## V1 Scope
Supported:
* Noida
* New construction
* Under construction
* Ready to move
* Property recommendations
* Property comparison
* Builder trust information
* EMI calculations
* Stamp duty calculations
* GST calculations
* Callback requests
* Site visit requests
* WhatsApp lead handoff

Explicitly Out Of Scope (do not build):
* Rentals
* Resale properties
* Commercial properties
* Property valuation
* Mortgage approval workflows
* Tenant tools
* Landlord tools
* Auction properties
* Distressed properties
* Native Android/iOS apps
* VR/AR tours
* Family collaboration
* Investment analysis
* Builder CRM
* Broker tooling

---

## User Personas

### First Time Buyer
Budget: 1-2 crore. Needs: Guidance, Trust, EMI understanding, Area understanding.

### Family Upgrade Buyer
Budget: 2-5 crore. Needs: Schools, Metro access, Builder trust, Family-oriented comparison.

### NRI Investor
Budget: 2-4 crore. Needs: Remote verification, Builder credibility, RERA visibility, Human assistance.

---

## Answering With Data We Hold — the four tiers

"Never invent data" was already the rule, and five places in the chat handler
did it anyway, because nothing said *what to do instead*. `lib/factPresentation.ts`
is that answer. Every fact presented to a buyer belongs to exactly one tier:

| Tier | Means | How it may be stated |
|------|-------|----------------------|
| `verified` | Read from **this project's** own rows | Plainly. |
| `statutory` | Fixed by UP law, identical for every project (stamp duty, registration, GST) | Plainly, without a lookup. |
| `market` | Genuinely Noida-wide, **not** verified for this project | Only with `MARKET_QUALIFIER` attached, every time. |
| `missing` | We do not hold it | Say so and offer the advisory handoff. Never substitute a typical value. |

Rules that follow from this, and are enforced by `noFabrication.test.ts`:

* **A project-specific fact has no market tier.** A Noida average cannot answer
  "does this building have a pool". A wrong yes is discovered on the site visit.
* **No hardcoded figures in the router.** Project-specific values are read from
  the database; market-wide ranges live in `NOIDA_MARKET_RANGES` and render
  through `marketFigure()`.
* **"Verified" and `confidence: 'HIGH'` are reserved** for answers built only
  from the project's own rows. Confidence follows the weakest tier used.
* An **absent field means absent**. Omitting it from the prompt is the signal;
  never let a gap invite a guess.

## Field Exposure — adding a column is a disclosure decision

`lib/projectExposure.ts` is the policy for `Project` data leaving the server.

* `Project` has relations to **other users' rows** — `saved_by`,
  `chat_sessions`, `property_feedback`. These are in `FORBIDDEN_RELATIONS` and
  must never be selected into a prompt or a response.
* Internal columns (`embedding`, `ai_search_keywords`, `builder_theme`) and
  analyst-only relation fields (`admin_notes`, `advisor_notes`,
  `internal_confidence`) never reach a buyer.
* `DecisionProfile` and `RecommendationProfile` carry an `IntelligenceStatus`.
  Only `PUBLISHED` is buyer-facing — `DRAFT` and `IN_REVIEW` are unreviewed.
* `ProjectDna` scores stay internal. They are manually-entered numbers, often
  unverified; presenting one as a rating is the fake confidence score this file
  forbids elsewhere.

**Adding a column to `schema.prisma` does not expose it.** It is absent from
`PROJECT_PUBLIC_SELECT` until classified, and `projectExposure.test.ts` parses
the schema and fails on anything unclassified. Make the call deliberately.

## AI Assistant Rules
The assistant must:
* Be honest
* Explain recommendations
* Explain trade-offs
* Show RERA information
* Remember conversation context
* Handle follow-up questions
* Escalate when necessary

The assistant must never:
* Invent data
* Guess unavailable information
* Use fake confidence scores
* Claim certainty when uncertain
* Recommend unsupported cities as available inventory

---

## Recommendation Framework
Rank recommendations using:
1. Budget fit
2. Location fit
3. Possession timeline fit
4. Builder reputation
5. User preferences
6. Nearby infrastructure

Every recommendation must include:
* Property name
* Reason for recommendation
* Primary trade-off

Example:
```
Reason: Matches your budget and is 10 minutes from Sector 62 metro.
Trade-off: Possession expected in 2027.
```

---

## Human Handoff
AI is not the final step. AI qualifies users. Sales closes deals.
Preferred V1 flow: AI → Lead Qualification → WhatsApp Handoff → Sales Team

---

## Signup Rules
Anonymous Users Can:
* Chat
* Search
* Browse
* Compare
* Use calculators

Signup Required For:
* Save property
* Callback request
* Site visit request
* Builder phone access
* Buyer report download

---

## Lead Qualification
High Intent Events (track all):
* Save property
* Callback request
* Site visit request
* Builder contact access
* Buyer report download

---

## Technology Stack

### Frontend
* **Framework:** Next.js App Router
* **UI:** React + TypeScript + Tailwind CSS + shadcn/ui
* **Dark Mode:** Full support (implemented)

### Backend
* **Server Logic:** Next.js Server Actions + Route Handlers
* **Authentication:** Supabase (JWT-based)
* **Database:** PostgreSQL + Prisma ORM

### External Services
* **Maps:** Google Maps
* **Storage:** Supabase Storage
* **Analytics:** PostHog
* **Deployment:** Vercel

### AI Provider Strategy

`backend/src/lib/config.ts` is the source of truth. Do not restate the chain
anywhere else — derive from `FALLBACK_CHAIN`.

**Order:** Gemini → Cohere → NVIDIA → Mistral → Groq → Cerebras.

The tiers are ordered by **whether a leg can call a tool**, never by speed or by
which key is billed. Tier 1 is Gemini; tier 2 is Cohere and NVIDIA, both
tool-capable and neither of them Google; tier 3 is the tool-blind legs.

Gemini is wired **directly** via `@google/genai` (`backend/src/lib/ai/gemini.ts`),
not through `@ai-sdk/google`. Each numbered key variant (`GEMINI_API_KEY1`,
`GROQ_API_KEY2`…) is its own chain entry, so a rate-limited key falls through to
the next rather than failing the turn.

**The keys are not equivalent.** `GEMINI_API_KEY` is the billed account.
`GEMINI_API_KEY1` is free-tier: it 429s on quota and cannot hold a context cache
at all. It used to sit *below* the paid account's lite tier, because at position
2 it caught every failure of the paid key and turned a recoverable stall into an
empty reply.

**That ordering was reversed on 30 Aug 2026, and the empty-reply cause fixed at
its root instead.** `fallbackChain` forces `thinkingBudget = 0` and a
`FREE_TIER_MAX_TOKENS` reply ceiling for any key `isFreeTierKey()` names, so
thinking can no longer eat the whole output budget. What ordering buys is a
tool-capable leg: the billed prepay balance ran out, every turn fell past both
Gemini legs onto Mistral and Groq, and those carry `supportsTools: false`. Over
a 67-query corpus run four answers invented projects and one invented UP-RERA
registration numbers beside two competitor portals. **A free-tier Gemini that
can call `sector_projects` is worth more than a faster model that cannot.** The
billed legs sit directly below, so a top-up is picked up on the free key's next
per-minute limit.

The invariant is now enforced in `beta-critical.test.ts`: **no tool-blind leg
may rank above a tool-capable one, and the chain must lead with one that can
call tools.** Ordering by which key is billed is not the property that matters.

**Every answer passes one integrity gate, whatever leg produced it.**
`answerIntegrity.ts` runs before a buyer has read a word, and a failure rolls
the turn to the next leg exactly as a provider error does.

`toolBlindGuard.ts` — a project name we did not supply, a registration-shaped
number we did not supply, a competitor portal — used to run only on
`supportsTools: false` legs. **That was the wrong boundary.** Measured 5 Sep:
the tool-capable Gemini leg answered "What is Skyline Verdant Quartz
Residency?", a name that does not exist, with "a prominent high-rise
residential development in Noida, crafted by **Supertech Limited**" — a
building we have never heard of, attributed to a developer HARD RULES forbids
recommending — and no guard ran, because the leg had tools. *Having* a tool is
not *using* one. It now runs on every leg, and on the same run it caught a
fabricated `UPRERAPRJ168120` twice.

Two classes beyond fabrication, both measured, both discarded:

* **META_LEAK** — the answer describing its own inputs, or denying data on the
  grounds the prompt did not carry it. "The user asks 'What about the second
  one?', but the provided verified facts block only contains information for a
  single project… as no second project was provided in the database" — the
  prompt's scaffolding read aloud, wrapped around a false claim about a sector
  holding nineteen projects.
* **INVENTORY_SIZE** — any count of what we hold. "We currently maintain
  verified data on 280 projects across 61 sectors" was the reply to "hi".

House-style slips ("in our database") are **rewritten in place**, not
discarded; binning a good answer over phrasing is the more expensive error. The
scan runs on the model's raw words *before* the rewrite, so a rewrite can never
launder a phrase the scan exists to catch — there is a test pinning that.

**Blocking the phrasing is not how the pointer bug was fixed.** Three runs
produced three different denials, each rewritten around the pattern added for
the last one, because the mismatch the model was explaining was real: the
prompt carried one project and the buyer's words said "the second". The fix is
`lib/chat/resolvePointer.ts` — substitute the resolved name into the copy the
model reads, so it sees "What about Samridhi Daksh Avenue?" and has nothing to
apologise for. The raw `message` is untouched; ~40 routing gates read it.

**Every leg is buffered now, not only the tool-blind ones.** The gate has to see
the finished answer while it is still unsent. The cost is time-to-first-token on
every leg; two things come free with it — `endCleanly` runs on the whole answer
rather than a prefix that happened to fit the buffer, which is the mid-sentence
ending that showed up in every corpus run; and the screen, the transcript and
the cache are built from one identical string.

**Every streaming leg has a stall timeout.** Gemini, Groq and OpenAI each grew
their own; Mistral and Cerebras had none, so a stalled stream ran until the HTTP
client gave up — and those two are the legs most turns land on while the Gemini
balance is depleted. `streamTimeout.ts` is one implementation for both: 60
seconds of **silence**, armed before `create()` so a header stall and a mid-body
stall share one window, and reset by every chunk so a slow-but-progressing
generation is never cut off mid-sentence. It rethrows an unrelated failure
unchanged, because a 402 or 429 drives the cooldown classification and a stall
error would cool the wrong way.

**A bare `402 status code (no body)` is balance exhaustion.** That string is all
the OpenAI SDK throws for a Cerebras payment failure — no message, no type — so
matching only the words gave both Cerebras legs the five-minute cooldown and
re-probed them all run. Two dead round-trips at the head of nearly every turn.
With `402` in `BALANCE_EXHAUSTED` they cool for an hour: p99 90.5s → 46.9s.

**Mistral carries its own reply ceiling, below the turn's profile.**
`MISTRAL_MAX_TOKENS` (default 1,400) clamps whatever `inferenceProfile` asks
for. 900 was tried first, on the arithmetic that ~4 chars per token put it above
every reply in the corpus; it truncated answers mid-table-row, because markdown
tables tokenize far denser than prose — 900 tokens came out around 2,400
characters, not 3,600. Pass rate fell to 83.6%. At 1,400 it is back to 88.1%
with p99 at 23.7s, the best of the session.

**Do not read that as "length was the problem".** Mistral's throughput varied
eighteen-fold across one run — 310 chars/sec on one call, 17 on another — and
the 39.4s call that set the earlier p99 emitted only ~536 tokens. The ceiling
bounds a runaway generation; it is not why the tail moved.

**Known and pre-existing: about two answers per run end mid-sentence.** It
shows in every run measured, capped and uncapped, on Gemini legs as well as
Mistral — so it is the profile's own ceiling meeting a table-heavy answer, not
this clamp. Not fixed here.

**A tool-blind leg is skipped outright when the answer IS a list of named
projects.** "best society in sector 137" needs rows. A leg that cannot fetch
any, on a turn where retrieval found none, has two options — invent, or refuse
— and it invented, the guard discarded, the next leg did the same: 40 to 100
seconds and two generations billed to reach the refusal it could have given at
once. `[FALLBACK:NO_LOOKUP]` names each skip.

**The rule is narrow because a broad one cost more than it saved.** The first
version skipped whenever retrieval was empty and `queryKind` was
DISCOVERY/RANKING/COMPARISON/DRILLDOWN. It fired 98 times on the demo set and
took the pass rate from 89.6% to **71.6%** — sector comparisons, price
questions and affordability turns answer from the rendered market tables and
need no project row at all. The shipped rule requires an inventory noun
(society, project, builder, flat…) **and** a list-asking word, and fires 14
times: p50 8.8s → 4.5s, p90 39.9s → 16.8s, one extra refusal. Every query in
both categories is pinned in `fallbackChain.test.ts`; widen the regex only with
a corpus run to show it does not eat honest answers.

**The reference set is the database, not the prompt.** Checking a name against
the prompt's own facts block only works on a turn that retrieved projects. A
`GATHERING` turn retrieves none, and on exactly such a turn Mistral answered an
affordability question with six invented projects — four of them hung on
builders we really hold, which is the most convincing fabrication available.
Worse, the prompt-only version cut the other way too: it discarded answers for
naming Gaur City 1, Nirala Estate Phase 1, Panchsheel Greens and Mahagun
Moderne, all of which are real rows. The guard now compares against every
project and builder name we hold, cached in process for ten minutes. A database
failure resolves to the prompt facts alone — a guard that cannot read the
database must not fail a turn the database would have cleared.

**It asks what a name IS, never what it is not.** The first version blocklisted
words that open a heading, and could not be finished: every run produced labels
it had not been told about — "Carpet Efficiency Gap", "Power Backup Tariffs",
"Rental Yield Anchor" — and each one binned an honest answer. Three of eleven
refusals in the 30 Aug run were that, not fabrication. A bolded phrase is read
as a project claim only when it carries a place word (`PROJECT_WORD` — Heights,
Greens, Estate, Vista…) or leads with a builder the prompt itself supplied.
Measured on every string the run produced: **14/14 fabrications caught, 0/31
labels flagged.** The deliberate ceiling is a fabricated name with neither
signal ("Verdant Quartz"), which passes — missing one is the cheaper error than
discarding a good answer, and there is a test pinning that choice. Those legs therefore buffer their whole
answer rather than streaming it: the check has to run while the answer is still
unsent. They lose their time-to-first-token; an answer that invents a project is
worse than a slow one. `[FALLBACK:FABRICATED]` in the log names what was caught.

A balance-exhaustion failure (`credits are depleted`, `payment required`) cools
its leg down for an hour rather than the ordinary five minutes — a prepay
balance refills when a human tops it up, not on a timer, and re-probing it cost
two dead legs at the head of nearly every turn. `recordSuccess` clears the
cooldown on the first probe that answers, so a top-up recovers without a restart.

**Output is the bill, not input** — but the input side is billing far more than
this file used to claim. At verified pricing (3.6 Flash: $0.75 in / $3.75 out
per 1M) output is ~$0.0049 a turn. Thinking bills at the output rate, so a
1,024-token reasoning budget costs more than a small input side.
`inferenceProfile.ts` picks model, thinking budget and reply ceiling from the
shape of the question; measured over the real corpus that is a 64% cut.

**The "78% served from Gemini's implicit cache" figure that stood here was
wrong, and the real number is 0%.** Measured 5 Sep 2026 across one four-turn
conversation with `DEBUG_PROMPT_STABILITY=1`: every log line reads `no cache hit
— N prompt tokens billed at full rate`, N between 2,577 and 31,288. The cause is
structural, not a misconfiguration. Each lane assembles its own system prompt,
so the three heads that conversation produced were 25,193, 10,534 and 9,342
characters with a **longest common prefix of seventeen characters** — "You are
RealtyPal". Implicit caching matches a prefix; there is nothing here to match.
Explicit caching is separately unreachable, because `cacheIsUsable` requires
`!GEMINI_TOOLS_ENABLED` and tools are on in this deployment.

So "shrinking the prompt optimises the smaller half" no longer holds either:
input is roughly 13k tokens a turn at full rate, which is the same order as
output. **The fix is one byte-identical opening block shared by every lane**,
placed before anything per-request — not a smaller prompt. It is a prompt
refactor with answer-quality risk, so measure with the hash line before and
after: one repeated hash across turns means caching can engage, three distinct
ones means it cannot.

**`GEMINI_DAILY_BUDGET_USD` defaults to $2** and is enforced across every
caller. On a topped-up account that is roughly 130 turns before every Gemini leg
starts throwing and the chain silently degrades. Raise it deliberately before a
demo rather than discovering it mid-conversation.

**Tables are rendered in code, not by the model.** `marketTable.ts` builds the
project shortlist, micro-market, sector-comparison, payment-plan and cost-sheet
tables from rows we already hold, streams one before the prose, and tells the
model it is on screen. **A project table is never rendered when property cards
are** — the cards carry the same five columns and can be tapped.

That instruction is backed mechanically: pass `suppressTables: true` to
`executeWithFallbackChain` whenever you have rendered one, and `stripTables.ts`
drops any table the model draws anyway — from the live stream and from the text
returned for the transcript and the cache, so all three agree. It is line-based
because the transport is a stream, and it leaves fenced code blocks alone.
`[CHAT:TABLE_SUPPRESSED]` in the log means the prompt rule is being ignored. Measured over 321
answers: 54% contained a table and tables were **53% of all output tokens** —
mostly the same data we had just injected, billed once in and once out. Left to
draw its own, the model also invented columns it had no data for (a "5-Yr Upside
Risk-Adjusted Est.") and put emoji in cells the prompt forbade. A rendered table
cannot do either: every column is one we hold, and a missing value prints
"Not recorded". Adding a new table means a new renderer, not a prompt rule.

**The output contract is per-question, and it goes last.** `outputContract()` in
`prompts/base.ts` appends a short block naming what THIS answer should look
like — length, whether a table is warranted, whether to commit to a verdict.
Position is salience: it is the last thing the model reads. It replaced an
unconditional "ALWAYS use markdown tables" in HARD RULES, which mandated the
most token-expensive format we can emit on every turn including head terms.

Splitting the prompt *body* by query type is not worth it and was measured:
the head is served from Gemini's implicit cache at a tenth of rate, so trimming
2,475 tokens of it saves ~$0.00007/turn. Splitting the OUTPUT contract pays,
because output is ~2/3 of the bill. Shape comes from `classifyShape` — regex,
no classifier call; a model to route to a cheaper model costs more than it saves.

**Stable bytes must precede variable bytes.** Prefix caching matches a prefix,
so anything constant appended after per-request data can never be cached. The
city micro-markets block sat there and was billed at full rate every turn for
no reason but ordering. `STATIC_PREFIX_MARKER` is the splice point for stable
content; use it rather than concatenating.

**Answers are cached in two tiers.** `semanticCache.ts` is an in-process LRU in
front of Upstash. Keys are `scope :: intentFingerprint :: normalizedQuery`, so a
project answer cannot surface for another project and an answer shaped by a
stated budget cannot surface for a buyer who stated a different one. The main
chat path writes only `lookup` and `factual` shapes with no project focus —
advisory and reasoning turns are written around a situation and stay uncached.
Redis failures are always non-fatal: reads carry a 250ms deadline, writes are
fire-and-forget. Changing what a key means requires bumping `REDIS_PREFIX`,
which flushes rather than serving stale answers under a new interpretation.

**Prices live in one place.** `PRICE` in `cost.ts`, verified against
ai.google.dev. They were once the *cached*-input rates entered as standard,
understating every Gemini row 10x — which also meant the daily budget was
enforcing ten times what it claimed. Note the 1 Jan 2027 doubling on 3.6/3.7.

**Spending is capped.** `GEMINI_DAILY_BUDGET_USD` (default $2) is enforced in
`geminiMeter.ts` across every caller. Exceeding it throws, which the chain
handles as an ordinary Gemini failure and rolls on to Mistral. Every Gemini call
goes through `meteredClient()` or `streamWithGemini`, both of which check the
budget and write an `AiUsageEvent`. **Do not call `new GoogleGenAI` directly** —
ten call sites once did, none of them recorded a rupee, and reported spend was
under a quarter of actual.

**Tool support.** `GEMINI_TOOLS_ENABLED` (from `ENABLE_GEMINI_TOOLS`) drives both
the tool definitions passed to Gemini and the `toolsEnabled` argument to
`getBaseSystemPrompt`. They come from one constant so they cannot disagree —
before that, setting the env var alone gave Gemini a tool catalogue alongside a
prompt reading "You cannot call tools here." The constant defaults to **off**;
`.env` sets `ENABLE_GEMINI_TOOLS=true`, so tools are on in this deployment.
The Cohere and NVIDIA legs are also `supportsTools: true`; Mistral, Groq and
Cerebras are not.

**GitHub Models is retired — it is not coming back.** It closed to new customers
on 16 Jun 2026 and shut down on 30 Jul 2026; probed 30 Aug it answers `410
github_models_retirement_brownout`, and `models.inference.ai.azure.com` stopped
resolving in DNS before that. The four `OPENAI_API_KEY*` legs that pointed there
were dead: each failed, was classified durable, cooled for an hour, and was
probed again — four wasted round-trips at the head of nearly every turn — and
*below them every remaining leg was tool-blind*. So when Gemini's quota went, the
chain lost the ability to read a project row at all, which is where the invented
projects came from. The redirect that rewrote the dead Azure host to the retired
GitHub one is gone; `OPENAI_BASE_URL` pointing at either now warns and is ignored.

**Cohere and NVIDIA replaced them, and cost no new adapter.** Both speak the
OpenAI chat-completions protocol including tool calls, so they are
`provider: 'openai'` legs carrying a `baseUrl`. One adapter, one stall timer, one
cooldown key space. `openai.ts` now honours `config.model` — it previously
hardcoded `MODELS.MAIN`, a gpt-4o name that neither vendor serves.

**The models are chosen from measurement, and the rejects matter more than the
picks.** Probed 30 Aug against the real tool schema, cold then warm:
`cohere/command-a-03-2025` 1.1s/0.9s, `nvidia openai/gpt-oss-20b` 2.3s/2.4s,
`nvidia nemotron-3.5-lightning` 2.7s/2.3s — all three emit a clean `tool_call`
and stream. Rejected: `command-a-plus-05-2026` (newer, but dropped the required
argument — `sector_projects({})` — and streamed 32 chunks of empty content);
`nvidia openai/gpt-oss-120b` (5.3s then **35.1s** on the identical call — that
variance *is* the p99 we are removing); `nemotron-3-super-120b` (answered "I need
to use the tool" as prose instead of calling it); `meta/llama-3.3-70b` and
`nemotron-super-49b` (410, both EOL 26 Aug 2026); `gemma-4-31b`, `minimax-m3`,
`deepseek-v4-flash`, `mistral-nemotron` (no response inside 120s, twice). **A
provider's catalogue listing a model is not evidence it answers.**

`beta-critical.test.ts` pins three properties: no leg may point at a retired
host, a leg on a non-default host must name its own model, and at least one
tool-capable leg must not be Gemini.

Cloudflare Workers AI is a candidate for a third tier-2 leg but is **not wired**:
its endpoint is scoped per account and `CLOUDFLARE_ACCOUNT_ID` is not set.

**Env-var spellings are aliased at load.** `.env` carries `NIVIDIA_API_KEY` and
`CLOUDFARE_API_KEY`. A leg reading the correct spelling finds nothing and skips
silently, which is indistinguishable from "no key configured" in the log.
`ENV_ALIASES` in `config.ts` maps them and warns. Rename them in `.env` and the
warning goes away.

A caller that passes a stub `onToolCall` must also pass `config.tools: false`.
Offering a catalogue to a model whose tool results come back empty makes it loop
through every tool cycle and return no text at all.

Anything advertised in the tool catalogue must have a handler in the router.
`toolCatalogue.test.ts` enforces this — three tools were once offered to the
model with nothing behind them.

**Do not add an `@ai-sdk/*` provider.** The Vercel AI SDK packages in
`frontend/package.json` are legacy and unused by the chat path.

### Alternative Search Providers
* **Web Search:** Tavily (for real-time data)
* **Semantic Search:** Jina (for embeddings-based search)

Always use the defined stack. Never suggest alternatives unless explicitly asked. If something seems wrong, flag it but use the defined stack unless told otherwise.

---

## Engineering Standards

### TypeScript
* Always use strict mode.
* No `any` types.
* Avoid type assertions whenever possible.

### Validation
* Use Zod. Every external input must be validated.
* Includes: API requests, forms, query params, AI responses.

### Database
* Prisma is source of truth.
* Never bypass Prisma migrations.
* Never modify production schemas manually.

### Testing
* **A test that cannot fail is not a test.** `assert(true)` bodies accumulated to
  2,079 cases across 23 files — 60% of the reported suite — and every one of them
  passed while the area it named went unverified. They are now marked `todo`.
* Writing a placeholder is fine; write it as `it('name', { todo: '…' }, () => {})`
  so it reports as outstanding work rather than as green.
* Live-LLM suites are opt-in via `RUN_LIVE_LLM_TESTS=1`. A provider key sitting
  in `.env` is not consent to spend money and assert on non-deterministic output
  on every `npm test`.
* `npm test` runs jest **and** the node:test suite in both workspaces. CI's
  coverage gate checks that each safety-critical suite still carries real
  assertions, so a file cannot be quietly hollowed out.

### Error Handling
* Do not swallow errors.
* Use: Structured logging, Error boundaries, Retry mechanisms where appropriate.
* Analytics and error reporting must never break a request — they no-op when
  unconfigured. That also means a misconfigured deploy looks healthy, so verify
  with `npm run verify:observability` rather than assuming.

### Code Organization
* Do not redesign, restyle, or otherwise modify visual components, input fields, or chat interface styling unless explicitly requested.
* Do not add features that were not requested.
* Do not refactor unrelated code.
* Do not introduce new dependencies without justification.
* Suggest better approaches when they provide meaningful improvements. Explain tradeoffs before implementing alternatives.

---

## Folder Structure (Live)
```
frontend/app/                    # Next.js App Router routes & pages
frontend/components/             # React components
  ├── chat/                      # Chat UI (MessageBubble.tsx owns chip rendering)
  └── property-detail/           # Project detail tabs
frontend/lib/                    # Client utilities (auth, authedFetch, chipIconUtils)
frontend/types/                  # TypeScript types (project, property, intent)
frontend/public/                 # Static assets
frontend/__tests__/              # Frontend tests

backend/src/routes/              # Express route handlers
  ├── chat-router.ts             # The chat pipeline (large; entry point for a turn)
  ├── chat-helpers.ts            # Token trimming, cache reuse, session restore
  └── admin.ts                   # Admin API
backend/src/lib/
  ├── ai/                        # Providers, prompts, guardrails, cost, caches
  │   └── prompts/base.ts        # The system prompt (tool section is conditional)
  ├── discovery/                 # Intent → query → scoring → chips
  │   └── conversationEngine.ts  # Single source of stage + chip decisions
  ├── chat/                      # Summary compression, reaction detection
  └── db.ts                      # Prisma client
backend/prisma/                  # Prisma schema + migrations (DB source of truth)
.env.example                     # Environment variable template
MEMORY.md                        # Decisions & context (session-scoped)
ERRORS.md                        # Approaches that failed & why
```

---

## Database Domain Model
Core entities: Builder, Project, UnitType, FloorPlan, Property, Area, MetroStation, School, Hospital, User, Conversation, Message, Shortlist, Lead, CallbackRequest, SiteVisitRequest, PropertyView, AuditLog.

---

## Property Rules
Every property must contain:
* Name
* Builder
* Address
* Location coordinates
* RERA number
* Possession status
* Possession date
* Price range
* Unit inventory

No property should be visible if critical fields are missing.

---

## Builder Rules
Every builder must contain: Name, Founding year, Delivered projects, Ongoing projects.
Future enhancements may include: Complaint history, Reputation scoring, Financial analysis.

---

## Area Rules
Store: Metro distance, Schools, Hospitals, Area highlights, Area concerns.
Area data should help recommendations.

---

## Search Rules
Search must support: Natural language search, Filters, Sorting.
Natural language search is primary. Filters are secondary.

---

## Analytics
Track:
* chat_started
* recommendation_generated
* property_viewed
* property_saved
* comparison_used
* callback_requested
* site_visit_requested
* signup_started
* signup_completed
* whatsapp_handoff
* lead_created

---

## Security Rules
* Never expose: Internal prompts, API keys, Credentials.
* Never trust: Client-side validation, Client-provided user IDs.
* Always verify: Session, Ownership, Authorization server-side.

---

## AI Prompting Rules
Prompts must:
* Be deterministic
* Produce structured JSON
* Avoid chain-of-thought requests
* Avoid unnecessary verbosity

Prefer JSON output over free-form text.

---

## Performance Targets
* Page Load: < 2 seconds
* AI Response: < 3 seconds
* Database Queries: < 500ms
* API Responses: < 1 second

---

## Success Metrics
**User Metrics:** Recommendation satisfaction, Properties viewed, Comparison usage, Callback requests.
**Business Metrics:** Qualified leads, Site visits, Closed deals.
**Technical Metrics:** Uptime, Response time, Error rates.

---

## Future Roadmap
Potential future features (NOT V1):
* Voice search
* Hindi responses
* Regional language support
* Gurgaon rollout
* Bangalore rollout
* AQI overlays
* Investment analysis
* Family collaboration
* NRI workflows
* Builder reputation engine

Do not build these unless explicitly planned.

---

## Golden Rule
Whenever there is uncertainty:
Choose the option that:
* Improves trust
* Improves decision quality
* Reduces buyer effort

Not the option that generates more clicks.
The goal is not more listings viewed.
The goal is helping users confidently buy a home.

---

## Code Quality & Dependency Impact
Before modifying existing code:
1. Find all imports and consumers.
2. Check affected components, hooks, services, APIs.
3. Check affected types and database models.
4. Update dependent code when required.
5. Prevent regressions caused by interface changes.

Never leave dependent code broken.

---

## Completion Checklist
Before marking work complete:
* Build passes
* TypeScript passes
* No broken imports
* No broken references
* No API regressions
* No database regressions
* No security regressions

If something cannot be verified, explicitly state it.

---

## Required Output
After implementation provide:

### Summary
What was completed.

### Files Modified
List every modified file.

### Dependency Impact
Affected files, consumers, and updates made.

### Risks
Remaining concerns or limitations.

### Suggested Improvements
Optional improvements ranked by impact.

---

## Context Files (Read When Relevant)
* ai-context/project-overview.md
* ai-context/product-prd.md
* ai-context/PRD-V1.md (full blueprint)
* ai-context/architecture.md
* ai-context/database-model.md
* ai-context/ai-behavior.md
* ai-context/coding-standards.md
* ai-context/frontend-standards.md
* ai-context/backend-standards.md
* ai-context/security.md
* ai-context/deployment.md
* ai-context/auditor-prompt.md

---

## Admin Panel & Lead Management

### Lead Enrichment Strategy
Leads are stored in `CallbackRequest` model. Currently shown to sales team:
- Name, phone, project, lead_tier (HOT/WARM/COLD), lead_score, single-line ai_summary

**Missing:** Full buyer context. Rich data exists but not surfaced:
- Chat summaries: `ChatSession.summary_location`, `summary_financial`, `summary_timeline`
- Property reactions: `ChatSession.property_reactions` [{projectId, sentiment, reasons}]
- Full conversation: `ChatMessage[]` available but not linked
- Engagement: projects_viewed, projects_saved

**Enhancement Required:** Link `CallbackRequest → ChatSession` (add `chat_session_id` FK to CallbackRequest).
Then sales team accesses complete profile: summaries + reactions + transcript.

**Lead-gen v2 refinements** (talk-track draft, duplicate detection, source
attribution, re-engagement queue, urgency signal) are sequenced in
`ai-context/lead-gen-v2.md`. None are V1.

### Admin Panel Sections

**Leads Dashboard** (`/admin/leads`)
- Status pipeline: new → contacted → qualified → lost
- Tier scoring: HOT (immediate, matched profile) | WARM (exploring) | COLD (generic)
- Per-lead: name, phone, project, budget, timeline, intent_tier, property reactions, chat link
- Future: bulk export with full context, objection tracking, conversion metrics

**Builder Onboarding** (`/admin/builder-applications` + `/admin/builders`)
- Flow: Application → Approval → Projects linked
- Tracks builder's past performance (leads closed, project delays)
- Shows builder reputation score (when implemented)

**Projects Management** (`/admin/projects`)
- CRUD projects, inventory, amenities, payment plans, RERA mapping
- Data quality checks (missing images, RERA, possession details)
- Project performance: save/view ratio, user objections

**Analytics** (`/admin/analytics`)
- Users: signup trends, session activity
- Properties: data completeness, most viewed/saved projects, objection patterns
- Search: query success rate, recommendation conversion
- Lead funnel: discovery → callback → contact → closed (when lead status tracked end-to-end)

### Chat → Lead → Sales Flow

1. **Discovery Phase** — User chats, describes needs
   - ChatSession created, intent captured in each ChatMessage.intent_snapshot
   - Summaries built: summary_location, summary_financial, summary_timeline

2. **Callback Requested** — User provides contact
   - CallbackRequest created with: name, phone, project_name, source_intent, **chat_session_id**
   - AI scores: lead_score, lead_tier (HOT/WARM/COLD)
   - AI summarizes in: ai_summary field

3. **Sales Handoff** — Sales team sees lead
   - Clicks lead → sees: summaries + property_reactions + full chat transcript
   - Understands buyer: budget flexibility, timeline constraints, specific concerns
   - Can reference chat: "You mentioned metro access matters — this project is 8 min from Sector 62 metro"

4. **Conversion Tracking** — Sales marks lead status
   - Status updates: new → contacted → qualified → lost
   - Each status change feeds analytics (funnel)
   - Objections captured in LeadObjection (if filled by sales)

### Project Detail Page Extensibility

Current fields displayed: name, builder, location, amenities, payment plans, possession, images, price.

**To add new fields:**
1. Add to `Project` model in `backend/prisma/schema.prisma`
2. Update `/api/projects/:id` route handler
3. Update `ProjectDetailPanel` component to render new fields
4. Update admin project creation/edit form (`/admin/projects/new` + `[id]`)

**Example: Add metro distance field**
```
Schema: nearby_metro_distance Int?  // kilometers
API: Include in /api/projects/:id response
Component: Display in ProjectDetailPanel with icon + distance formatted
Admin: Add number input to project form
```

### Competing with Generic AI (vs Claude)

**Generic Claude:** Answers anything, unreliable for structured domains.
**PropFyndr:** Specialized AI for home buying decisions.

**Current Differentiation:**
✓ Intent capture (budget, timeline, location, purpose)
✓ Verified data only (RERA, builder names, possession tracking)
✓ Lead scoring (HOT/WARM/COLD based on match)
✓ Property reactions (interested/concerned/rejected tracked per project)
✓ Chat history + summaries (buyer context preserved)

**Missing (Priority Order):**
1. **Objection Visibility** — Aggregate buyer concerns per project/builder (LeadObjection model exists but unused)
   - Show: "75% of inquiries about Project X ask about possession reliability"
   - Action: Use this to proactively surface reassurance or alternative projects

2. **Comparison Reasoning** — Not just "Project A vs B" but "A chosen because metro + budget, B lacks metro but better schools"
   - Requires: Explicit decision reasoning in recommendation logic
   - Show in chat: Why each project ranked where

3. **Community Sentiment** — Anonymized buyer signals per project/builder/locality
   - "Other buyers saved 3 similar projects after viewing this one"
   - Use in objection handling: "Builder reliability concern — here's 2-year track record"

4. **Explainable Lead Score** — Sales team sees scoring breakdown
   - "HOT: timeline ✓ (immediate) + budget ✓ (1.8Cr in range) + location ✓ (Sector 150) + engagement ✓ (saved 3 projects)"
   - Not just: "Lead score: 82"

5. **Intent Persistence** — Buyer profile saved across sessions
   - "You mentioned 3BHK near metro last month — still prioritizing those?"
   - Decision profile evolves: Refine intent over time

6. **FAQ Generation** — Dynamic FAQ built from chat questions
   - Most common questions about Project X → Surface answers on detail page
   - Reduces support load, improves buyer confidence

### Chat Interface Capabilities

The chat must answer ANY database-backed question:
- Amenities: "Does this project have a gym?"
- Payment plans: "What's the payment schedule?"
- Builder: "What's Elite Group's track record?"
- Possession: "When will the project be ready?"
- Financing: "Can I get an EMI estimate for 1.5Cr?"
- Comparison: "How does this compare to Godrej Woods?"

**How this actually works now.** `lib/projectFactsBlock.ts` projects the whole
public field allowlist into the prompt — around 150 columns plus the relations —
rather than a hand-picked subset. A field becomes answerable the moment it is
populated: no new branch, no new tool, no schema change.

Three rules keep that affordable and honest:

* **Empty values are omitted.** An absent key tells the model we do not hold the
  fact. `false` and `0` are kept — "not pet friendly" and "0 litigation" are
  real answers, not gaps.
* **Heavy relations are demand-driven.** `price_history`, `spec_items` and
  `construction_milestones` were 35% of the block for detail almost no turn
  needs. `detectFactTopics(message)` pulls them in only when asked.
* **The field set comes from `projectExposure`**, so nothing internal can leak in
  by being added to the schema later.

The analyst narrative (`decision_profile`, `recommendation_profile`,
`persona_profile`) is included too — prompt rules 13–15 in `prompts/base.ts`
instruct the model to reason from `decision_thesis`, `why_buy`, `why_avoid`,
`tier` and `walk_away_conditions`, and for a long time none of them were ever
sent, so those rules were dead.

**Still open:** fourteen hardcoded topic handlers in `chat-router.ts` run before
the generic path and return early. They work, but each is a separate place to
keep honest. Folding them into a handler registry and removing them as the
generic path proves equivalent is the next structural step.

### Sales Team Workflow

1. **Open Leads Dashboard** → Sort by tier (HOT first)
2. **Click Lead** → See: summaries, property reactions, chat transcript
3. **Call Buyer** → Reference chat: "You mentioned school access matters — this project is near DPS"
4. **Objection Handling** → Use LeadObjection or chat context to address concern
5. **Update Status** → new → contacted → qualified → lost
6. **Closure Tracking** → Analytics shows funnel: how many HOT leads → contacted → qualified → closed

---

## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use code-review-graph MCP tools BEFORE Grep/Glob/Read to explore the codebase.**

The graph is faster, cheaper (fewer tokens), and gives structural context (callers, dependents, test coverage) that file scanning cannot.

### When to use graph tools FIRST
* **Exploring code:** `semantic_search_nodes` or `query_graph` instead of Grep
* **Understanding impact:** `get_impact_radius` instead of manually tracing imports
* **Code review:** `detect_changes` + `get_review_context` instead of reading entire files
* **Finding relationships:** `query_graph` with callers_of/callees_of/imports_of/tests_for
* **Architecture questions:** `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read only when the graph doesn't cover what you need.

### Key Tools
| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

---

## Session Notes
This document is the source of truth. Read it at session start.
If you discover something documented here is incorrect or stale, flag it immediately.
Update MEMORY.md with significant decisions during this session.
Check ERRORS.md for approaches that failed before.

---

**Last Updated:** 2026-08-27
**Last Refined For:** Fact tiers & the no-fabrication standard, field-exposure policy, the real provider chain & tool gating, the testing standard, observability verification. Lead-gen v2 moved to ai-context/.
