-- ProjectDna: Add new score fields
ALTER TABLE "project_dna" ADD COLUMN "overall_score" INTEGER;
ALTER TABLE "project_dna" ADD COLUMN "builder_score" INTEGER;
ALTER TABLE "project_dna" ADD COLUMN "price_score" INTEGER;
ALTER TABLE "project_dna" ADD COLUMN "location_score" INTEGER;
ALTER TABLE "project_dna" ADD COLUMN "legal_score" INTEGER;
ALTER TABLE "project_dna" ADD COLUMN "amenity_score" INTEGER;
ALTER TABLE "project_dna" ADD COLUMN "possession_score" INTEGER;

-- ProjectDna: Drop old score/label pairs
ALTER TABLE "project_dna" DROP COLUMN IF EXISTS "builder_track_record_score";
ALTER TABLE "project_dna" DROP COLUMN IF EXISTS "builder_track_record_label";
ALTER TABLE "project_dna" DROP COLUMN IF EXISTS "price_position_score";
ALTER TABLE "project_dna" DROP COLUMN IF EXISTS "price_position_label";
ALTER TABLE "project_dna" DROP COLUMN IF EXISTS "locality_score";
ALTER TABLE "project_dna" DROP COLUMN IF EXISTS "locality_label";
ALTER TABLE "project_dna" DROP COLUMN IF EXISTS "rera_compliance_score";
ALTER TABLE "project_dna" DROP COLUMN IF EXISTS "rera_compliance_label";
ALTER TABLE "project_dna" DROP COLUMN IF EXISTS "amenity_depth_score";
ALTER TABLE "project_dna" DROP COLUMN IF EXISTS "amenity_depth_label";
ALTER TABLE "project_dna" DROP COLUMN IF EXISTS "possession_certainty_score";
ALTER TABLE "project_dna" DROP COLUMN IF EXISTS "possession_certainty_label";

-- DecisionProfile: Add explicit intelligence fields
ALTER TABLE "decision_profiles" ADD COLUMN "financial_intelligence" JSONB;
ALTER TABLE "decision_profiles" ADD COLUMN "market_intelligence" JSONB;
ALTER TABLE "decision_profiles" ADD COLUMN "builder_intelligence" JSONB;
ALTER TABLE "decision_profiles" ADD COLUMN "property_intelligence" JSONB;
ALTER TABLE "decision_profiles" ADD COLUMN "comparative_analysis" JSONB;
ALTER TABLE "decision_profiles" ADD COLUMN "resources_documents" JSONB;

-- DecisionProfile: Drop old intelligence_data (JSON parsed field)
ALTER TABLE "decision_profiles" DROP COLUMN IF EXISTS "intelligence_data";

-- RecommendationProfile: Drop specialized thesis fields
ALTER TABLE "recommendation_profiles" DROP COLUMN IF EXISTS "end_use_thesis";
ALTER TABLE "recommendation_profiles" DROP COLUMN IF EXISTS "investment_thesis";
ALTER TABLE "recommendation_profiles" DROP COLUMN IF EXISTS "family_thesis";
ALTER TABLE "recommendation_profiles" DROP COLUMN IF EXISTS "investor_thesis";
ALTER TABLE "recommendation_profiles" DROP COLUMN IF EXISTS "luxury_thesis";
ALTER TABLE "recommendation_profiles" DROP COLUMN IF EXISTS "risk_thesis";
