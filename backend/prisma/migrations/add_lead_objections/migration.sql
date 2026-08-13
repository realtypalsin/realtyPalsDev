-- Add LeadObjection table for Phase 2: Ghost Pool rejection tracking
CREATE TABLE "lead_objections" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "callback_request_id" TEXT NOT NULL,
  "project_slug" TEXT NOT NULL,
  "project_name" TEXT,
  "reason_category" TEXT NOT NULL, -- "possession", "price", "product_mix", "location", "legal", "financing"
  "reason_text" TEXT NOT NULL,
  "confidence_score" FLOAT,
  "extracted_from_message_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "lead_objections_callback_request_id_fkey" FOREIGN KEY ("callback_request_id") REFERENCES "callback_requests" ("id") ON DELETE CASCADE,
  CONSTRAINT "lead_objections_message_id_fkey" FOREIGN KEY ("extracted_from_message_id") REFERENCES "chat_messages" ("id") ON DELETE SET NULL
);

CREATE INDEX "lead_objections_callback_request_id_idx" ON "lead_objections"("callback_request_id");
CREATE INDEX "lead_objections_project_slug_idx" ON "lead_objections"("project_slug");
CREATE INDEX "lead_objections_reason_category_idx" ON "lead_objections"("reason_category");
