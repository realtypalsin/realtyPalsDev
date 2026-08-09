-- Phase 0: Conversation Memory Store
-- ⚠️ REVIEW THIS FILE BEFORE RUNNING
-- Run: npx prisma migrate dev --name phase0_conversation_memory

-- Session-scoped conversation memory
-- Stores user intent + reactions per chat session
CREATE TABLE "session_memory" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "session_id" TEXT NOT NULL UNIQUE,
  "user_id" TEXT,

  -- Extracted intent (snapshot from intent extraction)
  "extracted_intent" JSONB,

  -- Property reactions tracking
  "property_reactions" JSONB DEFAULT '[]'::jsonb,

  -- Saved property IDs from this session
  "saved_property_ids" TEXT[] DEFAULT ARRAY[]::text[],

  -- Timestamps
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "session_memory_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id") ON DELETE CASCADE
);

CREATE INDEX "session_memory_session_id_idx" ON "session_memory"("session_id");
CREATE INDEX "session_memory_user_id_idx" ON "session_memory"("user_id");

-- Response grading table (Phase 1)
-- Tracks AI response quality for iterative improvement
CREATE TABLE "response_grade" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "session_id" TEXT NOT NULL,
  "message_id" TEXT,

  -- Outcome evaluation
  "outcome_achieved" BOOLEAN,
  "grade_score" INTEGER, -- 0-100
  "grading_reason" TEXT,

  -- What outcome was achieved?
  "outcomes" TEXT[] DEFAULT ARRAY[]::text[], -- ["saved", "callback_clicked", "question_asked"]

  -- Feedback for retry
  "should_retry" BOOLEAN DEFAULT false,
  "retry_count" INTEGER DEFAULT 0,
  "max_retries" INTEGER DEFAULT 1,

  -- Tracking
  "graded_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "response_grade_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id") ON DELETE CASCADE
);

CREATE INDEX "response_grade_session_id_idx" ON "response_grade"("session_id");
CREATE INDEX "response_grade_outcome_achieved_idx" ON "response_grade"("outcome_achieved");
CREATE INDEX "response_grade_grade_score_idx" ON "response_grade"("grade_score");
