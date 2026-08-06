-- CreateTable ChannelPartner
CREATE TABLE "channel_partners" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "website" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "operating_cities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "primary_contact" TEXT,
    "contact_phone" TEXT,
    "contact_email" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verification_date" TIMESTAMP(3),
    "total_leads" INTEGER NOT NULL DEFAULT 0,
    "total_conversions" INTEGER NOT NULL DEFAULT 0,
    "conversion_rate_pct" DOUBLE PRECISION,
    "rera_compliant" BOOLEAN NOT NULL DEFAULT false,
    "credai_member" BOOLEAN NOT NULL DEFAULT false,
    "specializations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "commission_rate_pct" DOUBLE PRECISION,
    "payment_terms" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channel_partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable ChannelLead
CREATE TABLE "channel_leads" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "user_id" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "interested_sectors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "budget_range" TEXT,
    "interested_bhk" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "status" TEXT NOT NULL DEFAULT 'new',
    "conversion_date" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channel_leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "channel_partners_name_key" ON "channel_partners"("name");

-- CreateIndex
CREATE UNIQUE INDEX "channel_partners_slug_key" ON "channel_partners"("slug");

-- CreateIndex
CREATE INDEX "channel_partners_type_idx" ON "channel_partners"("type");

-- CreateIndex
CREATE INDEX "channel_partners_is_active_idx" ON "channel_partners"("is_active");

-- CreateIndex
CREATE INDEX "channel_partners_created_at_idx" ON "channel_partners"("created_at");

-- CreateIndex
CREATE INDEX "channel_leads_partner_id_idx" ON "channel_leads"("partner_id");

-- CreateIndex
CREATE INDEX "channel_leads_user_id_idx" ON "channel_leads"("user_id");

-- CreateIndex
CREATE INDEX "channel_leads_status_idx" ON "channel_leads"("status");

-- CreateIndex
CREATE INDEX "channel_leads_created_at_idx" ON "channel_leads"("created_at");

-- AddForeignKey
ALTER TABLE "channel_leads" ADD CONSTRAINT "channel_leads_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "channel_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_leads" ADD CONSTRAINT "channel_leads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
