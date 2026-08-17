-- AddColumn chat_session_id to CallbackRequest
ALTER TABLE "callback_requests" ADD COLUMN "chat_session_id" TEXT;

-- AddForeignKey
ALTER TABLE "callback_requests" ADD CONSTRAINT "callback_requests_chat_session_id_fkey" FOREIGN KEY ("chat_session_id") REFERENCES "chat_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddIndex
CREATE INDEX "callback_requests_chat_session_id_idx" ON "callback_requests"("chat_session_id");
