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
 const x = 1;