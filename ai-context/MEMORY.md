# MEMORY.md — RealtyPals decisions log

## 2026-06-18 — Demo-hardening pass (partner demo prep)

**Decided:** Enrich the live **Express** chat backend (`backend/src`) with real tools rather than migrating the frontend to the Next.js AI-SDK route (`frontend/app/api/v1/chat/route.ts`).
**Why:** The live UI's chat stream already calls Express via `backend-api.ts`; the Next AI-SDK route was dead code. Enriching Express was the lowest-risk path to a demo-ready "answer anything" advisor.
**Rejected:** Migrating to the Next route (better long-term architecture, but bigger change + SSE-format/auth rework + untested live = too risky pre-demo).
**Consequence:** Two backends still coexist. The Next `/api/v1/chat/route.ts` is now dead — delete it during the post-demo consolidation.

**Decided:** Identity is verified **server-side from the Supabase JWT** (via Supabase REST `/auth/v1/user`), never from the client `x-user-id` header.
**Why:** Original code trusted a client-set header → full IDOR/impersonation. Supabase already issues real JWTs, so this is "verify existing sessions," not "build auth."
**Applies to:** Express routes (`lib/auth.ts` → `verifyUser`) AND Next routes (`lib/serverAuth.ts` → `verifyRequestUser`). `ALLOW_INSECURE_USERID=1` is a dev-only escape hatch — keep OFF in prod/demo.

**Decided:** AI must never fabricate data. Removed the hardcoded `market_intel` builder stats; builder facts now come from a real DB lookup (`builder_lookup`); web facts via `web_search` (source-cited). Tool-call loop capped at 4.

See `FinalAudit.md` (original audit) and `FinalAudit2.md` (post-fix re-audit + pre-demo runbook) for full detail.
