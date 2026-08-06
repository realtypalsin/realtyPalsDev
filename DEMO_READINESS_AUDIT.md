# RealtyPals — Demo Readiness Audit

**Date**: 2026-08-06
**Scope**: Chat precision, property-tab hardcoding, DB field coverage, security, conversational UX, repo cleanup.
**Method**: Static audit (3 parallel explorers + prior infra audit synthesis). No code changed.

---

## 1. Action Plan

### Before demo — 6.5h total

| # | Fix | File | Effort |
|---|-----|------|--------|
| 1 | Remove hardcoded Google Maps API key fallback | `LocationTab.tsx:151` | 30m |
| 2 | Replace rental-yield/breakeven invented formulas with real fin-intel fields | `IntelligenceTab.tsx:146` | 2h |
| 3 | Replace hardcoded 8.5% interest rate with configurable/DB value | `ProjectPricingTab.tsx:41` | 1h |
| 4 | Replace mock inventory array with `unit_inventory` query | `ResidencesTab.tsx:119-124` | 2h |
| 5 | Replace hardcoded channel partners with `project_channel_partners` join | `BuilderTab.tsx:35-41` | 1h |

### Before launch — 8h total

| # | Fix | File | Effort |
|---|-----|------|--------|
| 6 | Cache invalidation on admin edits (project update → expire discovery + gateway cache) | `admin.ts` + gateway cache | 1h |
| 7 | Run DB migration: `unit_inventory`, `project_channel_partners`, `unit_types` columns | migration (§3) | 4h |
| 8 | Replace cost-sheet hardcoded rates (stamp duty, registration, GST, club, IFMS, utilities, PLC) with `project_cost_sheets` lookups | `ProjectPricingTab.tsx:103-108` | 1h |
| 9 | Add `LIMIT` to unbounded daily analytics query | `admin.ts:958-961` | 1h |
| 10 | Index `CallbackRequest.status`, `SiteVisitRequest.status` | migration | 30m |

### Before scaling — deferred, no urgency

- Ambiguous-query loader UX, tool-call → tab auto-jump (§5)
- Bulk cleanup of remaining ~30 non-critical hardcoded literals (§2)
- Slow-query logging + `EXPLAIN ANALYZE` alerts
- Migrate in-memory caches (Gateway/QueryPlanner/LLMResponse) to Redis
- Semantic search instead of deterministic SQL "RAG"
- Chat engagement weighting via `PropertyEvent` aggregation
- Structured logging in admin routes (replace `console.error`)
- Archive root-level audit docs (§6)

---

## 2. Property Tab Hardcoding Audit

38+ hardcoded literals, 12+ invented formulas across 6 tabs. Full detail kept for reference; only CRITICAL items are actioned in §1.

### OverviewTab.tsx — 11 issues, no formulas

Static fallbacks for milestones, status banner, "Perfect For" cards, tower count, area, open space %, RERA number, builder, green rating. All should read from `d?.*` project fields. Missing `channel_partners` / `all_amenities` integration.

### IntelligenceTab.tsx — CRITICAL, worst offender

| Field | Current | Severity |
|-------|---------|----------|
| Rental Yield | `3.2 + (pricePsf % 7) * 0.1` — meaningless math | **CRITICAL** |
| Breakeven Years | `6.8 - (builder_score / 100)` — unjustified constants | **CRITICAL** |
| Absorption Rate | `Math.round(totalUnits * 0.22)` — arbitrary 22% | HIGH |
| Unsold Months | hardcoded `'7.8 Months'` | HIGH |
| Investment Grade, Demand/Supply Ratio, base price, sector CAGR | hardcoded/fallback | HIGH |
| Avg Buyer Age, chart colors, 5yr scenarios | hardcoded | LOW–MED |

6 invented formulas (3 critical). Directly violates "no made-up numbers" rule.

### ResidencesTab.tsx — 11 issues, 3 formulas

Mock 4-row availability table never refreshes (fix in §1.4). Carpet area (`area * 0.65`), balcony area (`area * 0.08`), RERA carpet (`carpetArea * 0.94`) all formula fallbacks — should use `unit_types.carpet_to_super_ratio_pct` / `balcony_area_sqft` (both already exist in DB, just unused). Tower/floor dropdowns and unit configs hardcoded, not per-project.

### ProjectPricingTab.tsx — CRITICAL, highest financial impact

Interest rate 8.5%, stamp duty 6%, registration 1%, GST 5%, club ₹2L, IFMS ₹75K, utilities ₹1.25L, PLC (`baseCost * 0.02`), 4 hardcoded "Current Offers" cards. All should read from `project_cost_sheets` (table exists, columns unverified — see §3). Wrong values here mean wrong EMI/tax shown to buyer — worst possible place for fake data.

### LocationTab.tsx — 7 issues, 1 missing integration

Lat/lng falls back to hardcoded `28.535/77.391`. Connectivity, quick suggestions, commute times, map filter categories all hardcoded. No real commute API — string-matched approximations only.

### BuilderTab.tsx — 11+ issues

Channel partners (5, hardcoded) and featured projects (3, hardcoded) never vary per project — fix in §1.5. Customer rating (`4.7/5, 1200+ reviews`) and awards/media mentions are entirely fabricated with no backing DB table — flag as "no review system" rather than fake data if kept.

---

## 3. Database Gaps

Verified against `docs/dbStructure.sql` + `frontend/prisma/schema.prisma`.

**Missing tables**
- `project_channel_partners` — junction (project ↔ channel_partner, `is_featured` flag)
- `unit_inventory` — per-unit tracking (tower, floor, unit_no, facing, view, status)

**Missing `unit_types` columns**: `layout_variant_name`, `tower_association`, `built_up_area_sqft`, `utility_area_sqft`, `common_area_shaft_sqft`, `efficiency_rating`
Already present: `carpet_to_super_ratio_pct`, `balcony_area_sqft`, `layout_efficiency_pct`

**Missing `projects` columns**: `price_includes_plc`, `price_includes_club`, `price_includes_taxes` (all boolean)

**`project_cost_sheets`**: table exists (dbStructure.sql:770) — verify `project_id` FK present and all rate columns exist (`stamp_duty_pct`, `registration_pct`, `gst_rate_pct`, `club_membership`, `ifms`, `utilities_cost`, `plc_percentage`).

**Migration** (not yet run):

```sql
ALTER TABLE unit_types
  ADD COLUMN IF NOT EXISTS layout_variant_name TEXT DEFAULT 'Type A',
  ADD COLUMN IF NOT EXISTS tower_association TEXT[] DEFAULT ARRAY['Tower A'],
  ADD COLUMN IF NOT EXISTS built_up_area_sqft INTEGER,
  ADD COLUMN IF NOT EXISTS utility_area_sqft INTEGER,
  ADD COLUMN IF NOT EXISTS common_area_shaft_sqft INTEGER,
  ADD COLUMN IF NOT EXISTS efficiency_rating TEXT DEFAULT 'Excellent';

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS price_includes_plc BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS price_includes_club BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS price_includes_taxes BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS project_channel_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  channel_partner_id UUID NOT NULL REFERENCES channel_partners(id) ON DELETE CASCADE,
  is_featured BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, channel_partner_id)
);

CREATE TABLE IF NOT EXISTS unit_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  unit_type_id UUID NOT NULL REFERENCES unit_types(id) ON DELETE CASCADE,
  tower_name TEXT NOT NULL,
  floor_number INTEGER NOT NULL,
  unit_number TEXT NOT NULL,
  facing TEXT,
  view TEXT,
  status TEXT DEFAULT 'available',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, tower_name, floor_number, unit_number)
);

CREATE INDEX idx_project_channel_partners_project_id ON project_channel_partners(project_id);
CREATE INDEX idx_unit_inventory_project_id ON unit_inventory(project_id);
CREATE INDEX idx_unit_inventory_status ON unit_inventory(status);
```

---

## 4. Security

### Google Maps API key exposed — CRITICAL

```js
// LocationTab.tsx:151
src={`https://www.google.com/maps/embed/v1/place?key=${
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
  'AIzaSyATyi7vftl_mMoJSy5v5yIhvkAynk1UWRQ'  // hardcoded fallback — exposed in bundle + git history
}&q=${address}`}
```

**Risk**: quota abuse, token theft, key visible in network tab/bundle/git history.

**Fix**:
1. Drop fallback → `process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''`
2. Falsy key → render "Map unavailable", not broken iframe
3. Confirm env var set in `.env.local` + production
4. Add referrer restriction (`*.realtypals.com`) in Google Cloud Console

**Alternative**: swap for existing Leaflet map (`map.tsx`) — removes key exposure entirely.

### Everything else — clean
`NEXT_PUBLIC_*` vars safe by design. No leaked bearer tokens/DB passwords. Server secrets (`GROQ_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`) stay server-side. `.gitignore` excludes `.env*`.

---

## 5. Conversational UX

**Working**:
- Ambiguous-intent clarification live (`chat.ts:810-814`) — e.g. "2BHK" alone triggers "Which sector?" + chips, no silent failure.
- 11 on-demand tab tools wired (`tools.ts:21-300`) — payment plan, floor plans, cost sheet, buyer fit, construction status, project intelligence, amenities, images, price history, financial details, sector projects. Callable mid-conversation from any tab, results surface as chat prose.

**Gap**: tool calls return data but don't navigate to the matching tab. User asks "payment plan" → gets answer in chat, has to click Pricing tab manually.

**Fix** (1h, deferred to launch phase): tool call emits `{ action: 'open_tab', tab: 'Pricing' }` alongside data, model can say "Opening Pricing tab..." while jumping there.

---

## 6. Repo Cleanup — proposal only, no deletions made

**Archive to `docs/audits/`**: `CHAT_RAG_INFRA_AUDIT.md`, `DB_UI_FIELD_AUDIT.md`, `FULL_DB_ALIGNMENT_AUDIT.md` (phase snapshots) → `docs/superpowers/PHASE5_IMPLEMENTATION.md`.

**Delete candidates** (needs explicit approval):
- `AGENTS.md` — contains unresolved merge conflict markers, duplicates GEMINI.md
- `GEMINI.md` — identical/redundant to AGENTS.md
- `STATE.md` — stale monitor file ("Last run: never")
- `ragdoc.md` — describes RAG that audit found isn't real RAG; likely stale

**Keep**: `CLAUDE.md`, `README.md` (verify integrity), `DEPLOY.md`, `.mcp.json`, `package.json`, `vercel.json`, `swagger.json`

---

No code changed this turn. Ready for implementation review.
