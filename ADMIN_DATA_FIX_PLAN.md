# Admin Panel — DB Wiring Fix

Status: **code complete. One DB migration pending your approval.**

---

## The root cause was not what the first pass assumed

There are **two** `schema.prisma` files in this repo:

| File | Role |
|---|---|
| `frontend/prisma/schema.prisma` (32 KB) | **canonical.** `backend/package.json` pins `"prisma": { "schema": "../frontend/prisma/schema.prisma" }`, its `start` script runs `migrate deploy` against it, and every root script (`db:migrate`, `db:generate`, `db:push`, `db:studio`) does `cd frontend` first. Migrations live in `frontend/prisma/migrations/` (6, all applied). |
| `prisma/schema.prisma` (26.6 KB) | **orphan.** Nothing reads it. It has its own `prisma/migrations/` with 2 dirs, one of which (`20260722200000_add_shared_shortlist`) was never applied to any database. |

The manual edits went into the **orphan**, so they had no effect on the generated client, the DB, or the admin panel. That is why the graphs stayed empty.

## What the live DB actually contained (verified by querying it)

| Check | Result |
|---|---|
| `shared_shortlists` table | **absent** → `share.ts` broken at compile time and runtime |
| `project_documents.file_size_bytes` | **absent**, though the canonical schema declares it → **every `prisma.projectDocument` query threw**: `documents.ts:99`, `projects.ts:151`, `chat.ts:856` |
| `callback_requests` lead columns | **absent** (only the 9 base columns exist) |
| `FormStatus` real values | `new, reviewing, approved, rejected, clarification_requested` — `builderApplications.ts` was hardcoding `pending` and `under_review`, neither of which exists |
| `NewsStatus` real values | `draft, pending_approval, published, archived, rejected` — the news UI was checking for `approved`, which does not exist |
| Row counts | `projects` 81 · `builders` 64 · `callback_requests` 26 · `project_documents` 3 · `ai_usage_events` 13 · `user_memory` 12 |
| **`query_metrics` 0 · `property_events` 0 · `chat_sessions` 0 · `chat_messages` 0** | see "Not a code problem" below |

## Not a code problem: the analytics tables are empty

Every analytics chart draws from `query_metrics`, `property_events` and `chat_sessions`. All three have **zero rows**. No amount of endpoint fixing will populate them.

Worse, `chat_sessions` being 0 while `user_memory` has 12 rows means chat sessions are not being persisted at all, even though `chat.ts:1012/1333/1446` calls `chatSession.create`. **That is a separate live bug and is not fixed here** — it needs its own investigation.

Note also that `admin.ts` deliberately falls back to counting `projects`/`builders` when `query_metrics` is empty, so the "Top Sectors" and "Top Builders" charts render plausible-looking bars from project counts, not from real searches. Those bars are not search data.

---

## What was changed

### Migration (written, **NOT applied**)
`frontend/prisma/migrations/20260725120000_admin_data_reconcile/migration.sql` — additive only, no `DROP`, no type changes:
- `project_documents.file_size_bytes INTEGER`
- `shared_shortlists` table + 2 indexes, `expires_at` defaulting to `now() + 30 days`
- 10 lead-qualification columns on `callback_requests` + 2 indexes

### `frontend/prisma/schema.prisma` (canonical)
- `CallbackRequest`: added the 10 lead-qualification fields + `lead_tier` / `created_at` indexes
- Added `model SharedShortlist`

### `backend/src/routes/admin.ts`
- **new** `GET /projects/:id/documents` — resolves id-or-slug, matches on `project_id` OR `project_slug` (ProjectDocument has no relation to Project)
- **new** `GET /projects/:id/completeness` — wired to the existing `lib/completeness.ts`; responds unwrapped because the page does `setCompleteness(json)` directly
- `GET /news` — replaced the hardcoded `{ news: [] }` stub with a real `builderNews` query (excludes archived, includes builder, paginated)
- **new** `DELETE /news/:id` — soft delete via `archived_at`, not a hard delete
- `GET /stats` — restored real `lead_tier` counts and `avg(lead_score)`; it had been returning status counts mislabelled as HOT/WARM/COLD with `avgScore` hardcoded to 0
- `GET /callbacks` — `?tier=` now filters `lead_tier` (it was filtering `status`); added a separate `?status=`
- `GET /leads` — stopped swallowing errors into `{ leads: [], total: 0 }` + HTTP 200. That is precisely what made a broken query look like an empty table.

### `backend/src/routes/leads.ts`
- The lead score was computed and sent to the webhook but **never persisted**. `callbackRequest.create` now stores `lead_score`, `lead_tier`, `intent_tier`, `loan_pre_approved`, `consent_given`, `projects_saved`, `projects_viewed`, `budget_min_cr`, `budget_max_cr`, `ai_summary`.
- Fixed `projectFitsBudget`: it read `project.price_range_min` / `price_range_max`, **neither of which exists on Project**, so it was always `false` and every score was understated. Now derived from `unit_types` price range with `price_min_cr` as fallback.
- `GET /metrics` queried `builderLead` for `lead_score` / `lead_tier`, which that model does not have — the `.catch(() => 0)` returned 0 for every metric. Repointed at `callbackRequest`.

### `backend/src/routes/builderApplications.ts`
- Replaced the invented `FormStatus` (`pending`/`under_review`) with the real enum values.

### Frontend
- `admin/builder-applications/page.tsx` — status union, filter tabs and both status checks moved to real enum values (`new`/`reviewing` instead of `pending`)
- `admin/news/page.tsx` — interface now mirrors `BuilderNews`; `approved` → `published`; `rejection_reason` → `approval_notes`; `approved_at` → `published_at`; the phantom `category` and `views` fields replaced with builder name and publish time; delete confirm now says "Archive"; form's `category` select replaced with the real `link_type` / `link_target`
- `admin/leads/page.tsx` — interface now mirrors `CallbackRequest`; dropped the phantom `email` / `lead_type` / `project_id` / `follow_up_date` / `notes`; the "Type" column (which showed a hardcoded label) is now a real "Tier" column showing `lead_tier` + `lead_score`

---

## Verification so far

- `cd backend && npx tsc --noEmit` → **No errors found** (was 4 errors)
- `cd frontend && npx tsc --noEmit` → **1 error, pre-existing and unrelated**:
  `components/chat/MessageBubble.tsx(378,91)`: `streamingIntent` is `Record<string, unknown> | null | undefined` but `buildAdaptiveThinkingLabel` takes `| null`. That file is part of your uncommitted chat work; not touched. One-line fix is `intent ?? null`.

## Pending — needs your go-ahead

```bash
cd frontend && npx prisma migrate deploy
```

`_prisma_migrations` shows all 6 existing migrations applied, so this applies exactly one new file. Additive only — no data can be lost. After it runs:

1. `cd frontend && npx prisma generate`
2. `cd backend && npx tsc --noEmit`
3. Restart the backend dev server (it was stopped to release the Prisma engine DLL): `npm run dev:backend`
4. Walk the admin pages and record results

## Still open (reported, not fixed)

1. **`chat_sessions` = 0** — chat sessions are not persisting. Separate bug, needs its own investigation.
2. **Analytics tables empty** — no charts can show real search/engagement data until `query_metrics` and `property_events` start receiving rows. Related to (1), since both are written from the chat path.
3. **News create/update is dead** — `NewsForm` posts to `/api/builder/news`; `frontend/app/api/builder/` does not exist. Only listing and archiving work.
4. **The orphan `prisma/` directory should be deleted** — a second schema plus a second migrations folder is what caused this whole failure, and it will cause it again. Not deleted: that needs your explicit yes.
5. **Metro walk-times** — `model Connectivity` has `distance_km` and no walk-minutes column, so the "10-minute walk to Sector 76 metro station" in the chat reply is not read from the DB. Not investigated yet; per CLAUDE.md a derived figure must not be asserted as fact.
