-- Phase 5: Add comprehensive property decision factors (43 fields)

-- Resale & Investment Terms
ALTER TABLE "Project" ADD COLUMN "resale_lock_in_months" INTEGER;
ALTER TABLE "Project" ADD COLUMN "rental_income_allowed" BOOLEAN DEFAULT true;
ALTER TABLE "Project" ADD COLUMN "occupancy_restriction_months" INTEGER;

-- NRI & Eligibility
ALTER TABLE "Project" ADD COLUMN "nri_eligible" BOOLEAN DEFAULT true;
ALTER TABLE "Project" ADD COLUMN "nri_approval_months" INTEGER;
ALTER TABLE "Project" ADD COLUMN "foreign_currency_payment_allowed" BOOLEAN;

-- Legal & Compliance Additions
ALTER TABLE "Project" ADD COLUMN "occupancy_certificate_status" VARCHAR(50);
ALTER TABLE "Project" ADD COLUMN "occupancy_expected_date" TIMESTAMP;
ALTER TABLE "Project" ADD COLUMN "ongoing_litigation_count" INTEGER DEFAULT 0;
ALTER TABLE "Project" ADD COLUMN "litigation_types" TEXT[];
ALTER TABLE "Project" ADD COLUMN "nclt_status" VARCHAR(50);

-- Quality & Reputation
ALTER TABLE "Project" ADD COLUMN "construction_quality_rating" DECIMAL(3,2);
ALTER TABLE "Project" ADD COLUMN "buyer_satisfaction_rating" DECIMAL(3,2);
ALTER TABLE "Project" ADD COLUMN "handover_defect_rate" DECIMAL(5,2);

-- Lifestyle & Safety
ALTER TABLE "Project" ADD COLUMN "women_safety_score" INTEGER;
ALTER TABLE "Project" ADD COLUMN "has_security_24x7" BOOLEAN;
ALTER TABLE "Project" ADD COLUMN "has_cctv" BOOLEAN;
ALTER TABLE "Project" ADD COLUMN "police_station_distance_km" DECIMAL(5,2);
ALTER TABLE "Project" ADD COLUMN "street_lights" BOOLEAN;

-- Vastu & Preferences
ALTER TABLE "Project" ADD COLUMN "vastu_compliant" BOOLEAN;
ALTER TABLE "Project" ADD COLUMN "north_facing_units" BOOLEAN;
ALTER TABLE "Project" ADD COLUMN "east_facing_preferred" BOOLEAN;

-- Environmental & Area Quality
ALTER TABLE "Project" ADD COLUMN "air_quality_index_avg" INTEGER;
ALTER TABLE "Project" ADD COLUMN "noise_level_db" INTEGER;
ALTER TABLE "Project" ADD COLUMN "flood_zone" VARCHAR(50);
ALTER TABLE "Project" ADD COLUMN "proximity_to_industrial" VARCHAR(50);
ALTER TABLE "Project" ADD COLUMN "green_cover_percent" INTEGER;

-- Education & Connectivity
ALTER TABLE "Project" ADD COLUMN "top_school_distance_km" DECIMAL(5,2);
ALTER TABLE "Project" ADD COLUMN "college_distance_km" DECIMAL(5,2);
ALTER TABLE "Project" ADD COLUMN "hospital_distance_km" DECIMAL(5,2);
ALTER TABLE "Project" ADD COLUMN "airport_distance_km" DECIMAL(5,2);

-- Market & Pricing
ALTER TABLE "Project" ADD COLUMN "market_demand_score" INTEGER;
ALTER TABLE "Project" ADD COLUMN "appreciation_potential_5yr" DECIMAL(5,2);
ALTER TABLE "Project" ADD COLUMN "rental_yield_annual_percent" DECIMAL(5,2);
ALTER TABLE "Project" ADD COLUMN "competing_projects_nearby" INTEGER;

-- Possession & Timeline
ALTER TABLE "Project" ADD COLUMN "foundation_stone_date" TIMESTAMP;
ALTER TABLE "Project" ADD COLUMN "expected_handover_quarter" VARCHAR(50);
ALTER TABLE "Project" ADD COLUMN "average_builder_delay_months" INTEGER;

-- Regulatory & Compliance
ALTER TABLE "Project" ADD COLUMN "gst_pass_through" BOOLEAN;
ALTER TABLE "Project" ADD COLUMN "land_title_clear" BOOLEAN;
ALTER TABLE "Project" ADD COLUMN "fir_against_project" BOOLEAN;
ALTER TABLE "Project" ADD COLUMN "approvals_status" VARCHAR(255);

-- Create indexes on frequently-queried fields
CREATE INDEX "Project_nri_eligible_idx" ON "Project"("nri_eligible");
CREATE INDEX "Project_women_safety_score_idx" ON "Project"("women_safety_score");
CREATE INDEX "Project_air_quality_index_avg_idx" ON "Project"("air_quality_index_avg");
