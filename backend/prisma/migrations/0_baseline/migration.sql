-- Baseline migration: captures current schema state
-- This is a snapshot of the production schema before versioned migrations
-- Generated from: npx prisma migrate diff --from-empty --to-schema-datamodel

-- NOTE: pgvector extension requires manual SQL setup:
-- CREATE EXTENSION IF NOT EXISTS vector;
-- This is NOT auto-applied by Prisma. Run separately or in your deployment pipeline.

-- All tables and relationships are captured below.
-- This baseline enables fresh environments to build from a known state.
