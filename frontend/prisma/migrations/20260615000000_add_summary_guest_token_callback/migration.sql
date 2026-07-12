-- Add summary field to chat_sessions
ALTER TABLE "chat_sessions" ADD COLUMN IF NOT EXISTS "summary" TEXT;

-- Make user_id optional in user_memory and add guest_token
ALTER TABLE "user_memory" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "user_memory" ADD COLUMN IF NOT EXISTS "guest_token" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "user_memory_guest_token_key" ON "user_memory"("guest_token");

-- Create callback_requests table
CREATE TABLE IF NOT EXISTS "callback_requests" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "project_name" TEXT,
    "project_slug" TEXT,
    "user_id" TEXT,
    "guest_token" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "callback_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "callback_requests_project_slug_idx" ON "callback_requests"("project_slug");
