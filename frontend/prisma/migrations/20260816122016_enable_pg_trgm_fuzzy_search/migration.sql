-- Phase 4.2: Enable pg_trgm extension for fuzzy string matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN index on project.name for efficient similarity searches
-- Enables fast <-> operator queries (SELECT * FROM project WHERE name <-> 'query' < 0.3)
CREATE INDEX IF NOT EXISTS idx_project_name_trgm ON "Project" USING gin(name gin_trgm_ops);

-- Create GIN index on builder.name for builder fuzzy matching
CREATE INDEX IF NOT EXISTS idx_builder_name_trgm ON "Builder" USING gin(name gin_trgm_ops);

-- Create GIN index on project.sector for sector fuzzy matching
CREATE INDEX IF NOT EXISTS idx_project_sector_trgm ON "Project" USING gin(sector gin_trgm_ops);
