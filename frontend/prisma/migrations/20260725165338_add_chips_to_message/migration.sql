-- AlterTable
ALTER TABLE "chat_messages" ADD COLUMN "chips" JSONB NOT NULL DEFAULT '[]';
