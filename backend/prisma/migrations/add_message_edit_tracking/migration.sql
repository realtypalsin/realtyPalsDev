-- AddColumn edited_at to ChatMessage
ALTER TABLE "chat_messages" ADD COLUMN "edited_at" TIMESTAMP(3);
