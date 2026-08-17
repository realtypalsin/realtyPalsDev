Verdict first

Not production ready. ~4/10.

Security posture and infra plumbing (rate limits, IDOR check, SSE, Sentry, budget cap) are genuinely decent. The chat brain is not — there is one live bug that likely nukes most non-search answers, plus a 900-line uncommitted block of hardcoded fabricated "verified" data that directly contradicts the product's own trust rules.

---
P0 — Ship blockers

1. Output guardrail almost certainly blocks legit answers. chat-router.ts:2693 calls validateAgainstFacts. That function (guardrails-v2.ts:45) populates projectPrices only from a Verified facts:\s*{...} JSON marker in the system prompt. Grepped prompts/ + systemPromptCache.ts — that string does not exist there. Only the hardcoded ground-truth branches emit it. So in the main pipeline facts.projectPrices is empty, every ₹1.5 Cr in a response fails isKnown, blocked: true (v2 blocks unconditionally, no observe mode), and fullText gets replaced with "I'm not able to provide that information." Search-with-cards escapes via !isPropertySearchWithResults; every drilldown/advisory answer mentioning a price does not. Worse: createBufferedSend (fallbackChain.ts:47) runs the same check and only logs — so tokens stream to the user, then the final text is swapped. User sees the answer, then the refusal.

2. outputGuardrail (252 lines, guardrails.ts:65) is imported at chat-router.ts:65 and never called. Two guardrail systems with opposite defaults (v1 = observe-only, v2 = always block). The one with the safety valve is dead.

3. Topical summaries and property reactions are permanently dead. The session select at chat-router.ts:375-385 requests id, user_id, guest_token, summary, last_projects, messages — no summary_location/financial/timeline, no property_reactions. Then sessionData as any at :400 reads exactly those fields. Result: existingTopicSummaries always {null,null,null}, existingReactions always []. Written every turn, never read back. The as any is what hides it from the compiler. This is the "persistent memory referenced naturally" pillar in CLAUDE.md — it's silently off.

4. Full-table scan with 5 relations on every single chat turn. chat-router.ts:675 — prisma.project.findMany({include: {builder, unit_types, payment_plans, cost_sheet, amenities}}). No where, no select, no take, no cache, and it runs before any branch decides it's needed. Plus a second unbounded findMany at :492 and a raw trigram query at :475. Three project scans per message. <500ms DB target is not reachable.

5. Fabricated data presented as verified. The uncommitted 900 lines hardcode: statutory tax table, sector guide with prices/society names/metro claims (:955-965), payment-plan tables (:1219-1223), cost-sheet ranges — EDC ₹350–500/sq.ft, parking ₹3.5–5.0 Lakh, IFMS ₹50–100/sq.ft (:1292-1295). Headed "Verified Payment Plan Options", "Verified Pricing & Cost Sheet Facts". Meanwhile the GROQ_FALLBACK_SUFFIX in the same file (:125-128) says these fields are never in the database and forbids saying "typically ₹X". The code violates the prompt it ships. Builder recommendation hardcodes "such as ATS, Gaurs, and Mahagun" (:923) regardless of query results.

6. Lead capture bypasses auth and consent. chat-router.ts:546 — regex \b[6-9]\d{9}\b on the raw message creates a callbackRequest with no auth check, no chat_session_id, no dedup, no consent. CLAUDE.md: callback requires signup. Any stray 10-digit number in a message creates a phantom lead. Phone then logged in plaintext at :566.

7. Tools are effectively disabled in production. ~300 lines / 30 handlers at :2355-2654. FALLBACK_CHAIN (config.ts:49) marks every provider supportsTools: false except tier-3 OpenAI; Gemini additionally needs ENABLE_GEMINI_TOOLS === 'true' (gemini.ts:102). Default prod: builder_lookup, rera_check, web_search, calculate_emi never fire — and the 186-line "tools unavailable" suffix is appended to every request. So the headline capability ("answers any DB-backed question") is off, and you pay ~2k tokens per call to tell the model so.

---
P1 — Correctness

- chat-router.ts:505-516 is not Levenshtein. It's positional character mismatch, and it aggregates with Math.max across tokens instead of min. Threshold ≤2 on that metric produces confident wrong project matches.
- Trigram match hijacks the turn. :475 matches the entire user message against Project.name, LIMIT 1, no similarity floor, then sets intent.projectNames + targetProjectId (:524). On short messages this misroutes to project-detail.
- IDOR write leak. Ownership check at :390 fires correctly, but the finally block (:3083) still runs persistIntentToMemory(sessionId, userId, hydratedIntent) — attacker's intent written into the victim's session memory.
- last_projects holds two incompatible shapes. Written as string[] (:446), as projects.slice(0,5) objects (:2102), and as tagged objects (:2960). Read as string[] at :434 and as ScoredProject[] at :427. Both casts are as.
- :447 updates a session that may not exist (currentSessionId is a fresh randomUUID() on new sessions). Throws, .catch swallows, last_projects silently never persists on turn 1.
- allDbProjects[0] as final fallback (:1193, :1266) — answers cost/payment questions about an arbitrary project rather than asking which one.
- Unescaped regex from DB. :2980 — new RegExp(\\b${e.name}\b`)on project names. A name containing(, +, .` throws or mis-replaces.
- res.end() in finally after every branch already ended; some error paths send() after end.
- Rate-limit check inconsistent — POST uses .allowed, /session* uses remaining <= 0.
- No abort on client disconnect. res.on('close') clears only the heartbeat; LLM stream and DB writes keep running. No AbortController reaches any provider.
- messageId grading race (:3050) — findFirst newest assistant message; concurrent turns grade the wrong one.
- Math.random() for followup selection (:2897) — nondeterministic, untestable.

P1 — Validation / types

- BodySchema uses z.record(z.unknown()) + .passthrough() for every non-text action (:198-203). INTENT_PATCH.payload.patch is merged straight into intent (:355). Client can inject arbitrary intent fields. CLAUDE.md requires every external input validated — this is a hole.
- as any is load-bearing in at least 8 places, and in case #3 above it is actively hiding a broken feature.
- SAFE_TOKEN_CEILING defined three times: config.ts:30 = 2000, contextBuilder.ts:6 = 100_000, chat-helpers.ts:87 = 100_000. The config one is unused.

P2 — Dead code / structure

- enrichResponseWithDatabaseData (146 lines, chat-service.ts:12) — imported at chat-router.ts:82, never called. Inside it, formattingPrompt is built (:77-84) then discarded; the comment says "don't use LLM to avoid complexity during demo" and it ships JSON.stringify(...).slice(0,150) as user-facing prose. Delete the function; it likely orphans the discovery/queryRouter + dataFetcher + comparisonMatrix chain too.
- chat-router.ts = 3367 lines, with a single ~2900-line POST handler containing nine sequential early-return content branches. The chat.ts header claims a three-way split; the split was cosmetic — tool dispatch, sector parsing, fuzzy matching, lead capture, and persistence all still live in the router.
- Zero route-level tests. chat.integration.test.ts (291 lines) hits Prisma directly, never exercises the handler. git grep shows no it(/test( blocks resolving in it. A 2900-line function with nine exit paths and no test on any of them.
- .filter(p => !p.name.includes('iitl nimbus')) (:686) — a data-quality bug patched in the hot request path.
- Sequential awaits throughout: chip inventory → project scan → builder scan → sectors overview → discovery → sector context → compression → blocked builders → micro-markets. Little of it is parallelized. <3s AI response is not achievable on this shape.

P2 — Privacy

Full intent objects logged (:466), phone numbers logged (:566), message content logged in sanitize.ts:27. CLAUDE.md says PII handling belongs in log redaction — there is none.

---
What's actually good

Dual-ceiling rate limiting (identity + IP, :296) — correctly reasoned about guest-token rotation. Per-user daily AI budget. Verified-Supabase-token-only identity, never a client header (:245). SSE heartbeat with proper listener cleanup. Mid-stream-stall handling in fallbackChain.ts:161 — recognizing you can't swap providers after tokens ship is the right call and most people get it wrong. canReuseCache (chat-helpers.ts:43) is genuinely well-designed: explicit priority order, order-independent BHK compare, city-level terms excluded from invalidation. Sentry + PostHog wiring is real.

---
Fix order

1. Repair or disable validateAgainstFacts — currently silently degrading most answers. Fastest safe move: gate it behind the same GUARDRAILS_OBSERVE_MODE env v1 already has, ship the fact-marker into the main prompt, then re-enable.
2. Add the missing fields to the session select and delete sessionDataTyped as any so the compiler catches this class of bug.
3. Scope the :675 findMany — where by matched project/sector, select only needed columns, cache. Or move it inside the branch that needs it.
4. Delete the hardcoded tax/sector/cost/plan tables, or move the numbers into DB rows with a source column and stop labelling estimates "verified."
5. Gate lead capture behind auth + session link + dedup, or remove the regex path.
6. Decide on tools: either flip supportsTools for Gemini and set ENABLE_GEMINI_TOOLS, or delete 300 lines of handlers and the 186-line suffix. Right now you pay for both and get neither.
7. Delete enrichResponseWithDatabaseData and outputGuardrail.
8. Extract the nine content branches out of the POST handler into pure functions returning {text, chips, mode} — that alone makes them testable.

Not verified: whether discoverProjects, computeConversationState, or chipDedup internals hold up — did not read them. prompts/base.ts and blocks.ts (737 lines combined) also unreviewed; if the "Verified facts:" marker exists somewhere I didn't grep, finding #1's severity drops.