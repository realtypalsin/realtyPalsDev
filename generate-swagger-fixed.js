// generate-swagger.js - Run: node generate-swagger.js
// Generates swagger.json in project root from actual route analysis
const fs = require('fs');

const spec = {
  openapi: "3.1.0",
  info: {
    title: "UiRealtyPals API",
    description: "Full REST API for UiRealtyPals — AI-powered real estate discovery platform for Noida. Auth: users send `Authorization: Bearer <supabase-access-token>`. Admin uses `admin_session` cookie. Webhooks use `X-Webhook-Secret` header.",
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
          guest_token: { type: "string", nullable: true },
          created_at: { type: "string", format: "date-time" }
        }
      },
      Document: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          storage_url: { type: "string", format: "uri" },
          doc_type: { type: "string", enum: ["rera", "brochure", "floor_plan", "price_list", "payment_plan", "legal", "other"] },
          file_size_bytes: { type: "integer", nullable: true },
          created_at: { type: "string", format: "date-time" }
        }
      },
      BuilderApplicationSubmit: {
        type: "object", required: ["name", "email", "phone", "cin"],
        properties: {
          name: { type: "string", minLength: 1, example: "Prestige Group" },
          email: { type: "string", format: "email" },
          phone: { type: "string", pattern: "^\\+91\\d{10}$", example: "+919876543210" },
          cin: { type: "string", minLength: 21, maxLength: 21, description: "Company Identification Number (MCA 21-char format)", example: "L07010DL2000PLC107540" },
          website: { type: "string", format: "uri", nullable: true },
          headquarters: { type: "string" },
          description: { type: "string" },
          logo_url: { type: "string", description: "Public URL or base64-encoded image (PNG/JPG/WebP, max 2MB)" },
          legal_entities: { type: "array", items: { type: "object", properties: { name: { type: "string" }, registration_number: { type: "string" } } } },
          executives: { type: "array", items: { type: "object", properties: { name: { type: "string" }, title: { type: "string" }, experience_years: { type: "integer" } } } },
          projects: { type: "array", items: { type: "string" }, description: "Project names already delivered" },
          delivery_track: { type: "string" }
        }
      },
      HealthResponse: {
        type: "object",
        properties: {
          ok: { type: "boolean" },
          version: { type: "string", example: "1.0.0" },
          uptime: { type: "integer", description: "Seconds since process start" },
          db: { type: "string", enum: ["ok", "error"] },
          redis: { type: "string", enum: ["ok", "degraded"] }
        }
      }
    },
    parameters: {
      SlugPath: { name: "slug", in: "path", required: true, schema: { type: "string" }, description: "URL-safe slug identifier" },
      PageQuery: { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 }, description: "Page number for pagination" },
      GuestTokenQuery: { name: "guest_token", in: "query", schema: { type: "string" }, description: "UUID token for unauthenticated guest users" }
    },
    responses: {
      Unauthorized: { description: "Unauthorized — valid Bearer token or admin session required", content: { "application/json": { schema: { "$ref": "#/components/schemas/Error" } } } },
      NotFound: { description: "Resource not found", content: { "application/json": { schema: { "$ref": "#/components/schemas/Error" } } } },
      BadRequest: { description: "Invalid request body or query parameters", content: { "application/json": { schema: { "$ref": "#/components/schemas/ValidationError" } } } },
      RateLimited: { description: "Too many requests — IP rate limit exceeded", content: { "application/json": { schema: { "$ref": "#/components/schemas/Error" } } } }
    }
  },
  paths: {
    "/api/v1/health": {
      get: { tags: ["System"], summary: "Health probe", description: "Checks DB and Redis. Returns 200 healthy, 503 DB unreachable. Used by Render health checks.", operationId: "getHealth", responses: { "200": { description: "Healthy", content: { "application/json": { schema: { "$ref": "#/components/schemas/HealthResponse" }, example: { ok: true, version: "1.0.0", uptime: 3600, db: "ok", redis: "ok" } } } }, "503": { description: "DB unreachable", content: { "application/json": { schema: { "$ref": "#/components/schemas/HealthResponse" } } } } } }
    },
    "/api/v1/projects": {
      get: {
        tags: ["Projects"], summary: "List projects", description: "Filtered project list (max 20). Cached Redis 5 min. All params optional.", operationId: "listProjects",
        parameters: [
          { name: "sector", in: "query", schema: { type: "string" }, example: "Sector 150", description: "Case-insensitive partial match" },
          { name: "city", in: "query", schema: { type: "string", default: "Noida" } },
          { name: "bhk", in: "query", schema: { type: "integer" }, example: 3, description: "BHK count filter" },
          { name: "budget_max_cr", in: "query", schema: { type: "number" }, example: 2.5, description: "Max price in Crore INR" },
          { name: "status", in: "query", schema: { type: "string", enum: ["under_construction", "ready_to_move", "new_launch"] } }
        ],
        responses: {
          "200": { description: "Project list", headers: { "X-Cache": { schema: { type: "string", enum: ["HIT", "MISS"] }, description: "Redis cache status" } }, content: { "application/json": { schema: { type: "object", properties: { projects: { type: "array", items: { "$ref": "#/components/schemas/ProjectCard" } } } } } } },
          "400": { "$ref": "#/components/responses/BadRequest" }
        }
      }
    },
    "/api/v1/projects/{slug}": {
      get: { tags: ["Projects"], summary: "Get project detail", description: "Full detail: DNA, decision profile, recommendation profile, persona, competitors, amenities, connectivity, computed recommendation_score. Cached 15 min. Internal DNA raw scores stripped from response.", operationId: "getProjectBySlug", parameters: [ { "$ref": "#/components/parameters/SlugPath" } ], responses: { "200": { description: "Project detail", content: { "application/json": { schema: { type: "object", properties: { project: { "$ref": "#/components/schemas/ProjectDetail" } } } } } }, "404": { "$ref": "#/components/responses/NotFound" } } }
    },
    "/api/v1/projects/{slug}/documents": {
      get: { tags: ["Projects", "Documents"], summary: "List project documents", description: "RERA, brochures, floor plans. Ordered newest first.", operationId: "getProjectDocuments", parameters: [ { "$ref": "#/components/parameters/SlugPath" } ], responses: { "200": { description: "Documents", content: { "application/json": { schema: { type: "object", properties: { documents: { type: "array", items: { "$ref": "#/components/schemas/Document" } } } } } } }, "404": { "$ref": "#/components/responses/NotFound" } } }
    },
    "/api/v1/projects/{slug}/payment-plan": {
      get: { tags: ["Projects"], summary: "Get payment plan", description: "Verified payment schedule or available:false with guidance.", operationId: "getProjectPaymentPlan", parameters: [ { "$ref": "#/components/parameters/SlugPath" } ], responses: { "200": { description: "Payment plan or unavailability notice", content: { "application/json": { schema: { type: "object", properties: { available: { type: "boolean" }, plan: { type: "object", nullable: true }, message: { type: "string", nullable: true } } } } } }, "404": { "$ref": "#/components/responses/NotFound" } } }
    },
    "/api/v1/projects/{slug}/cost-sheet": {
      get: { tags: ["Projects"], summary: "Get cost sheet", description: "Verified cost breakdown (GST, stamp duty, registration, IFMS, club, parking) + illustrative total for representative unit.", operationId: "getProjectCostSheet", parameters: [ { "$ref": "#/components/parameters/SlugPath" } ], responses: { "200": { description: "Cost sheet", content: { "application/json": { schema: { type: "object", properties: { available: { type: "boolean" }, sheet: { type: "object", nullable: true }, illustration: { nullable: true, type: "object", properties: { base_price_cr: { type: "number" }, gst_cr: { type: "number" }, stamp_duty_cr: { type: "number" }, registration_cr: { type: "number" }, parking_cr: { type: "number" }, ifms_cr: { type: "number" }, club_cr: { type: "number" }, total_cost_cr: { type: "number" } } }, illustration_note: { type: "string", nullable: true }, message: { type: "string", nullable: true } } } } } }, "404": { "$ref": "#/components/responses/NotFound" } } }
    },
    "/api/v1/projects/{slug}/investment": {
      get: { tags: ["Projects"], summary: "Get investment intelligence", description: "AI-derived investment indicators from DNA scores — never LLM-fabricated. Always includes disclaimer.", operationId: "getProjectInvestment", parameters: [ { "$ref": "#/components/parameters/SlugPath" } ], responses: { "200": { description: "Investment intelligence", content: { "application/json": { schema: { type: "object", properties: { available: { type: "boolean" }, intelligence: { nullable: true, type: "object", properties: { sector: { type: "string" }, status: { type: "string" }, possession_date: { type: "string", format: "date", nullable: true }, investment_thesis: { type: "string", nullable: true }, investor_thesis: { type: "string", nullable: true }, potential_appreciation: { type: "string", enum: ["Strong", "Moderate", "Weak"], nullable: true }, data_note: { type: "string" } } } } } } } }, "404": { "$ref": "#/components/responses/NotFound" } } }
    },
    "/api/v1/builders": {
      get: { tags: ["Builders"], summary: "List all builders", description: "All verified builders alphabetically. Includes project count. Cached 5 min.", operationId: "listBuilders", responses: { "200": { description: "Builder list", content: { "application/json": { schema: { type: "object", properties: { builders: { type: "array", items: { "$ref": "#/components/schemas/Builder" } } } } } } } } }
    },
    "/api/v1/builders/{slug}": {
      get: { tags: ["Builders"], summary: "Get builder profile", description: "Full builder profile + all their projects (unit types + hero images). Cached 1 hour.", operationId: "getBuilderBySlug", parameters: [ { "$ref": "#/components/parameters/SlugPath" } ], responses: { "200": { description: "Builder with projects", content: { "application/json": { schema: { type: "object", properties: { builder: { allOf: [ { "$ref": "#/components/schemas/Builder" }, { type: "object", properties: { projects: { type: "array", items: { "$ref": "#/components/schemas/ProjectCard" } } } } ] } } } } } }, "404": { "$ref": "#/components/responses/NotFound" } } }
    },
    "/api/v1/builder-reputation": {
      get: { tags: ["Builders"], summary: "AI builder reputation report", description: "AI-generated reputation analysis by builder name. Cached 24 hours. No auth required.", operationId: "getBuilderReputation", parameters: [ { name: "name", in: "query", required: true, schema: { type: "string", minLength: 2 }, example: "Godrej Properties" } ], responses: { "200": { description: "Reputation report (dynamic AI response)", content: { "application/json": { schema: { type: "object", description: "Contains reputation score, track record summary, risk flags — varies by AI response" } } } }, "400": { "$ref": "#/components/responses/BadRequest" } } }
    },
    "/api/v1/chat": {
      post: {
        tags: ["Chat"], summary: "Send a chat message", description: "Core conversational AI endpoint. Supports SSE streaming (stream:true) or JSON. Implements prompt injection sanitization (OWASP LLM01). Per-session rate limiting. Authenticated users get personalized memory; guests use guestToken for persistence.", operationId: "sendChatMessage",
        security: [ {}, { BearerAuth: [] } ],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["message"], properties: { message: { type: "string", maxLength: 2000, example: "Show me 3 BHK under 2 crore in Sector 150 Noida" }, sessionId: { type: "string", description: "Existing session UUID. Omit to start new." }, guestToken: { type: "string", description: "UUID in localStorage for guest users. Preserves context across sessions." }, stream: { type: "boolean", default: false, description: "If true, response is streamed as Server-Sent Events (text/event-stream)" } }, example: { message: "Compare Godrej Meridien with ATS Destinaire", sessionId: "550e8400-e29b-41d4-a716-446655440000", guestToken: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" } } } } },
        responses: {
          "200": { description: "AI response", content: { "application/json": { schema: { type: "object", properties: { message: { type: "string" }, sessionId: { type: "string", format: "uuid" }, projects: { type: "array", items: { "$ref": "#/components/schemas/ProjectCard" }, description: "Recommended properties" }, follow_up_prompts: { type: "array", items: { type: "string" } }, blocked: { type: "boolean", description: "True if prompt injection filter blocked the message" } } } }, "text/event-stream": { schema: { type: "string", description: "SSE stream. Events: data: {delta: string}. Final: data: {done: true, projects: [...], sessionId: ...}" } } },
          "400": { "$ref": "#/components/responses/BadRequest" }, "429": { "$ref": "#/components/responses/RateLimited" } }
      }
    },
    "/api/v1/leads/count": {
      get: { tags: ["Leads"], summary: "Today lead count", description: "Count of site visit requests created today. Auth required.", operationId: "getLeadCount", security: [ { BearerAuth: [] } ], responses: { "200": { description: "Count", content: { "application/json": { schema: { type: "object", properties: { count: { type: "integer" } } } } } }, "401": { "$ref": "#/components/responses/Unauthorized" } } }
    },
    "/api/v1/leads/callback": {
      post: { tags: ["Leads"], summary: "Request a callback", description: "Submits callback lead. Tracks conversion. Fires HMAC-signed webhook. Works for guests and authenticated users.", operationId: "requestCallback", security: [ {}, { BearerAuth: [] } ], requestBody: { required: true, content: { "application/json": { schema: { "$ref": "#/components/schemas/LeadCallback" } } } }, responses: { "201": { description: "Created", content: { "application/json": { schema: { type: "object", properties: { callback: { type: "object" } } } } } }, "400": { "$ref": "#/components/responses/BadRequest" } } }
    },
    "/api/v1/leads/site-visit": {
      post: { tags: ["Leads"], summary: "Request a site visit", description: "Books site visit. visitDate must be future. Fires webhook. Tracks conversion analytics.", operationId: "requestSiteVisit", security: [ {}, { BearerAuth: [] } ], requestBody: { required: true, content: { "application/json": { schema: { "$ref": "#/components/schemas/LeadSiteVisit" } } } }, responses: { "201": { description: "Created", content: { "application/json": { schema: { type: "object", properties: { siteVisit: { type: "object" } } } } } }, "400": { "$ref": "#/components/responses/BadRequest" }, "404": { "$ref": "#/components/responses/NotFound" } } }
    },
    "/api/v1/leads/webhook": {
      post: { tags: ["Leads"], summary: "Ingest external webhook lead", description: "Receives leads from external sources. Authenticates via X-Webhook-Secret. Responds 202 immediately, processes async (WhatsApp + Email notifications).", operationId: "ingestWebhookLead", security: [ { WebhookSecret: [] } ], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["type", "name", "phone", "timestamp"], properties: { type: { type: "string", enum: ["callback", "site_visit"] }, name: { type: "string", minLength: 1, maxLength: 100 }, phone: { type: "string", minLength: 8, maxLength: 20 }, project_name: { type: "string" }, project_slug: { type: "string" }, visit_date: { type: "string" }, time_slot: { type: "string" }, message: { type: "string", maxLength: 500 }, timestamp: { type: "string" } } } } } }, responses: { "202": { description: "Accepted for async processing", content: { "application/json": { schema: { type: "object", properties: { accepted: { type: "boolean" } } } } } }, "400": { "$ref": "#/components/responses/BadRequest" }, "401": { "$ref": "#/components/responses/Unauthorized" } } }
    },
    "/api/v1/saved": {
      get: { tags: ["Saved"], summary: "Get saved properties", description: "All saved properties for authenticated user ordered by most recently saved.", operationId: "getSavedProperties", security: [ { BearerAuth: [] } ], responses: { "200": { description: "Saved properties", content: { "application/json": { schema: { type: "object", properties: { projects: { type: "array", items: { "$ref": "#/components/schemas/ProjectCard" } }, count: { type: "integer" } } } } } }, "401": { "$ref": "#/components/responses/Unauthorized" } } },
      post: { tags: ["Saved"], summary: "Save a property", description: "Idempotent upsert. Also logs a PropertyEvent for analytics.", operationId: "saveProperty", security: [ { BearerAuth: [] } ], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["project_id"], properties: { project_id: { type: "string", format: "uuid" } } } } } }, responses: { "201": { description: "Saved", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } } }, "400": { "$ref": "#/components/responses/BadRequest" }, "401": { "$ref": "#/components/responses/Unauthorized" } } }
    },
    "/api/v1/saved/{id}/check": {
      get: { tags: ["Saved"], summary: "Check if property is saved", description: ":id = project_id UUID", operationId: "checkPropertySaved", security: [ { BearerAuth: [] } ], parameters: [ { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } } ], responses: { "200": { description: "Save status", content: { "application/json": { schema: { type: "object", properties: { is_saved: { type: "boolean" } } } } } }, "401": { "$ref": "#/components/responses/Unauthorized" } } }
    },
    "/api/v1/saved/{id}": {
      delete: { tags: ["Saved"], summary: "Remove saved property", description: ":id = project_id. Logs PropertyEvent.", operationId: "removeSavedProperty", security: [ { BearerAuth: [] } ], parameters: [ { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } } ], responses: { "200": { description: "Removed", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } } }, "401": { "$ref": "#/components/responses/Unauthorized" } } }
    },
    "/api/v1/sessions/re-engagement/latest": {
      get: { tags: ["Sessions"], summary: "Latest re-engagement session", description: "Most recent active session (last 7 days, phase past GATHERING). Used for 'Continue where you left off' UX.", operationId: "getLatestSession", security: [ {}, { BearerAuth: [] } ], parameters: [ { "$ref": "#/components/parameters/GuestTokenQuery" } ], responses: { "200": { description: "Session or null", content: { "application/json": { schema: { type: "object", properties: { session: { nullable: true, type: "object", properties: { id: { type: "string", format: "uuid" }, title: { type: "string" }, chat_phase: { type: "string", enum: ["GATHERING", "READY_TO_SEARCH", "SHORTLISTED", "ADVISOR"] }, last_active: { type: "string", format: "date-time" }, last_projects: { type: "array", items: { type: "string" } } } } } } } } } } }
    },
    "/api/v1/sessions/migrate": {
      post: { tags: ["Sessions"], summary: "Migrate guest sessions to user account", description: "Called on sign-in/sign-up. Migrates chat sessions and user memory from guest token to authenticated user.", operationId: "migrateSessions", security: [ { BearerAuth: [] } ], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["guestToken"], properties: { guestToken: { type: "string" } } } } } }, responses: { "200": { description: "Migrated", content: { "application/json": { schema: { type: "object", properties: { migrated: { type: "integer" } } } } } }, "401": { "$ref": "#/components/responses/Unauthorized" } } }
    },
    "/api/v1/documents": {
      get: { tags: ["Documents"], summary: "List documents for project", description: "Public. Pass ?slug=<project-slug>.", operationId: "listDocuments", parameters: [ { name: "slug", in: "query", required: true, schema: { type: "string" } } ], responses: { "200": { description: "Docs", content: { "application/json": { schema: { type: "object", properties: { docs: { type: "array", items: { "$ref": "#/components/schemas/Document" } } } } } } }, "400": { "$ref": "#/components/responses/BadRequest" } } },
      post: { tags: ["Documents"], summary: "Upload project document (admin)", description: "Admin only. Validates file by magic bytes (not just MIME). For images: extracts text via Groq vision. Orphaned files cleaned on DB error. Max 20MB. Allowed: PDF, JPEG, PNG, WebP.", operationId: "uploadDocument", security: [ { AdminSession: [] } ], requestBody: { required: true, content: { "multipart/form-data": { schema: { type: "object", required: ["file", "project_id", "project_slug"], properties: { file: { type: "string", format: "binary" }, project_id: { type: "string", format: "uuid" }, project_slug: { type: "string" }, doc_type: { type: "string", enum: ["rera", "brochure", "floor_plan", "price_list", "payment_plan", "legal", "other"], default: "other" } } } } } }, responses: { "201": { description: "Uploaded", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, id: { type: "string", format: "uuid" }, url: { type: "string", format: "uri" } } } } } }, "400": { "$ref": "#/components/responses/BadRequest" }, "401": { "$ref": "#/components/responses/Unauthorized" }, "404": { "$ref": "#/components/responses/NotFound" } } }
    },
    "/api/v1/documents/ask": {
      post: { tags: ["Documents"], summary: "AI Q&A over document", description: "Grounded Q&A — will not hallucinate. Rate limited 20/min per IP.", operationId: "askDocument", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["document_id", "question"], properties: { document_id: { type: "string", format: "uuid" }, question: { type: "string", minLength: 5, maxLength: 500, example: "What is the RERA registration number?" } } } } } }, responses: { "200": { description: "AI answer", content: { "application/json": { schema: { type: "object", properties: { answer: { type: "string" }, document_name: { type: "string" } } } } } }, "400": { "$ref": "#/components/responses/BadRequest" }, "404": { "$ref": "#/components/responses/NotFound" }, "429": { "$ref": "#/components/responses/RateLimited" }, "502": { description: "AI service unavailable" } } }
    },
    "/api/v1/analytics/engagement": {
      post: { tags: ["Analytics"], summary: "Track engagement event", description: "Tracks drop_off, first_engagement events for conversion funnel analytics.", operationId: "trackEngagement", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["session_id", "event"], properties: { session_id: { type: "string" }, event: { type: "string", example: "drop_off" }, project_id: { type: "string" }, drop_off_stage: { type: "string" }, idle_seconds: { type: "number" } } } } } }, responses: { "200": { description: "Recorded", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" } } } } } }, "400": { "$ref": "#/components/responses/BadRequest" } } }
    },
    "/api/v1/analytics/promotions": {
      post: { tags: ["Analytics"], summary: "Track promotion interaction", description: "Tracks impression or click events for promotional banners.", operationId: "trackPromotion", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["action", "promotional_id", "session_id"], properties: { action: { type: "string", enum: ["impression", "click"] }, promotional_id: { type: "string" }, session_id: { type: "string" }, user_id: { type: "string" }, guest_token: { type: "string" } } } } } }, responses: { "200": { description: "Tracked", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" } } } } } }, "400": { "$ref": "#/components/responses/BadRequest" } } }
    },
    "/api/v1/price-alerts": {
      get: { tags: ["Price Alerts"], summary: "Get price alerts", description: "Active (un-notified) alerts for user or guest.", operationId: "getPriceAlerts", security: [ {}, { BearerAuth: [] } ], parameters: [ { "$ref": "#/components/parameters/GuestTokenQuery" } ], responses: { "200": { description: "Active alerts", content: { "application/json": { schema: { type: "object", properties: { alerts: { type: "array", items: { "$ref": "#/components/schemas/PriceAlert" } } } } } } }, "401": { "$ref": "#/components/responses/Unauthorized" } } },
      post: { tags: ["Price Alerts"], summary: "Create price alert", description: "Requires Bearer token or guest_token in body.", operationId: "createPriceAlert", security: [ {}, { BearerAuth: [] } ], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["project_id", "project_slug", "target_price_cr"], properties: { project_id: { type: "string", format: "uuid" }, project_slug: { type: "string" }, target_price_cr: { type: "number", minimum: 0 }, guest_token: { type: "string" } } } } } }, responses: { "201": { description: "Created", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, id: { type: "string", format: "uuid" } } } } } }, "400": { "$ref": "#/components/responses/BadRequest" }, "401": { "$ref": "#/components/responses/Unauthorized" } } },
      delete: { tags: ["Price Alerts"], summary: "Delete price alert", description: "Delete by ?id=. Authenticated users only.", operationId: "deletePriceAlert", security: [ { BearerAuth: [] } ], parameters: [ { name: "id", in: "query", required: true, schema: { type: "string", format: "uuid" } } ], responses: { "200": { description: "Deleted", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" } } } } } }, "400": { "$ref": "#/components/responses/BadRequest" }, "401": { "$ref": "#/components/responses/Unauthorized" } } }
    },
    "/api/v1/market-comparison": {
      get: { tags: ["Market"], summary: "Sector market data", description: "Avg/min/max price per sqft, status breakdown, BHK distribution across sector projects. Cached 12 hours.", operationId: "getMarketComparison", parameters: [ { name: "sector", in: "query", required: true, schema: { type: "string" }, example: "Sector 150" }, { name: "city", in: "query", schema: { type: "string", default: "Noida" } } ], responses: { "200": { description: "Market data", content: { "application/json": { schema: { type: "object", properties: { sector: { type: "string" }, city: { type: "string" }, project_count: { type: "integer" }, avg_price_sqft: { type: "number", nullable: true, description: "INR per sqft" }, min_price_sqft: { type: "number", nullable: true }, max_price_sqft: { type: "number", nullable: true }, status_breakdown: { type: "object", additionalProperties: { type: "integer" } }, bhk_distribution: { type: "object", additionalProperties: { type: "integer" } } } } } } }, "400": { "$ref": "#/components/responses/BadRequest" }, "404": { "$ref": "#/components/responses/NotFound" } } }
    },
    "/api/v1/registry-prices": {
      get: { tags: ["Market"], summary: "Registry prices (coming soon)", description: "Returns available:false for all sectors. Data must come from verified DB records, never AI-generated.", operationId: "getRegistryPrices", parameters: [ { name: "sector", in: "query", required: true, schema: { type: "string" } }, { name: "city", in: "query", schema: { type: "string", default: "Noida" } } ], responses: { "200": { description: "Status", content: { "application/json": { schema: { type: "object", properties: { available: { type: "boolean" }, message: { type: "string" } } } } } }, "400": { "$ref": "#/components/responses/BadRequest" } } }
    },
    "/api/v1/aqi": {
      get: { tags: ["Location"], summary: "Current AQI", description: "Real-time AQI from Google Air Quality API. Cache-Control: 30 min. Returns null if API key not configured.", operationId: "getAQI", parameters: [ { name: "lat", in: "query", required: true, schema: { type: "number" }, example: 28.5045 }, { name: "lng", in: "query", required: true, schema: { type: "number" }, example: 77.408 } ], responses: { "200": { description: "AQI data or null", content: { "application/json": { schema: { type: "object", properties: { aqi: { type: "integer", nullable: true }, label: { type: "string", example: "Moderate", nullable: true }, color: { type: "string", example: "text-yellow-600", description: "Tailwind CSS class for UI color coding", nullable: true }, dominantPollutant: { type: "string", nullable: true }, station: { type: "string", nullable: true } } } } } }, "400": { "$ref": "#/components/responses/BadRequest" } } }
    },
    "/api/v1/commute": {
      get: { tags: ["Location"], summary: "Commute profile", description: "Drive and transit commute times + nearby metro stations (4km radius). Cached 6 hours.", operationId: "getCommute", parameters: [ { name: "origin", in: "query", required: true, schema: { type: "string", minLength: 2 }, example: "Sector 150, Noida" }, { name: "destination", in: "query", required: true, schema: { type: "string", minLength: 2 }, example: "Connaught Place, Delhi" }, { name: "lat", in: "query", schema: { type: "number" }, description: "Latitude for nearby metro search" }, { name: "lng", in: "query", schema: { type: "number" }, description: "Longitude for nearby metro search" } ], responses: { "200": { description: "Commute profile", content: { "application/json": { schema: { type: "object", properties: { origin: { type: "string" }, destination: { type: "string" }, drive: { type: "object", description: "Google Maps driving profile (duration, distance, steps)" }, transit: { type: "object", description: "Google Maps transit profile" }, nearby_metro: { type: "array", items: { type: "object" }, description: "Subway stations within 4km" } } } } } }, "400": { "$ref": "#/components/responses/BadRequest" } } }
    },
    "/api/v1/transcribe": {
      post: { tags: ["Transcribe"], summary: "Transcribe audio to text", description: "Groq Whisper large-v3-turbo. Hindi/Hinglish optimized. Rate limited 15/min per IP. Max 25MB. Supported: webm, ogg, wav, mp3, mp4, m4a, aac, flac.", operationId: "transcribeAudio", requestBody: { required: true, content: { "multipart/form-data": { schema: { type: "object", required: ["audio"], properties: { audio: { type: "string", format: "binary", description: "Audio file. Max 25MB." } } } } } }, responses: { "200": { description: "Transcription", content: { "application/json": { schema: { type: "object", properties: { text: { type: "string", example: "मुझे सेक्टर 150 में 3 BHK चाहिए" } } } } } }, "400": { "$ref": "#/components/responses/BadRequest" }, "429": { "$ref": "#/components/responses/RateLimited" }, "500": { description: "Transcription failed" } } }
    },
    "/api/v1/builder-registration": {
      post: { tags: ["Builder Registration"], summary: "Submit builder registration", description: "Public form. Rate limited 5/hour per IP. Validates CIN (Indian MCA 21-char format). Logo as base64 or URL. Fires admin webhook.", operationId: "submitBuilderRegistration", requestBody: { required: true, content: { "application/json": { schema: { "$ref": "#/components/schemas/BuilderApplicationSubmit" } } } }, responses: { "201": { description: "Application submitted", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, application_id: { type: "string", format: "uuid" }, message: { type: "string" } } } } } }, "400": { "$ref": "#/components/responses/BadRequest" }, "429": { "$ref": "#/components/responses/RateLimited" } } }
    },
    "/api/v1/builder-applications": {
      get: { tags: ["Builder Applications"], summary: "List builder applications (admin)", description: "Paginated list with optional status filter.", operationId: "listBuilderApplications", security: [ { AdminSession: [] } ], parameters: [ { "$ref": "#/components/parameters/PageQuery" }, { name: "status", in: "query", schema: { type: "string", enum: ["new", "under_review", "approved", "rejected", "clarification_requested", "all"] } } ], responses: { "200": { description: "Applications", content: { "application/json": { schema: { type: "object", properties: { applications: { type: "array", items: { type: "object" } }, total: { type: "integer" }, page: { type: "integer" }, limit: { type: "integer" }, pages: { type: "integer" } } } } } }, "401": { "$ref": "#/components/responses/Unauthorized" } } }
    },
    "/api/v1/builder-applications/{id}": {
      get: { tags: ["Builder Applications"], summary: "Get builder application (admin)", operationId: "getBuilderApplication", security: [ { AdminSession: [] } ], parameters: [ { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } } ], responses: { "200": { description: "Application", content: { "application/json": { schema: { type: "object" } } } }, "404": { "$ref": "#/components/responses/NotFound" }, "401": { "$ref": "#/components/responses/Unauthorized" } } },
      patch: { tags: ["Builder Applications"], summary: "Approve/reject application (admin)", description: "On approved: auto-creates Builder + BuilderAccount records. On rejected: sets status + notes.", operationId: "reviewBuilderApplication", security: [ { AdminSession: [] } ], parameters: [ { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } } ], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["status"], properties: { status: { type: "string", enum: ["approved", "rejected", "clarification_requested"] }, review_notes: { type: "string" } } } } } }, responses: { "200": { description: "Updated", content: { "application/json": { schema: { type: "object" } } } }, "400": { "$ref": "#/components/responses/BadRequest" }, "404": { "$ref": "#/components/responses/NotFound" }, "401": { "$ref": "#/components/responses/Unauthorized" } } }
    },
    "/api/v1/admin/login": {
      post: { tags: ["Admin"], summary: "Admin login", description: "Authenticates with ADMIN_PASSWORD. Sets httpOnly admin_session cookie. Required for all /admin/* routes.", operationId: "adminLogin", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["password"], properties: { password: { type: "string", format: "password" } } } } } }, responses: { "200": { description: "Login successful — cookie set", headers: { "Set-Cookie": { schema: { type: "string", example: "admin_session=<token>; HttpOnly; Secure; SameSite=Strict" } } }, content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } } }, "401": { "$ref": "#/components/responses/Unauthorized" } } }
    },
    "/api/v1/admin/projects": {
      get: { tags: ["Admin"], summary: "Admin: list all projects", operationId: "adminListProjects", security: [ { AdminSession: [] } ], responses: { "200": { description: "Full project list" }, "401": { "$ref": "#/components/responses/Unauthorized" } } },
      post: { tags: ["Admin"], summary: "Admin: create project", operationId: "adminCreateProject", security: [ { AdminSession: [] } ], requestBody: { required: true, content: { "application/json": { schema: { type: "object", description: "Project creation payload (mirrors Prisma Project model)" } } } }, responses: { "201": { description: "Created" }, "400": { "$ref": "#/components/responses/BadRequest" }, "401": { "$ref": "#/components/responses/Unauthorized" } } }
    },
    "/api/v1/admin/projects/{id}": {
      put: { tags: ["Admin"], summary: "Admin: update project", operationId: "adminUpdateProject", security: [ { AdminSession: [] } ], parameters: [ { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } } ], requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } }, responses: { "200": { description: "Updated" }, "401": { "$ref": "#/components/responses/Unauthorized" }, "404": { "$ref": "#/components/responses/NotFound" } } },
      delete: { tags: ["Admin"], summary: "Admin: delete project", operationId: "adminDeleteProject", security: [ { AdminSession: [] } ], parameters: [ { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } } ], responses: { "200": { description: "Deleted" }, "401": { "$ref": "#/components/responses/Unauthorized" } } }
    },
    "/api/v1/admin/leads": {
      get: { tags: ["Admin"], summary: "Admin: list leads", description: "All callback and site visit leads for admin review.", operationId: "adminListLeads", security: [ { AdminSession: [] } ], parameters: [ { "$ref": "#/components/parameters/PageQuery" } ], responses: { "200": { description: "Leads" }, "401": { "$ref": "#/components/responses/Unauthorized" } } }
    },
    "/api/v1/admin/analytics": {
      get: { tags: ["Admin"], summary: "Admin: analytics dashboard", description: "Aggregated analytics: PropertyEvent counts, ChatAnalytics, conversion funnel — last 30 days (capped at 50k events).", operationId: "adminGetAnalytics", security: [ { AdminSession: [] } ], responses: { "200": { description: "Analytics data" }, "401": { "$ref": "#/components/responses/Unauthorized" } } }
    },
    "/api/v1/admin/builders": {
      get: { tags: ["Admin"], summary: "Admin: list builders", operationId: "adminListBuilders", security: [ { AdminSession: [] } ], responses: { "200": { description: "Builders" }, "401": { "$ref": "#/components/responses/Unauthorized" } } }
    },
    "/api/v1/admin/news": {
      get: { tags: ["Admin"], summary: "Admin: list news items", operationId: "adminListNews", security: [ { AdminSession: [] } ], responses: { "200": { description: "News items" }, "401": { "$ref": "#/components/responses/Unauthorized" } } },
      post: { tags: ["Admin"], summary: "Admin: create news item", operationId: "adminCreateNews", security: [ { AdminSession: [] } ], requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } }, responses: { "201": { description: "Created" }, "401": { "$ref": "#/components/responses/Unauthorized" } } }
    },
    "/api/v1/admin/promotions": {
      get: { tags: ["Admin"], summary: "Admin: list promotions", operationId: "adminListPromotions", security: [ { AdminSession: [] } ], responses: { "200": { description: "Promotions" }, "401": { "$ref": "#/components/responses/Unauthorized" } } },
      post: { tags: ["Admin"], summary: "Admin: create promotion", operationId: "adminCreatePromotion", security: [ { AdminSession: [] } ], requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } }, responses: { "201": { description: "Created" }, "401": { "$ref": "#/components/responses/Unauthorized" } } }
    }
  }
};

fs.writeFileSync('swagger.json', JSON.stringify(spec, null, 2));
const size = fs.statSync('swagger.json').size;
console.log('✅ swagger.json written:', size, 'bytes', `(${(size/1024).toFixed(1)} KB)`);
