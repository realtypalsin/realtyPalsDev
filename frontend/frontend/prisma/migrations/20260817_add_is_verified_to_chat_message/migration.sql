-- AddColumn is_verified to ChatMessage
ALTER TABLE "chat_messages" ADD COLUMN "is_verified" BOOLEAN NOT NULL DEFAULT true;
