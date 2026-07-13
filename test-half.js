// generate-swagger.js - Run: node generate-swagger.js
// Generates swagger.json in project root from actual route analysis
const fs = require('fs');

const spec = {
  openapi: "3.1.0",
  info: {
    title: "UiRealtyPals API",
    description: "Full REST API for UiRealtyPals - AI-powered real estate discovery platform for Noida. Auth: users send Authorization: Bearer <supabase-access-token>. Admin uses admin_session cookie. Webhooks use X-Webhook-Secret header.",
    version: "1.0.0",
    contact: { name: "RealtyPals Engineering", url: "https://realtypals.in" },
    license: { name: "Proprietary" }
  },
  servers: [
    { url: "http://localhost:3001", description: "Local dev server" },
    { url: "https://realtypals-backend.onrender.com", description: "Production (Render)" }
  ],
  tags: [
    { name: "System", description: "Health probes and infrastructure" },
    { name: "Projects", description: "Property project listings and detail" },
    { name: "Builders", description: "Builder profiles and AI reputation reports" },
    { name: "Chat", description: "Conversational AI property discovery (supports SSE streaming)" },
    { name: "Leads", description: "Callbacks, site visits, and webhook ingestion" },
    { name: "Saved", description: "User saved/favourited properties" },
    { name: "Sessions", description: "Chat session management and re-engagement" },
    { name: "Documents", description: "Project document upload and AI Q&A" },
    { name: "Analytics", description: "Engagement and promotion event tracking" },
    { name: "Price Alerts", description: "Property price drop notifications" },
    { name: "Market", description: "Sector-level market data and registry prices" },
    { name: "Location", description: "Commute profiles, AQI, nearby metro stations" },
    { name: "Transcribe", description: "Audio to text via Groq Whisper (Hindi/Hinglish)" },
    { name: "Builder Registration", description: "Public builder onboarding application form" },
    { name: "Builder Applications", description: "Admin review and approval of builder applications" },
    { name: "Admin", description: "Admin panel management — requires admin_session cookie" }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http", scheme: "bearer", bearerFormat: "JWT",
        description: "Supabase access token. Obtain via supabase.auth.signIn*(). Send as: Authorization: Bearer <token>"
      },
      AdminSession: {
        type: "apiKey", in: "cookie", name: "admin_session",
        description: "Admin session cookie set by POST /api/v1/admin/login. Required for all /admin/* routes."
      },
      WebhookSecret: {
        type: "apiKey", in: "header", name: "X-Webhook-Secret",
        description: "HMAC-SHA256 secret for webhook lead ingestion."
      }
    },
    schemas: {
      Error: {
        type: "object", required: ["error"],
        properties: { error: { type: "string", example: "Not found" } }
      },
      ValidationError: {
        type: "object", required: ["error"],
        properties: {
          error: { type: "string" },
          details: { type: "array", items: { type: "object", properties: { path: { type: "array", items: { type: "string" } }, message: { type: "string" } } } }
        }
      },
      UnitType: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          project_id: { type: "string", format: "uuid" },
          bhk: { type: "integer", example: 3 },
          price_min_cr: { type: "number", example: 1.85, description: "Minimum price in Crore INR" },
          price_max_cr: { type: "number", example: 3.14 },
          super_area_sqft: { type: "integer", example: 1650 },
          carpet_area_sqft: { type: "integer", example: 1250 }
        }
      },
      ProjectImage: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          url: { type: "string", format: "uri" },
          type: { type: "string", enum: ["hero", "gallery", "floor_plan", "amenity"] },
          sort_order: { type: "integer" }
        }
      },
      ProjectDNA: {
        type: "object",
        description: "Verified intelligence labels for key decision factors",
        properties: {
          builder_track_record_label: { type: "string", example: "Strong" },
          price_position_label: { type: "string", example: "Below Market" },
          locality_label: { type: "string", example: "Prime" },
          rera_compliance_label: { type: "string", example: "Compliant" },
          amenity_depth_label: { type: "string", example: "Excellent" },
          possession_certainty_label: { type: "string", example: "On Track" },
          last_verified_at: { type: "string", format: "date-time" }
        }
      },
      ProjectCard: {
        type: "object",
        description: "Lightweight project card for listing and chat responses",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string", example: "Godrej Meridien" },
          slug: { type: "string", example: "godrej-meridien-sector-106" },
          tagline: { type: "string" },
          sector: { type: "string", example: "Sector 106" },
          city: { type: "string", example: "Noida" },
          status: { type: "string", enum: ["under_construction", "ready_to_move", "new_launch"] },
          possession_date: { type: "string", format: "date", nullable: true },
          rera_number: { type: "string", nullable: true },
          total_units: { type: "integer", nullable: true },
          total_towers: { type: "integer", nullable: true },
          land_area_acres: { type: "number", nullable: true },
          builder: { type: "object", properties: { name: { type: "string" }, slug: { type: "string" } } },
          unit_types: { type: "array", items: { "$ref": "#/components/schemas/UnitType" } },
          images: { type: "array", items: { "$ref": "#/components/schemas/ProjectImage" } }
        }
      },
      ProjectDetail: {
        allOf: [
          { "$ref": "#/components/schemas/ProjectCard" },
          {
            type: "object",
            properties: {
              description: { type: "string", nullable: true },
              launch_date: { type: "string", format: "date", nullable: true },
              project_risk_flag: { type: "string", nullable: true },
              amenities: {
                type: "array",
                items: { type: "object", properties: { id: { type: "string", format: "uuid" }, name: { type: "string" }, category: { type: "string" }, icon: { type: "string" } } }
              },
              connectivity: {
                type: "array",
                items: { type: "object", properties: { id: { type: "string", format: "uuid" }, place_name: { type: "string" }, place_type: { type: "string" }, distance_km: { type: "number" }, travel_mode: { type: "string" }, travel_time_min: { type: "integer" } } }
              },
              dna: { "$ref": "#/components/schemas/ProjectDNA", nullable: true },
              decision_profile: {
                nullable: true, type: "object",
                properties: { status: { type: "string" }, decision_thesis: { type: "string" }, why_buy: { type: "array", items: { type: "string" } }, why_avoid: { type: "array", items: { type: "string" } }, best_for: { type: "string" }, not_ideal_for: { type: "string" }, confidence_sources: { type: "array", items: { type: "string" } }, intelligence_data: { type: "object" }, last_verified_at: { type: "string", format: "date-time" } }
              },
              recommendation_profile: {
                nullable: true, type: "object",
                properties: { status: { type: "string" }, tier: { type: "string", enum: ["S", "A", "B", "C"] }, primary_thesis: { type: "string" }, end_use_thesis: { type: "string" }, investment_thesis: { type: "string" }, family_thesis: { type: "string" }, investor_thesis: { type: "string" }, luxury_thesis: { type: "string" }, risk_thesis: { type: "string" }, walk_away_conditions: { type: "string" }, timeline_advice: { type: "string" }, negotiation_leverage: { type: "string" }, last_verified_at: { type: "string", format: "date-time" } }
              },
              persona_profile: { type: "object", nullable: true },
              competitors: {
                type: "array",
                items: { type: "object", properties: { id: { type: "string", format: "uuid" }, competitor_name: { type: "string" }, competitor_slug: { type: "string" }, this_project_advantage: { type: "string" }, competitor_advantage: { type: "string" }, verdict: { type: "string" }, price_delta_note: { type: "string" }, sort_order: { type: "integer" } } }
              },
              recommendation_score: { type: "number", description: "Deterministic 0-100 score from DNA signals. Never LLM-generated." },
              reportUrl: { type: "string", format: "uri" }
            }
          }
        ]
      },
      Builder: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string", example: "Godrej Properties" },
          slug: { type: "string", example: "godrej-properties" },
          tagline: { type: "string", nullable: true },
          logo_url: { type: "string", format: "uri", nullable: true },
          founded_year: { type: "integer", nullable: true },
          headquarters: { type: "string", nullable: true },
          credai_member: { type: "boolean" },
          delivered_units: { type: "integer", nullable: true },
          delivered_projects: { type: "array", items: { type: "string" } },
          ongoing_projects: { type: "array", items: { type: "string" } },
          awards_count: { type: "integer", nullable: true },
          description: { type: "string", nullable: true },
          delivery_score: { type: "number", minimum: 0, maximum: 100, nullable: true },
          construction_quality_score: { type: "number", minimum: 0, maximum: 100, nullable: true },
          verification_level: { type: "string", nullable: true },
          intelligence_completeness: { type: "number", nullable: true },
          legal_flag: { type: "string", nullable: true }
        }
      },
      LeadCallback: {
        type: "object", required: ["name", "phone"],
        properties: {
          name: { type: "string", minLength: 1, example: "Rahul Sharma" },
          phone: { type: "string", minLength: 10, example: "9876543210" },
          projectName: { type: "string", example: "Godrej Meridien" },
          projectSlug: { type: "string", example: "godrej-meridien-sector-106" },
          session_id: { type: "string", description: "Chat session ID for conversion attribution" },
          guestToken: { type: "string", description: "Guest tracking token" }
        }
      },
      LeadSiteVisit: {
        type: "object", required: ["name", "phone", "projectSlug", "projectName", "visitDate", "timeSlot"],
        properties: {
          name: { type: "string", minLength: 1 },
          phone: { type: "string", minLength: 10 },
          projectSlug: { type: "string", minLength: 1 },
          projectName: { type: "string" },
          visitDate: { type: "string", format: "date-time", description: "Must be a future date" },
          timeSlot: { type: "string", example: "10:00 AM - 11:00 AM" },
          session_id: { type: "string" },
          guestToken: { type: "string" }
        }
      },
      PriceAlert: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          project_id: { type: "string", format: "uuid" },
          project_slug: { type: "string" },
          target_price_cr: { type: "number", example: 1.75 },
          notified: { type: "boolean" },
          user_id: { type: "string", format: "uuid", nullable: true },
 const x = 1;