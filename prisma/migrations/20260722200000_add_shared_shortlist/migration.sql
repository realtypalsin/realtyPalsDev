-- CreateTable SharedShortlist
CREATE TABLE "shared_shortlists" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_slugs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL DEFAULT (now() + interval '30 days')
);

-- CreateIndex
CREATE INDEX "shared_shortlists_created_at_idx" ON "shared_shortlists"("created_at");
CREATE INDEX "shared_shortlists_expires_at_idx" ON "shared_shortlists"("expires_at");
