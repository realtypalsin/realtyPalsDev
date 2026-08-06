-- Phase 0: Add conversation anchor fields to chat_sessions
-- Resolves pronouns in DRILLDOWN queries by tracking which project is in focus

-- Add focus_project_id and focus_set_at columns
ALTER TABLE "chat_sessions"
ADD COLUMN "focus_project_id" TEXT,
ADD COLUMN "focus_set_at" TIMESTAMP(3);

-- Create index for fast lookups by focus_project_id
CREATE INDEX "chat_sessions_focus_project_id_idx" ON "chat_sessions"("focus_project_id");

-- No foreign key constraint intentionally — focus_project_id may be stale
-- after project deletion. Cleanup is handled by data layer.
