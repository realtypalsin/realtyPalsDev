# MEMORY.md

## Session Decisions & Context
Record significant decisions, architectural choices, and context here.
Format: What was decided / Why / What was rejected and why.

---

## Current Session (2026-08-16)

### Decision: Gemini as Primary AI Provider
**What:** Set Google Gemini as primary AI provider, with fallback chain through OpenAI → Claude → Groq → OpenAI cheaper.
**Why:** User specified Gemini as primary to leverage Google's latest models and reduce OpenAI dependency.
**Rejected:** Maintaining Claude (Anthropic) as primary — now secondary in fallback chain.
**Action Required:** Install `@ai-sdk/google` package and wire Gemini into chat route handlers.

### Decision: Supabase Auth (Not Better Auth)
**What:** Confirmed authentication is Supabase-based (JWT tokens, Supabase auth endpoints).
**Why:** Live codebase uses `frontend/lib/auth.ts` with Supabase token verification, not Better Auth.
**Rejected:** Better Auth documentation (was planned, never implemented).
**Note:** Update any onboarding docs that reference Better Auth.

### Decision: CLAUDE.md Comprehensive Refresh
**What:** Rewrote CLAUDE.md to reflect actual stack (Supabase, current AI SDKs, dark mode support).
**Why:** Previous version had stale sections (dead session-start protocol links, wrong auth lib, unclear AI provider priority).
**Removed:** Session start protocol deadlinks, Better Auth references, dark-mode rule ambiguity.
**Added:** Clear AI provider fallback chain, Gemini setup notes, MEMORY.md/ERRORS.md structure.

### Analysis: Admin Panel & Lead Enrichment
**What:** Audited admin panel, leads data model, and chat integration.
**Current State:** 
- Leads show only basic fields (name, phone, lead_score, ai_summary)
- Rich context exists but unexposed: ChatSession summaries (location/financial/timeline), property reactions, full transcript
- Sales team gets tier + score, not reasoning or buyer context
**Gap:** CallbackRequest not linked to ChatSession. Sales team can't access conversation context.
**Recommendation:** Add `chat_session_id` FK to CallbackRequest. Sales team then sees full profile.
**Data Enrichment Path:**
  1. Link CallbackRequest → ChatSession
  2. Populate CallbackRequest with ChatSession summaries at callback time (optional, for denorm)
  3. Sales UI shows: summaries + property reactions + transcript link
**Missing Competitive Features (vs Claude):**
  1. Objection aggregation (LeadObjection model unused) — "75% ask about possession"
  2. Comparison reasoning (not just A vs B, but why A ranked higher)
  3. Community sentiment (anonymized: "other buyers saved 3 similar projects")
  4. Explainable lead score (not just "82", but "timeline ✓ budget ✓ metro ✓")
  5. Chat integration for database queries (amenities, payment plans, builder history)
**Action:** Document all in CLAUDE.md. Prioritize link CallbackRequest → ChatSession as P0 (unblocks sales team workflow).

### Decision: CLAUDE.md Premium Doc Pass + Chat Design Philosophy
**What:** Reframed CLAUDE.md's Purpose section as a working asset, not a rulebook. Added new top-level section "Chat Experience: Meeting the ChatGPT Power-User" (9 concrete expectations: no form-filling, persistent memory, correction without restart, meta-awareness, any-DB-fact answered, reasoning shown not asserted, proactive follow-ups, escalation as favor not funnel, capable-peer tone).
**Why:** User explicitly asked to design the chat from the lens of a ChatGPT power-user encountering RealtyPals while property-hunting — bar is "would this user notice we're worse than their default assistant," not "is this a fine real-estate chatbot."
**Rejected:** Nothing removed — additive doc pass only.
**Note:** This section is the standard for scoring future chat-feature priority; use it when deciding what to build next in the chat interface.

### Decision: Lead-Gen v2 Refinements
**What:** Added 5 further lead-gen refinements to CLAUDE.md's Lead Enrichment Strategy, all built on top of the (still not implemented) `chat_session_id` FK: talk-track auto-draft, duplicate-lead detection, lead-source attribution, soft re-engagement queue (for CTA decliners), urgency/recency surfacing.
**Why:** User asked directly whether lead-gen could be refined further beyond Turn 3's work; these close the gap between "sales sees a score" and "sales sees why this person converted and how to open the call."
**Rejected:** No new infra proposed — deliberately sequenced as extensions of the existing FK link so none require new schema beyond it.
**Action Required (unchanged, still outstanding):** Implement `chat_session_id` FK first — it's the dependency for all 5 items above plus the original enrichment plan.

---

## Past Sessions
(Archive here as sessions complete)

---
