-- CreateTable PropertyFeedback
CREATE TABLE "property_feedback" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "sentiment" TEXT NOT NULL,
    "reasons" TEXT[],
    "rating" INTEGER,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_feedback_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "property_feedback" ADD CONSTRAINT "property_feedback_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_feedback" ADD CONSTRAINT "property_feedback_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "property_feedback_session_id_idx" ON "property_feedback"("session_id");

-- CreateIndex
CREATE INDEX "property_feedback_project_id_idx" ON "property_feedback"("project_id");

-- CreateIndex
CREATE INDEX "property_feedback_sentiment_idx" ON "property_feedback"("sentiment");
