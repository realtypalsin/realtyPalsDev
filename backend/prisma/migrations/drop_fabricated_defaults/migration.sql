-- Drop schema defaults that invent project- and builder-specific facts.
--
-- A `@default` on a factual column is a fabrication with no author. It renders
-- as a specific, checkable figure, it passes every provenance check we have,
-- and nothing downstream can tell it from a researched value.
--
-- Measured against this database on 4 Sep 2026, immediately after a buyer was
-- shown one of them in an answer:
--
--   builders.projects_delivered_count   default 18    — 105 rows, all NULL
--                                                       (never fired; a landmine)
--   projects.ceiling_height_ft          default 10.2  — 190 of 280 rows are 10.2
--   projects.mobile_network_rating      default 4     — 219 of 280 rows are 4
--   projects.lifts_per_tower            default 3     — 166 of 280 rows are 3
--
-- Dropping the default is DDL only: no row is read, written or deleted, and
-- every existing value is preserved exactly. It changes what happens on the
-- NEXT insert that omits the column — NULL, which reads as "not recorded",
-- instead of a number nobody measured.
--
-- Existing rows already carrying a default are handled in application code
-- rather than here, because roughly a third of each column is real and there is
-- no way in SQL to tell a researched 10.2 from an inherited one. See
-- SCHEMA_DEFAULT_SENTINELS in src/lib/projectExposure.ts: a value equal to its
-- old default is withheld from buyer-facing output as `missing` tier.
--
-- Reversible with ALTER COLUMN ... SET DEFAULT <value>.

ALTER TABLE "builders" ALTER COLUMN "projects_delivered_count" DROP DEFAULT;
ALTER TABLE "projects"  ALTER COLUMN "ceiling_height_ft"        DROP DEFAULT;
ALTER TABLE "projects"  ALTER COLUMN "mobile_network_rating"    DROP DEFAULT;
ALTER TABLE "projects"  ALTER COLUMN "lifts_per_tower"          DROP DEFAULT;
