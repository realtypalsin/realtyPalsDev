-- Payment plans: one-to-one -> one-to-many
--
-- A project offers several payment plans (construction-linked, down payment,
-- investor, subvention, ...). The unique constraint on project_id allowed only
-- one row per project. Replace it with a composite unique on
-- (project_id, plan_type) so many plans coexist while upserts stay keyed and
-- duplicate plans of the same type are still rejected.

-- 1. Drop the single-column unique. Prisma names it <table>_<column>_key, but
--    an older hand-written migration may have created a named constraint —
--    handle both, and do nothing if neither exists.
DROP INDEX IF EXISTS "payment_plans_project_id_key";
ALTER TABLE "payment_plans" DROP CONSTRAINT IF EXISTS "payment_plans_project_id_key";
ALTER TABLE "payment_plans" DROP CONSTRAINT IF EXISTS "payment_plans_project_id_unique";

-- 2. New columns. Existing rows are construction-linked plans at position 0,
--    which is what they were being treated as.
ALTER TABLE "payment_plans"
  ADD COLUMN IF NOT EXISTS "plan_type" TEXT NOT NULL DEFAULT 'construction_linked';

ALTER TABLE "payment_plans"
  ADD COLUMN IF NOT EXISTS "sort_order" INTEGER NOT NULL DEFAULT 0;

-- 3. Composite unique + ordering index.
CREATE UNIQUE INDEX IF NOT EXISTS "payment_plans_project_id_plan_type_key"
  ON "payment_plans" ("project_id", "plan_type");

CREATE INDEX IF NOT EXISTS "payment_plans_project_id_sort_order_idx"
  ON "payment_plans" ("project_id", "sort_order");
