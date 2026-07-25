-- Additive only. No DROP, no column type changes, no data loss possible.
-- Reconciles the live DB with frontend/prisma/schema.prisma (the canonical schema).

-- 1. project_documents.file_size_bytes
--    Declared in schema and written by backend/src/routes/documents.ts:199 (file.size),
--    read by frontend DocumentsEditor / DocumentsTab / OverviewTab and ~30 seed scripts.
--    Missing in DB, which made every prisma.projectDocument query throw.
ALTER TABLE "project_documents" ADD COLUMN IF NOT EXISTS "file_size_bytes" INTEGER;

-- 2. shared_shortlists
--    Required by backend/src/routes/share.ts. Table was never created against this schema.
CREATE TABLE IF NOT EXISTS "shared_shortlists" (
    "id"            TEXT NOT NULL,
    "project_slugs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- 30-day TTL applied by the DB so share.ts does not have to supply it.
    "expires_at"    TIMESTAMP(3) NOT NULL DEFAULT (now() + interval '30 days'),
    CONSTRAINT "shared_shortlists_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "shared_shortlists_created_at_idx" ON "shared_shortlists"("created_at");
CREATE INDEX IF NOT EXISTS "shared_shortlists_expires_at_idx" ON "shared_shortlists"("expires_at");

-- 3. callback_requests lead-qualification columns
--    backend/src/routes/leads.ts already computes lead_score / lead_tier and the buyer
--    profile, but only forwards them to the webhook — nothing was persisted, so the
--    admin lead views and /admin/stats had no scores to read.
ALTER TABLE "callback_requests" ADD COLUMN IF NOT EXISTS "lead_score"        DOUBLE PRECISION;
ALTER TABLE "callback_requests" ADD COLUMN IF NOT EXISTS "lead_tier"         TEXT;
ALTER TABLE "callback_requests" ADD COLUMN IF NOT EXISTS "intent_tier"       TEXT;
ALTER TABLE "callback_requests" ADD COLUMN IF NOT EXISTS "loan_pre_approved" BOOLEAN;
ALTER TABLE "callback_requests" ADD COLUMN IF NOT EXISTS "ai_summary"        TEXT;
ALTER TABLE "callback_requests" ADD COLUMN IF NOT EXISTS "consent_given"     BOOLEAN;
ALTER TABLE "callback_requests" ADD COLUMN IF NOT EXISTS "projects_saved"    INTEGER DEFAULT 0;
ALTER TABLE "callback_requests" ADD COLUMN IF NOT EXISTS "projects_viewed"   INTEGER DEFAULT 0;
ALTER TABLE "callback_requests" ADD COLUMN IF NOT EXISTS "budget_min_cr"     DOUBLE PRECISION;
ALTER TABLE "callback_requests" ADD COLUMN IF NOT EXISTS "budget_max_cr"     DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS "callback_requests_lead_tier_idx" ON "callback_requests"("lead_tier");
CREATE INDEX IF NOT EXISTS "callback_requests_created_at_idx" ON "callback_requests"("created_at");
