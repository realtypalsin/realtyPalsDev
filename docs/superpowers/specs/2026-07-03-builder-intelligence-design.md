# Builder Intelligence & Cost Plans — Design

Date: 2026-07-03
Status: Approved
Source data: `newFiles.md`, `newFiles2.md` (9 builders, 10 projects, NCR/Noida)

## Problem

`newFiles.md`/`newFiles2.md` contain builder legal/financial intel, per-project
cost sheets, payment plans, and persona-fit scoring not currently in the DB.
Existing `Builder`/`Project` schema partially covers this; gaps need
schema extension, admin CRUD, and UI to surface them.

## Decisions (from clarifying questions)

- Legal/insolvency risk: publish as-is, cite `data_source`. No manual
  pre-verification, no softening of real builders' negative claims.
- UI/UX redesign scope: new Builder tab only, not app-wide.
- Builder UI placement: new tab in `ProjectDetailPanel.tsx` `SECTION_TABS`,
  not embedded in Overview.
- Segment Fit / Intelligence View: admin-only for now, not surfaced to
  end users in chat/UI.

## Phase 1 — Schema extension + seed data

### `Builder` (add fields)

```prisma
cin                  String?
rera_promoter_id     String?
financial_hygiene_score Int?
outstanding_dues_cr  Float?
legal_entities       Json?     // [{name, cin, role}]
executives           Json?     // [{name, designation}]
funding_banks        String[]
audit_flags_log      String?
```

Rationale: mirrors existing `PaymentPlan.milestones` / `CostSheet.plc_charges`
pattern of Json fields on a flat model, instead of normalizing into new
relational tables (SPV table, executives table). This data is read-only
display, never queried relationally — normalization buys nothing here.

### `Project` (add fields — escrow/registry diligence)

```prisma
escrow_verified            Boolean?
escrow_bank_name           String?
registry_status            String?
registry_embargo_reasons   String[]
nclt_moratorium_active     Boolean?
```

`lat`/`lng` already exist on `Project` — populate from newFiles.md, no
schema change.

### Reused, no schema change

- Segment Fit (0-100 persona scores) → `PersonaProfile.persona_descriptions` (Json)
- Intelligence View (buy/avoid/caution prose) → `RecommendationProfile`
  thesis fields (`primary_thesis`, `family_thesis`, `investor_thesis`,
  `luxury_thesis`, `risk_thesis`, `walk_away_conditions`, `admin_notes`)

### `IntelligenceAudit`

Not extended. Stays scoped to `project_id`. Builder-level admin edits go
unaudited — single super-admin, low risk, not worth a nullable-FK schema
change.

### Seed data

Migration + seed script inserts/updates the 9 builders and 10 projects
from newFiles.md/newFiles2.md: cost sheets, payment plans, coordinates,
legal/insolvency flags (cited via `data_source`), persona scores,
intelligence prose.

## Phase 2 — Admin CRUD

- Widen `BuilderPatchSchema` (`backend/src/routes/admin.ts`) to cover all
  new + existing Builder fields.
- New routes (pattern-matched to existing `dna`/`decision-profile` upsert
  routes):
  - `PATCH /admin/projects/:id/payment-plan` — upsert `PaymentPlan`
  - `PATCH /admin/projects/:id/cost-sheet` — upsert `CostSheet`
- Verify `PersonaProfilePatchSchema`/`RecommendationProfilePatchSchema`
  already allow `persona_descriptions` / thesis fields; widen if not.

## Phase 3 — Builder tab UI

`frontend/components/ProjectDetailPanel.tsx`:
- Add `'Builder'` to `SECTION_TABS`.
- Lazy-load on first tab open, same state shape as existing
  `paymentPlan`/`costSheet` (`{ loaded, available, data, message? }`).
- Sections: Identity, Track Record, Compliance (legal_flag surfaced
  prominently, visually flagged if set), Recognition.
- Long text fields (`company_overview`, `audit_flags_log`) collapsible.
- Styling: Emil Kowalski-tier polish, scoped to this tab only — no changes
  to other tabs or app-wide styles.

## Phase 4 — Chat/discovery Groq fix

`backend/src/routes/chat.ts`: when a builder-lookup intent is detected on
the Groq fallback path, inject `getBuilderRecord()` result directly into
the Groq prompt context for that turn, replacing the current pure-deflection
governance block. OpenAI path unchanged (already calls `getBuilderRecord`
via tool).

## Out of scope

- Multi-role admin (single super-admin only, per user).
- Surfacing Segment Fit / Intelligence View to end users.
- App-wide UI redesign.
- Normalizing SPV/executive lists into relational tables.
