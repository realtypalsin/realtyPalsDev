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
 const x = 1;