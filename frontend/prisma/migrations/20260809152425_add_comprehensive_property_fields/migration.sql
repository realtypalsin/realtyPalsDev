-- Phase 5: Comprehensive Property Decision Factors

-- 1. Resale & Investment Terms
ALTER TABLE "projects" ADD COLUMN "resale_lock_in_months" INTEGER;
ALTER TABLE "projects" ADD COLUMN "rental_income_allowed" BOOLEAN;
ALTER TABLE "projects" ADD COLUMN "occupancy_restriction_months" INTEGER;

-- 2. NRI & Eligibility
ALTER TABLE "projects" ADD COLUMN "nri_eligible" BOOLEAN;
ALTER TABLE "projects" ADD COLUMN "nri_approval_months" INTEGER;
ALTER TABLE "projects" ADD COLUMN "foreign_currency_payment_allowed" BOOLEAN;

-- 3. Legal & Compliance Additions
ALTER TABLE "projects" ADD COLUMN "occupancy_certificate_status" TEXT;
ALTER TABLE "projects" ADD COLUMN "occupancy_expected_date" TIMESTAMP(3);
ALTER TABLE "projects" ADD COLUMN "ongoing_litigation_count" INTEGER;
ALTER TABLE "projects" ADD COLUMN "litigation_types" TEXT[];
ALTER TABLE "projects" ADD COLUMN "nclt_status" TEXT;

-- 4. Quality & Reputation
ALTER TABLE "projects" ADD COLUMN "construction_quality_rating" DOUBLE PRECISION;
ALTER TABLE "projects" ADD COLUMN "buyer_satisfaction_rating" DOUBLE PRECISION;
ALTER TABLE "projects" ADD COLUMN "handover_defect_rate" DOUBLE PRECISION;

-- 5. Lifestyle & Safety
ALTER TABLE "projects" ADD COLUMN "women_safety_score" INTEGER;
ALTER TABLE "projects" ADD COLUMN "has_security_24x7" BOOLEAN;
ALTER TABLE "projects" ADD COLUMN "has_cctv" BOOLEAN;
ALTER TABLE "projects" ADD COLUMN "police_station_distance_km" DOUBLE PRECISION;
ALTER TABLE "projects" ADD COLUMN "street_lights" BOOLEAN;

-- 6. Vastu & Preferences
ALTER TABLE "projects" ADD COLUMN "vastu_compliant" BOOLEAN;
ALTER TABLE "projects" ADD COLUMN "north_facing_units" BOOLEAN;
ALTER TABLE "projects" ADD COLUMN "east_facing_preferred" BOOLEAN;

-- 7. Environmental & Area Quality
ALTER TABLE "projects" ADD COLUMN "air_quality_index_avg" INTEGER;
ALTER TABLE "projects" ADD COLUMN "noise_level_db" INTEGER;
ALTER TABLE "projects" ADD COLUMN "flood_zone" TEXT;
ALTER TABLE "projects" ADD COLUMN "proximity_to_industrial" TEXT;
ALTER TABLE "projects" ADD COLUMN "green_cover_percent" INTEGER;

-- 8. Education & Connectivity
ALTER TABLE "projects" ADD COLUMN "top_school_distance_km" DOUBLE PRECISION;
ALTER TABLE "projects" ADD COLUMN "college_distance_km" DOUBLE PRECISION;
ALTER TABLE "projects" ADD COLUMN "hospital_distance_km" DOUBLE PRECISION;
ALTER TABLE "projects" ADD COLUMN "airport_distance_km" DOUBLE PRECISION;

-- 9. Market & Pricing
ALTER TABLE "projects" ADD COLUMN "market_demand_score" INTEGER;
ALTER TABLE "projects" ADD COLUMN "appreciation_potential_5yr" DOUBLE PRECISION;
ALTER TABLE "projects" ADD COLUMN "rental_yield_annual_percent" DOUBLE PRECISION;
ALTER TABLE "projects" ADD COLUMN "competing_projects_nearby" INTEGER;

-- 10. Possession & Timeline
ALTER TABLE "projects" ADD COLUMN "foundation_stone_date" TIMESTAMP(3);
ALTER TABLE "projects" ADD COLUMN "expected_handover_quarter" TEXT;
ALTER TABLE "projects" ADD COLUMN "average_builder_delay_months" INTEGER;

-- 11. Regulatory & Compliance
ALTER TABLE "projects" ADD COLUMN "gst_pass_through" BOOLEAN;
ALTER TABLE "projects" ADD COLUMN "land_title_clear" BOOLEAN;
ALTER TABLE "projects" ADD COLUMN "fir_against_project" BOOLEAN;
ALTER TABLE "projects" ADD COLUMN "approvals_status" TEXT;

-- Add indexes for frequently queried fields
CREATE INDEX "projects_nri_eligible_idx" ON "projects"("nri_eligible");
CREATE INDEX "projects_women_safety_score_idx" ON "projects"("women_safety_score");
CREATE INDEX "projects_air_quality_index_avg_idx" ON "projects"("air_quality_index_avg");
