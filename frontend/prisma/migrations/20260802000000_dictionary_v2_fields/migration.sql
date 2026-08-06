-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ConnectivityType" ADD VALUE 'park';
ALTER TYPE "ConnectivityType" ADD VALUE 'it_park';
ALTER TYPE "ConnectivityType" ADD VALUE 'commercial';

-- AlterTable
ALTER TABLE "connectivity" ADD COLUMN     "category_rank" INTEGER,
ADD COLUMN     "extra_detail" TEXT,
ADD COLUMN     "is_operational" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "peak_travel_time_min" INTEGER,
ADD COLUMN     "rating" DOUBLE PRECISION,
ADD COLUMN     "travel_mode" TEXT,
ADD COLUMN     "travel_time_min" INTEGER;

-- AlterTable
ALTER TABLE "construction_milestones" ADD COLUMN     "actual_start" TIMESTAMP(3),
ADD COLUMN     "completion_pct" INTEGER,
ADD COLUMN     "critical_path" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "date_label" TEXT,
ADD COLUMN     "is_payment_trigger" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "planned_end" TIMESTAMP(3),
ADD COLUMN     "planned_start" TIMESTAMP(3),
ADD COLUMN     "stage_code" TEXT,
ADD COLUMN     "tower" TEXT,
ADD COLUMN     "verified_by_source" TEXT;

-- AlterTable
ALTER TABLE "cost_sheets" ADD COLUMN     "all_inclusive_per_sqft" DOUBLE PRECISION,
ADD COLUMN     "all_inclusive_price_cr" DOUBLE PRECISION,
ADD COLUMN     "base_cost_cr" DOUBLE PRECISION,
ADD COLUMN     "electricity_connection" DOUBLE PRECISION,
ADD COLUMN     "gst_applicable" BOOLEAN,
ADD COLUMN     "gst_note" TEXT,
ADD COLUMN     "maintenance_psf_monthly" DOUBLE PRECISION,
ADD COLUMN     "water_sewer_connection" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "payment_plans" ADD COLUMN     "best_for" TEXT,
ADD COLUMN     "booking_amount_lakh" DOUBLE PRECISION,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "discount_offered_pct" DOUBLE PRECISION,
ADD COLUMN     "down_payment_pct" DOUBLE PRECISION,
ADD COLUMN     "total_duration_months" INTEGER,
ADD COLUMN     "watch_out" TEXT;

-- AlterTable
ALTER TABLE "price_history" ADD COLUMN     "bhk" INTEGER,
ADD COLUMN     "event_note" TEXT,
ADD COLUMN     "quarter_label" TEXT;

-- AlterTable
ALTER TABLE "project_competitors" ADD COLUMN     "competitor_amenity_count" INTEGER,
ADD COLUMN     "competitor_possession_status" TEXT,
ADD COLUMN     "competitor_price_max_cr" DOUBLE PRECISION,
ADD COLUMN     "competitor_price_min_cr" DOUBLE PRECISION,
ADD COLUMN     "competitor_price_psf" DOUBLE PRECISION,
ADD COLUMN     "reason" TEXT;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "aqi_annual_avg" DOUBLE PRECISION,
ADD COLUMN     "commute_matrix" JSONB,
ADD COLUMN     "flood_waterlogging_risk" TEXT,
ADD COLUMN     "legal_flag" TEXT,
ADD COLUMN     "legal_flag_detail" TEXT,
ADD COLUMN     "litigation_count" INTEGER,
ADD COLUMN     "location_advantages" JSONB,
ADD COLUMN     "location_concerns" TEXT[],
ADD COLUMN     "location_verdict" TEXT,
ADD COLUMN     "oc_obtained" BOOLEAN,
ADD COLUMN     "oc_obtained_date" TIMESTAMP(3),
ADD COLUMN     "oc_restrictions" TEXT,
ADD COLUMN     "oc_valid_until" TEXT,
ADD COLUMN     "possession_confidence" TEXT,
ADD COLUMN     "possession_confidence_note" TEXT,
ADD COLUMN     "rera_compliance_score" INTEGER,
ADD COLUMN     "rera_valid_until" TIMESTAMP(3),
ADD COLUMN     "walkability_score" INTEGER;

-- AlterTable
ALTER TABLE "shared_shortlists" ALTER COLUMN "expires_at" SET DEFAULT (now() + interval '30 days');

-- AlterTable
ALTER TABLE "unit_types" ADD COLUMN     "balconies" INTEGER,
ADD COLUMN     "carpet_to_super_ratio_pct" DOUBLE PRECISION,
ADD COLUMN     "has_servant_room" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "has_study" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "inventory_as_of" TIMESTAMP(3),
ADD COLUMN     "layout_cons" TEXT[],
ADD COLUMN     "layout_efficiency_pct" DOUBLE PRECISION,
ADD COLUMN     "layout_pros" TEXT[],
ADD COLUMN     "layout_shape" TEXT,
ADD COLUMN     "orientation_price_premium_pct" DOUBLE PRECISION,
ADD COLUMN     "price_per_sqft" DOUBLE PRECISION,
ADD COLUMN     "super_area_range_sqft" TEXT,
ADD COLUMN     "unit_orientations" TEXT[];

-- CreateTable
CREATE TABLE "construction_updates" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "update_date" TIMESTAMP(3) NOT NULL,
    "quarter_label" TEXT,
    "completion_pct" INTEGER,
    "photo_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source" TEXT,
    "verified_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "construction_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_lifecycle_updates" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "update_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "update_date" TIMESTAMP(3) NOT NULL,
    "impact" TEXT,
    "source" TEXT,
    "verified_by" TEXT,
    "affects_pricing" BOOLEAN NOT NULL DEFAULT false,
    "affects_recommendation" BOOLEAN NOT NULL DEFAULT false,
    "legal_flag_cleared" BOOLEAN NOT NULL DEFAULT false,
    "maintenance_fee_monthly_psf" DOUBLE PRECISION,
    "maintenance_fee_previous" DOUBLE PRECISION,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_lifecycle_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sector_intelligence" (
    "id" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "sector_overview" TEXT,
    "sector_stage" TEXT,
    "dominant_segment" TEXT,
    "avg_price_per_sqft" DOUBLE PRECISION,
    "price_5yr_cagr_pct" DOUBLE PRECISION,
    "rental_yield_pct" DOUBLE PRECISION,
    "avg_rent_3bhk_monthly" DOUBLE PRECISION,
    "sector_strengths" TEXT[],
    "sector_weaknesses" TEXT[],
    "who_should_buy" TEXT,
    "who_should_avoid" TEXT,
    "infrastructure_pipeline" JSONB,
    "last_verified_at" TIMESTAMP(3),
    "verified_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sector_intelligence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "construction_updates_project_id_update_date_idx" ON "construction_updates"("project_id", "update_date");

-- CreateIndex
CREATE INDEX "project_lifecycle_updates_project_id_update_date_idx" ON "project_lifecycle_updates"("project_id", "update_date");

-- CreateIndex
CREATE UNIQUE INDEX "sector_intelligence_city_sector_key" ON "sector_intelligence"("city", "sector");

-- AddForeignKey
ALTER TABLE "construction_updates" ADD CONSTRAINT "construction_updates_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_lifecycle_updates" ADD CONSTRAINT "project_lifecycle_updates_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

