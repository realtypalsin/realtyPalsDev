-- Index for possession_date filtering (used in every possession_year_max query)
CREATE INDEX IF NOT EXISTS "projects_possession_date_idx" ON "projects"("possession_date");

-- Composite index for budget filter subquery on unit_types
CREATE INDEX IF NOT EXISTS "unit_types_budget_idx" ON "unit_types"("project_id", "price_min_cr", "price_max_cr");

-- Explicit index on builder_id for project joins
CREATE INDEX IF NOT EXISTS "projects_builder_id_idx" ON "projects"("builder_id");
