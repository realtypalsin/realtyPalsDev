-- CreateEnum
CREATE TYPE "ConstructionStatus" AS ENUM ('completed', 'in_progress', 'upcoming');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('under_construction', 'ready_to_move', 'new_launch');

-- CreateEnum
CREATE TYPE "ImageType" AS ENUM ('hero', 'exterior', 'interior', 'floor_plan', 'amenity', 'master_plan', 'clubhouse', 'pool', 'location_map');

-- CreateEnum
CREATE TYPE "AmenityCategory" AS ENUM ('sports', 'lifestyle', 'wellness', 'kids', 'security', 'parking');

-- CreateEnum
CREATE TYPE "ConnectivityType" AS ENUM ('metro', 'road', 'expressway', 'school', 'hospital', 'mall', 'landmark', 'airport', 'university', 'park', 'it_park', 'commercial');

-- CreateEnum
CREATE TYPE "DataSource" AS ENUM ('brochure', 'google', 'estimated', 'manual');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('user', 'assistant');

-- CreateEnum
CREATE TYPE "IntelligenceStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "SiteVisitStatus" AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');

-- CreateEnum
CREATE TYPE "PromotionalType" AS ENUM ('button', 'toast_text', 'news_feature');

-- CreateEnum
CREATE TYPE "NewsStatus" AS ENUM ('draft', 'pending_approval', 'published', 'archived', 'rejected');

-- CreateEnum
CREATE TYPE "FormStatus" AS ENUM ('new', 'reviewing', 'approved', 'rejected', 'clarification_requested');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('new', 'contacted', 'qualified', 'lost', 'converted', 'archived');

-- CreateTable
CREATE TABLE "builders" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tagline" TEXT,
    "founder" TEXT,
    "company_overview" TEXT,
    "logo_url" TEXT,
    "parent_group" TEXT,
    "founded_year" INTEGER,
    "headquarters" TEXT,
    "website" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "description" TEXT,
    "experience_years" TEXT,
    "projects_delivered_count" INTEGER DEFAULT 18,
    "total_projects_count" INTEGER,
    "delivered_units" INTEGER,
    "delivered_projects" TEXT[],
    "ongoing_projects" TEXT[],
    "delayed_projects_count" INTEGER,
    "average_delay_months" DOUBLE PRECISION,
    "delivery_score" INTEGER,
    "construction_quality_score" INTEGER,
    "after_sales_score" INTEGER,
    "buyer_satisfaction_score" INTEGER,
    "rera_compliance_score" INTEGER,
    "litigation_count" INTEGER,
    "insolvency_history" BOOLEAN NOT NULL DEFAULT false,
    "legal_flag" TEXT,
    "cin" TEXT,
    "rera_promoter_id" TEXT,
    "financial_hygiene_score" INTEGER,
    "outstanding_dues_cr" DOUBLE PRECISION,
    "legal_entities" JSONB,
    "executives" JSONB,
    "funding_banks" TEXT[],
    "audit_flags_log" TEXT,
    "luxury_specialization" BOOLEAN NOT NULL DEFAULT false,
    "township_specialization" BOOLEAN NOT NULL DEFAULT false,
    "affordable_specialization" BOOLEAN NOT NULL DEFAULT false,
    "average_project_size" INTEGER,
    "awards" TEXT[],
    "awards_count" INTEGER,
    "certifications" TEXT[],
    "credai_member" BOOLEAN NOT NULL DEFAULT false,
    "iso_certified" BOOLEAN NOT NULL DEFAULT false,
    "verification_level" TEXT,
    "last_verified_at" TIMESTAMP(3),
    "data_source" TEXT,
    "intelligence_completeness" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "builders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "builder_id" TEXT NOT NULL,
    "rera_number" TEXT,
    "rera_url" TEXT,
    "city" TEXT NOT NULL DEFAULT 'Noida',
    "state" TEXT NOT NULL DEFAULT 'Uttar Pradesh',
    "country" TEXT NOT NULL DEFAULT 'India',
    "sector" TEXT NOT NULL,
    "address" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "land_area_acres" DOUBLE PRECISION,
    "total_units" INTEGER,
    "total_towers" INTEGER,
    "floors" TEXT,
    "open_space_pct" INTEGER,
    "green_rating" TEXT,
    "has_duplex" BOOLEAN NOT NULL DEFAULT false,
    "has_penthouse" BOOLEAN NOT NULL DEFAULT false,
    "project_type" TEXT DEFAULT 'Residential',
    "schools_nearby_count" INTEGER,
    "hospitals_nearby_count" INTEGER,
    "shopping_nearby_count" INTEGER,
    "it_parks_nearby_count" INTEGER,
    "banks_nearby_count" INTEGER,
    "restaurants_nearby_count" INTEGER,
    "status" "ProjectStatus" NOT NULL,
    "launch_date" TIMESTAMP(3),
    "possession_date" TIMESTAMP(3),
    "possession_label" TEXT,
    "possession_confidence" TEXT,
    "possession_confidence_note" TEXT,
    "oc_obtained" BOOLEAN,
    "oc_obtained_date" TIMESTAMP(3),
    "oc_valid_until" TEXT,
    "oc_restrictions" TEXT,
    "rera_valid_until" TIMESTAMP(3),
    "rera_compliance_score" INTEGER,
    "legal_flag" TEXT,
    "legal_flag_detail" TEXT,
    "litigation_count" INTEGER,
    "location_advantages" JSONB,
    "location_concerns" TEXT[],
    "location_verdict" TEXT,
    "walkability_score" INTEGER,
    "flood_waterlogging_risk" TEXT,
    "aqi_annual_avg" DOUBLE PRECISION,
    "commute_matrix" JSONB,
    "description" TEXT,
    "long_description" TEXT,
    "design_theme" TEXT,
    "architect" TEXT,
    "interior_designer" TEXT,
    "marketing_claims" TEXT[],
    "ai_search_keywords" TEXT[],
    "hero_image_url" TEXT,
    "price_min_cr" DOUBLE PRECISION,
    "price_range_label" TEXT,
    "price_includes_plc" BOOLEAN NOT NULL DEFAULT false,
    "price_includes_club" BOOLEAN NOT NULL DEFAULT false,
    "price_includes_taxes" BOOLEAN NOT NULL DEFAULT false,
    "builder_theme" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "embedding" vector,
    "project_risk_flag" TEXT,
    "escrow_verified" BOOLEAN,
    "escrow_bank_name" TEXT,
    "registry_status" TEXT,
    "registry_embargo_reasons" TEXT[],
    "nclt_moratorium_active" BOOLEAN,
    "resale_lock_in_months" INTEGER,
    "rental_income_allowed" BOOLEAN,
    "occupancy_restriction_months" INTEGER,
    "nri_eligible" BOOLEAN,
    "nri_approval_months" INTEGER,
    "foreign_currency_payment_allowed" BOOLEAN,
    "occupancy_certificate_status" TEXT,
    "occupancy_expected_date" TIMESTAMP(3),
    "ongoing_litigation_count" INTEGER,
    "litigation_types" TEXT[],
    "nclt_status" TEXT,
    "construction_quality_rating" DOUBLE PRECISION,
    "buyer_satisfaction_rating" DOUBLE PRECISION,
    "handover_defect_rate" DOUBLE PRECISION,
    "women_safety_score" INTEGER,
    "has_security_24x7" BOOLEAN,
    "has_cctv" BOOLEAN,
    "police_station_distance_km" DOUBLE PRECISION,
    "street_lights" BOOLEAN,
    "vastu_compliant" BOOLEAN,
    "north_facing_units" BOOLEAN,
    "east_facing_preferred" BOOLEAN,
    "air_quality_index_avg" INTEGER,
    "noise_level_db" INTEGER,
    "flood_zone" TEXT,
    "proximity_to_industrial" TEXT,
    "green_cover_percent" INTEGER,
    "top_school_distance_km" DOUBLE PRECISION,
    "college_distance_km" DOUBLE PRECISION,
    "hospital_distance_km" DOUBLE PRECISION,
    "airport_distance_km" DOUBLE PRECISION,
    "market_demand_score" INTEGER,
    "appreciation_potential_5yr" DOUBLE PRECISION,
    "rental_yield_annual_percent" DOUBLE PRECISION,
    "competing_projects_nearby" INTEGER,
    "foundation_stone_date" TIMESTAMP(3),
    "expected_handover_quarter" TEXT,
    "average_builder_delay_months" INTEGER,
    "gst_pass_through" BOOLEAN,
    "land_title_clear" BOOLEAN,
    "fir_against_project" BOOLEAN,
    "approvals_status" TEXT,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_dna" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "overall_score" INTEGER,
    "builder_score" INTEGER,
    "price_score" INTEGER,
    "location_score" INTEGER,
    "legal_score" INTEGER,
    "amenity_score" INTEGER,
    "possession_score" INTEGER,
    "last_verified_at" TIMESTAMP(3),
    "verified_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_dna_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decision_profiles" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "status" "IntelligenceStatus" NOT NULL DEFAULT 'DRAFT',
    "decision_thesis" TEXT,
    "why_buy" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "why_avoid" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "best_for" TEXT,
    "not_ideal_for" TEXT,
    "financial_intelligence" JSONB,
    "market_intelligence" JSONB,
    "builder_intelligence" JSONB,
    "property_intelligence" JSONB,
    "comparative_analysis" JSONB,
    "resources_documents" JSONB,
    "confidence_sources" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recommendation_notes" TEXT,
    "advisor_notes" TEXT,
    "last_verified_at" TIMESTAMP(3),
    "verified_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "decision_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "persona_profiles" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "primary_persona" TEXT,
    "secondary_personas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "persona_descriptions" JSONB,
    "income_range" TEXT,
    "family_stage" TEXT,
    "work_location" TEXT,
    "risk_appetite" TEXT,
    "timeline_horizon" TEXT,
    "motivation_note" TEXT,
    "last_verified_at" TIMESTAMP(3),
    "verified_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "persona_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_profiles" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "status" "IntelligenceStatus" NOT NULL DEFAULT 'DRAFT',
    "tier" TEXT,
    "primary_thesis" TEXT,
    "walk_away_conditions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "timeline_advice" TEXT,
    "negotiation_leverage" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "internal_confidence" TEXT,
    "admin_notes" TEXT,
    "last_verified_at" TIMESTAMP(3),
    "verified_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recommendation_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_competitors" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "competitor_project_id" TEXT,
    "competitor_name" TEXT NOT NULL,
    "competitor_slug" TEXT,
    "reason" TEXT,
    "competitor_price_psf" DOUBLE PRECISION,
    "competitor_price_min_cr" DOUBLE PRECISION,
    "competitor_price_max_cr" DOUBLE PRECISION,
    "competitor_amenity_count" INTEGER,
    "competitor_possession_status" TEXT,
    "this_project_advantage" TEXT,
    "competitor_advantage" TEXT,
    "verdict" TEXT,
    "price_delta_note" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "last_verified_at" TIMESTAMP(3),
    "verified_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_competitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intelligence_audits" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "before_data" JSONB,
    "after_data" JSONB,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intelligence_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_types" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bhk" INTEGER NOT NULL,
    "has_study" BOOLEAN NOT NULL DEFAULT false,
    "has_servant_room" BOOLEAN NOT NULL DEFAULT false,
    "super_area_sqft" INTEGER,
    "super_area_range_sqft" TEXT,
    "carpet_area_sqft" INTEGER,
    "carpet_to_super_ratio_pct" DOUBLE PRECISION,
    "balconies" INTEGER,
    "balcony_area_sqft" INTEGER,
    "bathrooms" INTEGER,
    "utility_room" BOOLEAN NOT NULL DEFAULT false,
    "dress_area" BOOLEAN NOT NULL DEFAULT false,
    "towers" TEXT[],
    "unit_orientations" TEXT[],
    "orientation_price_premium_pct" DOUBLE PRECISION,
    "price_min_cr" DOUBLE PRECISION,
    "price_max_cr" DOUBLE PRECISION,
    "price_label" TEXT,
    "price_per_sqft" DOUBLE PRECISION,
    "price_is_estimated" BOOLEAN NOT NULL DEFAULT true,
    "subtitle" TEXT,
    "description" TEXT,
    "category_badge" TEXT,
    "inventory_left" INTEGER,
    "inventory_as_of" TIMESTAMP(3),
    "perfect_for" TEXT[],
    "key_highlights" JSONB,
    "whats_included" JSONB,
    "views" JSONB,
    "layout_shape" TEXT,
    "layout_efficiency_pct" DOUBLE PRECISION,
    "layout_pros" TEXT[],
    "layout_cons" TEXT[],
    "layout_variant_name" TEXT DEFAULT 'Type A',
    "tower_association" TEXT[] DEFAULT ARRAY['Tower A']::TEXT[],
    "built_up_area_sqft" INTEGER,
    "utility_area_sqft" INTEGER,
    "common_area_shaft_sqft" INTEGER,
    "efficiency_rating" TEXT DEFAULT 'Excellent',

    CONSTRAINT "unit_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_history" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quarter_label" TEXT,
    "bhk" INTEGER,
    "price_per_sqft" DOUBLE PRECISION,
    "total_price_cr" DOUBLE PRECISION,
    "event_note" TEXT,
    "source" TEXT NOT NULL DEFAULT 'monthly_auto_snapshot',

    CONSTRAINT "price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "construction_milestones" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "stage_code" TEXT,
    "name" TEXT NOT NULL,
    "status" "ConstructionStatus" NOT NULL DEFAULT 'upcoming',
    "completion_pct" INTEGER,
    "date_label" TEXT,
    "planned_start" TIMESTAMP(3),
    "planned_end" TIMESTAMP(3),
    "actual_start" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "tower" TEXT,
    "is_payment_trigger" BOOLEAN NOT NULL DEFAULT false,
    "critical_path" BOOLEAN NOT NULL DEFAULT false,
    "verified_by_source" TEXT,
    "photo_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "construction_milestones_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "builder_delivery_records" (
    "id" TEXT NOT NULL,
    "builder_id" TEXT NOT NULL,
    "project_name" TEXT NOT NULL,
    "promised_date" TIMESTAMP(3) NOT NULL,
    "actual_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "builder_delivery_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_images" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "ImageType" NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'admin',
    "caption" TEXT,
    "bhk" INTEGER,
    "size_sqft" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "project_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "amenities" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "AmenityCategory" NOT NULL,

    CONSTRAINT "amenities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connectivity" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "type" "ConnectivityType" NOT NULL,
    "name" TEXT NOT NULL,
    "distance_km" DOUBLE PRECISION,
    "travel_time_min" INTEGER,
    "peak_travel_time_min" INTEGER,
    "travel_mode" TEXT,
    "is_operational" BOOLEAN NOT NULL DEFAULT true,
    "category_rank" INTEGER,
    "rating" DOUBLE PRECISION,
    "extra_detail" TEXT,
    "data_source" "DataSource" NOT NULL DEFAULT 'brochure',
    "notes" TEXT,

    CONSTRAINT "connectivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "guest_token" TEXT,
    "title" TEXT,
    "message_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_active" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chat_phase" TEXT NOT NULL DEFAULT 'DISCOVERY',
    "last_projects" JSONB,
    "shown_chip_ids" JSONB DEFAULT '[]',
    "summary" TEXT,
    "focus_project_id" TEXT,
    "focus_set_at" TIMESTAMP(3),
    "summary_location" TEXT,
    "summary_financial" TEXT,
    "summary_timeline" TEXT,
    "property_reactions" JSONB DEFAULT '[]',

    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "intent_snapshot" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "artifacts" JSONB,
    "chips" JSONB DEFAULT '[]',

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_memory" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "bhk_preference" INTEGER,
    "budget_min_cr" DOUBLE PRECISION,
    "budget_max_cr" DOUBLE PRECISION,
    "sector_preference" TEXT,
    "purpose" TEXT,
    "possession_pref" TEXT,
    "viewed_slugs" TEXT[],
    "rejected_slugs" TEXT[],
    "saved_slugs" TEXT[],
    "summary_text" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "work_location" TEXT,
    "home_loan_pre_approved" BOOLEAN,
    "timeline_months" INTEGER,
    "contact_phone" TEXT,
    "guest_token" TEXT,

    CONSTRAINT "user_memory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_properties" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "saved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_visit_requests" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "project_slug" TEXT NOT NULL,
    "project_name" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "visit_date" TIMESTAMP(3) NOT NULL,
    "time_slot" TEXT NOT NULL,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "SiteVisitStatus" NOT NULL DEFAULT 'pending',

    CONSTRAINT "site_visit_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "callback_requests" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "project_name" TEXT,
    "project_slug" TEXT,
    "user_id" TEXT,
    "guest_token" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "lead_score" DOUBLE PRECISION,
    "lead_tier" TEXT,
    "intent_tier" TEXT,
    "loan_pre_approved" BOOLEAN,
    "ai_summary" TEXT,
    "consent_given" BOOLEAN,
    "projects_saved" INTEGER DEFAULT 0,
    "projects_viewed" INTEGER DEFAULT 0,
    "budget_min_cr" DOUBLE PRECISION,
    "budget_max_cr" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "callback_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_alerts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "guest_token" TEXT,
    "project_id" TEXT NOT NULL,
    "project_slug" TEXT NOT NULL,
    "target_price_cr" DOUBLE PRECISION NOT NULL,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_documents" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "project_slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "storage_url" TEXT NOT NULL,
    "content_text" TEXT,
    "doc_type" TEXT NOT NULL DEFAULT 'brochure',
    "file_size_bytes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_plans" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "plan_type" TEXT NOT NULL DEFAULT 'construction_linked',
    "plan_name" TEXT,
    "description" TEXT,
    "milestones" JSONB NOT NULL DEFAULT '[]',
    "down_payment_pct" DOUBLE PRECISION,
    "booking_amount_lakh" DOUBLE PRECISION,
    "total_duration_months" INTEGER,
    "discount_offered_pct" DOUBLE PRECISION,
    "best_for" TEXT,
    "watch_out" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT,
    "source_url" TEXT,
    "verified_at" TIMESTAMP(3),
    "verified_by" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_sheets" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "base_price_per_sqft" DOUBLE PRECISION,
    "base_cost_cr" DOUBLE PRECISION,
    "floor_rise_per_floor" DOUBLE PRECISION,
    "plc_charges" JSONB NOT NULL DEFAULT '[]',
    "parking_cost" DOUBLE PRECISION,
    "ifms" DOUBLE PRECISION,
    "club_membership" DOUBLE PRECISION,
    "other_charges" JSONB NOT NULL DEFAULT '[]',
    "gst_applicable" BOOLEAN,
    "gst_rate_pct" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "gst_note" TEXT,
    "stamp_duty_pct" DOUBLE PRECISION NOT NULL DEFAULT 6.0,
    "registration_pct" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "electricity_connection" DOUBLE PRECISION,
    "water_sewer_connection" DOUBLE PRECISION,
    "maintenance_psf_monthly" DOUBLE PRECISION,
    "all_inclusive_price_cr" DOUBLE PRECISION,
    "all_inclusive_per_sqft" DOUBLE PRECISION,
    "assumptions" TEXT[],
    "verified_at" TIMESTAMP(3),
    "verified_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cost_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_analytics" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT,
    "guest_token" TEXT,
    "chat_started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "intent_identified_at" TIMESTAMP(3),
    "results_shown_at" TIMESTAMP(3),
    "first_engagement_at" TIMESTAMP(3),
    "conversion_at" TIMESTAMP(3),
    "intent_type" TEXT,
    "extracted_sector" TEXT,
    "extracted_bhk" INTEGER,
    "extracted_budget_min" DOUBLE PRECISION,
    "extracted_budget_max" DOUBLE PRECISION,
    "projects_viewed" INTEGER NOT NULL DEFAULT 0,
    "projects_clicked" INTEGER NOT NULL DEFAULT 0,
    "projects_saved" INTEGER NOT NULL DEFAULT 0,
    "time_spent_seconds" INTEGER NOT NULL DEFAULT 0,
    "conversion_type" TEXT,
    "converted_project_id" TEXT,
    "converted_builder_id" TEXT,
    "drop_off_stage" TEXT,
    "drop_off_at" TIMESTAMP(3),
    "idle_seconds_before_drop_off" INTEGER,
    "promotional_id" TEXT,
    "promo_clicked" BOOLEAN NOT NULL DEFAULT false,
    "latency_ms" INTEGER,
    "llm_tokens" INTEGER,
    "ai_confidence" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "query_metrics" (
    "id" TEXT NOT NULL,
    "query_text" TEXT NOT NULL DEFAULT '',
    "intent_type" TEXT,
    "sector" TEXT,
    "bhk" INTEGER,
    "budget_min_cr" DOUBLE PRECISION,
    "budget_max_cr" DOUBLE PRECISION,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT,
    "week_start" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clicked" BOOLEAN NOT NULL DEFAULT false,
    "converted" BOOLEAN NOT NULL DEFAULT false,
    "results_count" INTEGER,
    "had_results" BOOLEAN,
    "builder" TEXT,
    "purpose" TEXT,
    "possession" TEXT,
    "clarification_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "query_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_metrics_summary" (
    "id" TEXT NOT NULL,
    "week_start" TIMESTAMP(3) NOT NULL,
    "week_end" TIMESTAMP(3) NOT NULL,
    "total_queries" INTEGER NOT NULL,
    "unique_sessions" INTEGER NOT NULL,
    "conversion_rate" DOUBLE PRECISION NOT NULL,
    "drop_off_rate" DOUBLE PRECISION NOT NULL,
    "avg_time_spent_s" INTEGER NOT NULL,
    "top_sectors" JSONB NOT NULL,
    "intent_breakdown" JSONB NOT NULL,
    "budget_distribution" JSONB NOT NULL,
    "bhk_preferences" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_metrics_summary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_events" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT,
    "guest_token" TEXT,
    "project_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotionals" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "PromotionalType" NOT NULL,
    "content" TEXT NOT NULL,
    "link_type" TEXT,
    "link_target" TEXT,
    "image_url" TEXT,
    "icon_url" TEXT,
    "builder_id" TEXT,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "target_sectors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "target_bhk" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotionals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotional_interactions" (
    "id" TEXT NOT NULL,
    "promotional_id" TEXT NOT NULL,
    "session_id" TEXT,
    "user_id" TEXT,
    "guest_token" TEXT,
    "interaction_type" TEXT NOT NULL,
    "converted_project_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotional_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "builder_news" (
    "id" TEXT NOT NULL,
    "builder_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image_url" TEXT,
    "link_type" TEXT,
    "link_target" TEXT,
    "status" "NewsStatus" NOT NULL,
    "submitted_by" TEXT,
    "approved_by" TEXT,
    "approval_notes" TEXT,
    "run_as_promo" BOOLEAN NOT NULL DEFAULT false,
    "promo_id" TEXT,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMP(3),

    CONSTRAINT "builder_news_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "builder_application_forms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cin" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "landline" TEXT,
    "website" TEXT,
    "headquarters" TEXT,
    "logo_url" TEXT,
    "description" TEXT,
    "legal_entities" JSONB,
    "executives" JSONB,
    "projects" TEXT[],
    "delivery_track" TEXT,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "FormStatus" NOT NULL,
    "reviewed_by" TEXT,
    "review_notes" TEXT,
    "linked_builder" TEXT,

    CONSTRAINT "builder_application_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "builder_accounts" (
    "id" TEXT NOT NULL,
    "builder_id" TEXT NOT NULL,
    "user_id" TEXT,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "auth_method" TEXT NOT NULL,
    "last_login" TIMESTAMP(3),
    "last_activity" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "builder_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "builder_leads" (
    "id" TEXT NOT NULL,
    "builder_id" TEXT NOT NULL,
    "project_id" TEXT,
    "lead_type" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "message" TEXT,
    "source_session" TEXT,
    "source_intent" JSONB,
    "status" "LeadStatus" NOT NULL,
    "assigned_to" TEXT,
    "notes" TEXT,
    "contacted_at" TIMESTAMP(3),
    "converted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "builder_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "builder_analytics" (
    "id" TEXT NOT NULL,
    "builder_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "leads_generated" INTEGER NOT NULL DEFAULT 0,
    "callbacks_requested" INTEGER NOT NULL DEFAULT 0,
    "site_visits_requested" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks_on_promo" INTEGER NOT NULL DEFAULT 0,
    "conversions_from_promo" INTEGER NOT NULL DEFAULT 0,
    "projects_viewed" INTEGER NOT NULL DEFAULT 0,
    "projects_saved" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "builder_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "session_id" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "prompt_tokens" INTEGER NOT NULL,
    "completion_tokens" INTEGER NOT NULL,
    "cost_usd" DECIMAL(10,6) NOT NULL,
    "endpoint" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "builder_themes" (
    "id" TEXT NOT NULL,
    "builder_id" TEXT NOT NULL,
    "primary_color" TEXT NOT NULL,
    "secondary_color" TEXT,
    "logo_url" TEXT,
    "favicon_url" TEXT,
    "active_from" TIMESTAMP(3) NOT NULL,
    "active_until" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "builder_themes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared_shortlists" (
    "id" TEXT NOT NULL,
    "project_slugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL DEFAULT (now() + interval '30 days'),

    CONSTRAINT "shared_shortlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "unit_inventory" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "unit_type_id" TEXT NOT NULL,
    "tower_name" TEXT NOT NULL,
    "floor_number" INTEGER NOT NULL,
    "unit_number" TEXT NOT NULL,
    "facing" TEXT,
    "view" TEXT,
    "status" TEXT NOT NULL DEFAULT 'available',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unit_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_channel_partners" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "channel_partner_id" TEXT NOT NULL,
    "is_featured" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_channel_partners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "builders_name_key" ON "builders"("name");

-- CreateIndex
CREATE UNIQUE INDEX "builders_slug_key" ON "builders"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "projects_slug_key" ON "projects"("slug");

-- CreateIndex
CREATE INDEX "projects_city_sector_idx" ON "projects"("city", "sector");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "projects_possession_date_idx" ON "projects"("possession_date");

-- CreateIndex
CREATE INDEX "projects_builder_id_idx" ON "projects"("builder_id");

-- CreateIndex
CREATE INDEX "projects_nri_eligible_idx" ON "projects"("nri_eligible");

-- CreateIndex
CREATE INDEX "projects_women_safety_score_idx" ON "projects"("women_safety_score");

-- CreateIndex
CREATE INDEX "projects_air_quality_index_avg_idx" ON "projects"("air_quality_index_avg");

-- CreateIndex
CREATE UNIQUE INDEX "project_dna_project_id_key" ON "project_dna"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "decision_profiles_project_id_key" ON "decision_profiles"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "persona_profiles_project_id_key" ON "persona_profiles"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "recommendation_profiles_project_id_key" ON "recommendation_profiles"("project_id");

-- CreateIndex
CREATE INDEX "project_competitors_project_id_idx" ON "project_competitors"("project_id");

-- CreateIndex
CREATE INDEX "intelligence_audits_project_id_idx" ON "intelligence_audits"("project_id");

-- CreateIndex
CREATE INDEX "intelligence_audits_project_id_section_idx" ON "intelligence_audits"("project_id", "section");

-- CreateIndex
CREATE INDEX "unit_types_project_id_bhk_idx" ON "unit_types"("project_id", "bhk");

-- CreateIndex
CREATE INDEX "unit_types_project_id_price_min_cr_price_max_cr_idx" ON "unit_types"("project_id", "price_min_cr", "price_max_cr");

-- CreateIndex
CREATE INDEX "price_history_project_id_recorded_at_idx" ON "price_history"("project_id", "recorded_at");

-- CreateIndex
CREATE INDEX "construction_milestones_project_id_sort_order_idx" ON "construction_milestones"("project_id", "sort_order");

-- CreateIndex
CREATE INDEX "construction_updates_project_id_update_date_idx" ON "construction_updates"("project_id", "update_date");

-- CreateIndex
CREATE INDEX "project_lifecycle_updates_project_id_update_date_idx" ON "project_lifecycle_updates"("project_id", "update_date");

-- CreateIndex
CREATE UNIQUE INDEX "sector_intelligence_city_sector_key" ON "sector_intelligence"("city", "sector");

-- CreateIndex
CREATE INDEX "builder_delivery_records_builder_id_idx" ON "builder_delivery_records"("builder_id");

-- CreateIndex
CREATE INDEX "project_images_project_id_type_idx" ON "project_images"("project_id", "type");

-- CreateIndex
CREATE INDEX "project_images_project_id_source_idx" ON "project_images"("project_id", "source");

-- CreateIndex
CREATE INDEX "amenities_project_id_idx" ON "amenities"("project_id");

-- CreateIndex
CREATE INDEX "connectivity_project_id_idx" ON "connectivity"("project_id");

-- CreateIndex
CREATE INDEX "chat_sessions_user_id_idx" ON "chat_sessions"("user_id");

-- CreateIndex
CREATE INDEX "chat_sessions_guest_token_idx" ON "chat_sessions"("guest_token");

-- CreateIndex
CREATE INDEX "chat_messages_session_id_created_at_idx" ON "chat_messages"("session_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_memory_user_id_key" ON "user_memory"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_memory_guest_token_key" ON "user_memory"("guest_token");

-- CreateIndex
CREATE INDEX "saved_properties_user_id_idx" ON "saved_properties"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "saved_properties_user_id_project_id_key" ON "saved_properties"("user_id", "project_id");

-- CreateIndex
CREATE INDEX "site_visit_requests_project_slug_idx" ON "site_visit_requests"("project_slug");

-- CreateIndex
CREATE INDEX "callback_requests_project_slug_idx" ON "callback_requests"("project_slug");

-- CreateIndex
CREATE INDEX "callback_requests_lead_tier_idx" ON "callback_requests"("lead_tier");

-- CreateIndex
CREATE INDEX "callback_requests_created_at_idx" ON "callback_requests"("created_at");

-- CreateIndex
CREATE INDEX "price_alerts_project_slug_idx" ON "price_alerts"("project_slug");

-- CreateIndex
CREATE INDEX "project_documents_project_slug_idx" ON "project_documents"("project_slug");

-- CreateIndex
CREATE INDEX "payment_plans_project_id_sort_order_idx" ON "payment_plans"("project_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "payment_plans_project_id_plan_type_key" ON "payment_plans"("project_id", "plan_type");

-- CreateIndex
CREATE UNIQUE INDEX "cost_sheets_project_id_key" ON "cost_sheets"("project_id");

-- CreateIndex
CREATE INDEX "chat_analytics_session_id_idx" ON "chat_analytics"("session_id");

-- CreateIndex
CREATE INDEX "chat_analytics_user_id_idx" ON "chat_analytics"("user_id");

-- CreateIndex
CREATE INDEX "chat_analytics_created_at_idx" ON "chat_analytics"("created_at");

-- CreateIndex
CREATE INDEX "chat_analytics_converted_builder_id_idx" ON "chat_analytics"("converted_builder_id");

-- CreateIndex
CREATE INDEX "chat_analytics_conversion_type_idx" ON "chat_analytics"("conversion_type");

-- CreateIndex
CREATE INDEX "query_metrics_created_at_idx" ON "query_metrics"("created_at");

-- CreateIndex
CREATE INDEX "query_metrics_sector_idx" ON "query_metrics"("sector");

-- CreateIndex
CREATE INDEX "query_metrics_week_start_idx" ON "query_metrics"("week_start");

-- CreateIndex
CREATE INDEX "query_metrics_intent_type_idx" ON "query_metrics"("intent_type");

-- CreateIndex
CREATE INDEX "weekly_metrics_summary_week_start_idx" ON "weekly_metrics_summary"("week_start");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_metrics_summary_week_start_key" ON "weekly_metrics_summary"("week_start");

-- CreateIndex
CREATE INDEX "property_events_session_id_idx" ON "property_events"("session_id");

-- CreateIndex
CREATE INDEX "property_events_project_id_idx" ON "property_events"("project_id");

-- CreateIndex
CREATE INDEX "property_events_user_id_idx" ON "property_events"("user_id");

-- CreateIndex
CREATE INDEX "property_events_action_idx" ON "property_events"("action");

-- CreateIndex
CREATE INDEX "property_events_created_at_idx" ON "property_events"("created_at");

-- CreateIndex
CREATE INDEX "promotionals_is_active_starts_at_ends_at_idx" ON "promotionals"("is_active", "starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "promotionals_builder_id_idx" ON "promotionals"("builder_id");

-- CreateIndex
CREATE INDEX "promotional_interactions_promotional_id_created_at_idx" ON "promotional_interactions"("promotional_id", "created_at");

-- CreateIndex
CREATE INDEX "promotional_interactions_interaction_type_idx" ON "promotional_interactions"("interaction_type");

-- CreateIndex
CREATE INDEX "builder_news_builder_id_idx" ON "builder_news"("builder_id");

-- CreateIndex
CREATE INDEX "builder_news_status_idx" ON "builder_news"("status");

-- CreateIndex
CREATE INDEX "builder_news_published_at_idx" ON "builder_news"("published_at");

-- CreateIndex
CREATE INDEX "builder_application_forms_status_idx" ON "builder_application_forms"("status");

-- CreateIndex
CREATE INDEX "builder_application_forms_email_idx" ON "builder_application_forms"("email");

-- CreateIndex
CREATE INDEX "builder_application_forms_submitted_at_idx" ON "builder_application_forms"("submitted_at");

-- CreateIndex
CREATE UNIQUE INDEX "builder_accounts_builder_id_key" ON "builder_accounts"("builder_id");

-- CreateIndex
CREATE INDEX "builder_accounts_user_id_idx" ON "builder_accounts"("user_id");

-- CreateIndex
CREATE INDEX "builder_accounts_is_active_idx" ON "builder_accounts"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "builder_accounts_email_key" ON "builder_accounts"("email");

-- CreateIndex
CREATE INDEX "builder_leads_builder_id_idx" ON "builder_leads"("builder_id");

-- CreateIndex
CREATE INDEX "builder_leads_status_idx" ON "builder_leads"("status");

-- CreateIndex
CREATE INDEX "builder_leads_created_at_idx" ON "builder_leads"("created_at");

-- CreateIndex
CREATE INDEX "builder_analytics_builder_id_idx" ON "builder_analytics"("builder_id");

-- CreateIndex
CREATE UNIQUE INDEX "builder_analytics_builder_id_date_key" ON "builder_analytics"("builder_id", "date");

-- CreateIndex
CREATE INDEX "ai_usage_events_user_id_created_at_idx" ON "ai_usage_events"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "ai_usage_events_created_at_idx" ON "ai_usage_events"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "builder_themes_builder_id_key" ON "builder_themes"("builder_id");

-- CreateIndex
CREATE INDEX "builder_themes_builder_id_idx" ON "builder_themes"("builder_id");

-- CreateIndex
CREATE INDEX "builder_themes_active_from_active_until_idx" ON "builder_themes"("active_from", "active_until");

-- CreateIndex
CREATE INDEX "shared_shortlists_created_at_idx" ON "shared_shortlists"("created_at");

-- CreateIndex
CREATE INDEX "shared_shortlists_expires_at_idx" ON "shared_shortlists"("expires_at");

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

-- CreateIndex
CREATE INDEX "unit_inventory_project_id_idx" ON "unit_inventory"("project_id");

-- CreateIndex
CREATE INDEX "unit_inventory_unit_type_id_idx" ON "unit_inventory"("unit_type_id");

-- CreateIndex
CREATE INDEX "unit_inventory_status_idx" ON "unit_inventory"("status");

-- CreateIndex
CREATE UNIQUE INDEX "unit_inventory_project_id_tower_name_floor_number_unit_numb_key" ON "unit_inventory"("project_id", "tower_name", "floor_number", "unit_number");

-- CreateIndex
CREATE INDEX "project_channel_partners_project_id_idx" ON "project_channel_partners"("project_id");

-- CreateIndex
CREATE INDEX "project_channel_partners_is_featured_idx" ON "project_channel_partners"("is_featured");

-- CreateIndex
CREATE UNIQUE INDEX "project_channel_partners_project_id_channel_partner_id_key" ON "project_channel_partners"("project_id", "channel_partner_id");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_builder_id_fkey" FOREIGN KEY ("builder_id") REFERENCES "builders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_dna" ADD CONSTRAINT "project_dna_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_profiles" ADD CONSTRAINT "decision_profiles_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persona_profiles" ADD CONSTRAINT "persona_profiles_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_profiles" ADD CONSTRAINT "recommendation_profiles_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_competitors" ADD CONSTRAINT "project_competitors_competitor_project_id_fkey" FOREIGN KEY ("competitor_project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_competitors" ADD CONSTRAINT "project_competitors_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_types" ADD CONSTRAINT "unit_types_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "construction_milestones" ADD CONSTRAINT "construction_milestones_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "construction_updates" ADD CONSTRAINT "construction_updates_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_lifecycle_updates" ADD CONSTRAINT "project_lifecycle_updates_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "builder_delivery_records" ADD CONSTRAINT "builder_delivery_records_builder_id_fkey" FOREIGN KEY ("builder_id") REFERENCES "builders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_images" ADD CONSTRAINT "project_images_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "amenities" ADD CONSTRAINT "amenities_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connectivity" ADD CONSTRAINT "connectivity_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_focus_project_id_fkey" FOREIGN KEY ("focus_project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_properties" ADD CONSTRAINT "saved_properties_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_plans" ADD CONSTRAINT "payment_plans_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_sheets" ADD CONSTRAINT "cost_sheets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_analytics" ADD CONSTRAINT "chat_analytics_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "query_metrics" ADD CONSTRAINT "query_metrics_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_events" ADD CONSTRAINT "property_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotional_interactions" ADD CONSTRAINT "promotional_interactions_promotional_id_fkey" FOREIGN KEY ("promotional_id") REFERENCES "promotionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "builder_news" ADD CONSTRAINT "builder_news_builder_id_fkey" FOREIGN KEY ("builder_id") REFERENCES "builders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "builder_accounts" ADD CONSTRAINT "builder_accounts_builder_id_fkey" FOREIGN KEY ("builder_id") REFERENCES "builders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "builder_leads" ADD CONSTRAINT "builder_leads_builder_id_fkey" FOREIGN KEY ("builder_id") REFERENCES "builders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "builder_themes" ADD CONSTRAINT "builder_themes_builder_id_fkey" FOREIGN KEY ("builder_id") REFERENCES "builders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_inventory" ADD CONSTRAINT "unit_inventory_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_inventory" ADD CONSTRAINT "unit_inventory_unit_type_id_fkey" FOREIGN KEY ("unit_type_id") REFERENCES "unit_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_channel_partners" ADD CONSTRAINT "project_channel_partners_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_channel_partners" ADD CONSTRAINT "project_channel_partners_channel_partner_id_fkey" FOREIGN KEY ("channel_partner_id") REFERENCES "channel_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

node.exe : ┌─────────────────────────────────────────────────────────┐
At C:\Users\Furqan\AppData\Roaming\npm\npx.ps1:24 char:5
+     & "node$exe"  "$basedir/node_modules/npm/bin/npx-cli.js" $args
+     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : NotSpecified: (┌──────────────...──────────────┐:String) [], RemoteException
    + FullyQualifiedErrorId : NativeCommandError
 
│  Update available 5.22.0 -> 7.9.1                       │
│                                                         │
│  This is a major update - please follow the guide at    │
│  https://pris.ly/d/major-version-upgrade                │
│                                                         │
│  Run the following to update                            │
│    npm i --save-dev prisma@latest                       │
│    npm i @prisma/client@latest                          │
└─────────────────────────────────────────────────────────┘
