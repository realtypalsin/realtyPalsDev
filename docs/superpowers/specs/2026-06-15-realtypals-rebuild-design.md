# RealtyPals Rebuild — Design Spec
**Date:** 2026-06-15  
**Status:** Approved  
**Author:** Furqan (via Claude Code brainstorming)

---

## TL;DR

Full rebuild of RealtyPals as an Express.js + Next.js monorepo. The core problem to fix is a weak AI chat engine — no persistent memory, unreliable intent detection, context gets lost across sessions. This spec defines the architecture, AI engine, data model, and phased build plan.

---

## 1. Architecture

### Monorepo Layout

```
realtypals/
├── apps/
│   ├── backend/          # Express.js — AI engine, API, discovery
│   └── frontend/         # Next.js App Router — all UI
├── prisma/               # Shared Prisma schema + migrations
├── packages/
│   └── shared/           # Shared TypeScript types used by both apps
└── package.json          # pnpm workspace root
```

### Why Express + Next.js split

Backend logic (AI orchestration, scoring, webhooks, rate limiting) decoupled from UI rendering. AI engine can be tuned, monitored, and scaled without touching the frontend. Follows the pattern established in the RealtyPals reference project.

### Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Frontend | Next.js 15, React, TypeScript, Tailwind, shadcn/ui | Established stack |
| Backend | Express.js, TypeScript | Clean REST + SSE API |
| Database | PostgreSQL + Prisma | Existing stack |
| Auth | Supabase Auth | OTP + Google login |
| Storage | Supabase Storage | Images, documents |
| AI Primary | Groq (llama-3.3-70b) | Speed, cost |
| AI Fallback | Claude (claude-haiku-4-5) | Quality fallback |
| Cache | Upstash Redis | Rate limiting, session cache |
| Maps | Google Maps API | Commute time |
| Analytics | PostHog | Event tracking |
| Deployment | Vercel (frontend) + Render/Railway (backend) | |

---

## 2. AI Engine

### The Problem Being Fixed

Current chat sends messages to LLM with no user context, no memory, and unreliable intent extraction. Users must re-state preferences each session. AI responses feel generic because the model doesn't know anything about the user.

### New Pipeline

```
User message
    ↓
Intent Extractor (Groq, Zod-validated JSON output)
    ↓
Context Builder
  ├── System prompt (Hindi/Hinglish-aware)
  ├── User memory (bhk, budget, sector from DB — persists across sessions)
  ├── Conversation summary (if > 12 messages, compress old turns)
  └── Last 8 messages
    ↓
Discovery Engine (if intent = READY_TO_SEARCH)
  └── Score + rank projects 0-100
    ↓
Groq streaming → Claude fallback if error
    ↓
SSE events: { type: "intent" | "properties" | "token" | "done" | "error" }
    ↓
UserMemory update (persist detected preferences)
```

### Intent State Machine

```
COLD → GATHERING → READY_TO_SEARCH → SHORTLISTED
```

- `COLD`: no BHK and no budget
- `GATHERING`: BHK or budget (one missing)
- `READY_TO_SEARCH`: both present → trigger discovery
- `SHORTLISTED`: results shown, refining

Properties only shown when `READY_TO_SEARCH` or beyond. This prevents irrelevant results early in the conversation.

### Hindi / Hinglish Support

System prompt includes explicit Hinglish normalization rules:

| Input | Extracted |
|-------|-----------|
| "do BHK chahiye" | bhk: [2] |
| "teen BHK" | bhk: [3] |
| "ek crore mein" | budgetMax: 1.0 |
| "do crore tak" | budgetMax: 2.0 |
| "RTM chahiye" | possession: "immediate" |
| "Sector 150 mein" | sector: "Sector 150" |

AI responds in English by default. If user message is ≥80% Hindi/Devanagari, respond in Hindi.

### User Memory Layer

Persistent across all sessions. Survives logout/login. Guest token migrates to userId on signup.

```ts
UserMemory {
  userId?         // null for guests
  guestToken?     // UUID from localStorage
  bhk             // int[]
  budgetMin       // float (crore)
  budgetMax       // float (crore)
  sector          // string
  purpose         // "self_use" | "investment"
  timeline        // "immediate" | "1yr" | "2yr" | "3yr+"
  savedSlugs      // string[]
  viewedSlugs     // string[]
  rejectedSlugs   // string[]
  updatedAt
}
```

Every LLM request includes: "Here's what I know about this user: {memory}. Use this context but don't repeat it back unless asked."

### Conversation Compression

If session has > 12 messages: summarize messages 1 through N-8 into a compact summary. Store in `ChatSession.summary`. Send: summary + last 8 messages. Keeps context costs predictable, prevents context window overflow.

### Project Scoring (0-100)

| Factor | Max points | Logic |
|--------|-----------|-------|
| BHK match | 25 | Exact match |
| Budget fit | 25 | 0 if >20% over budget; scaled otherwise |
| Possession timeline | 20 | Matches user's timeline preference |
| Sector match | 15 | Substring match on sector name |
| Area fit | 10 | Carpet area within user preference range |
| Has hero image | 5 | Data quality signal |

Top 5 returned. Threshold: score ≥ 30 (or 0 if builder-only query).

---

## 3. Data Model

```prisma
model Builder {
  id             String   @id @default(cuid())
  name           String
  slug           String   @unique
  foundedYear    Int?
  deliveredUnits Int      @default(0)
  awards         String[]
  projects       Project[]
}

model Project {
  id             String        @id @default(cuid())
  name           String
  slug           String        @unique
  builderId      String
  builder        Builder       @relation(...)
  sector         String
  city           String        @default("Noida")
  status         ProjectStatus
  reraNumber     String?
  possessionDate DateTime?
  priceMin       Float?        // crore
  priceMax       Float?        // crore
  description    String?
  latitude       Float?
  longitude      Float?
  unitTypes      UnitType[]
  images         ProjectImage[]
  amenities      Amenity[]
  connectivity   Connectivity[]
  documents      ProjectDocument[]
}

model UnitType {
  id          String  @id @default(cuid())
  projectId   String
  project     Project @relation(...)
  bhk         Int
  carpetArea  Int     // sqft
  superArea   Int     // sqft
  priceMin    Float   // crore
  priceMax    Float   // crore
  inventory   Int?
}

model ProjectImage {
  id        String    @id @default(cuid())
  projectId String
  url       String
  type      ImageType // hero|exterior|interior|floor_plan|amenity
}

model Amenity {
  id        String          @id @default(cuid())
  projectId String
  category  AmenityCategory // sports|lifestyle|wellness|kids|security|parking
  name      String
}

model Connectivity {
  id           String           @id @default(cuid())
  projectId    String
  type         ConnectivityType // metro|school|hospital|mall|airport|road
  name         String
  distanceKm   Float
}

model ProjectDocument {
  id          String @id @default(cuid())
  projectId   String
  url         String
  contentText String? // extracted via Jina
}

model ChatSession {
  id            String        @id @default(cuid())
  userId        String?
  guestToken    String?
  phase         ChatPhase     @default(COLD)
  intentSnapshot Json?
  summary       String?       // conversation compression
  messages      ChatMessage[]
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
}

model ChatMessage {
  id        String      @id @default(cuid())
  sessionId String
  session   ChatSession @relation(...)
  role      MessageRole // user|assistant
  content   String
  createdAt DateTime    @default(now())
}

model UserMemory {
  id            String   @id @default(cuid())
  userId        String?  @unique
  guestToken    String?  @unique
  bhk           Int[]
  budgetMin     Float?
  budgetMax     Float?
  sector        String?
  purpose       String?
  timeline      String?
  savedSlugs    String[]
  viewedSlugs   String[]
  rejectedSlugs String[]
  updatedAt     DateTime @updatedAt
}

model SavedProperty {
  id        String  @id @default(cuid())
  userId    String
  projectId String
  createdAt DateTime @default(now())
}

model CallbackRequest {
  id          String   @id @default(cuid())
  name        String
  phone       String
  projectName String?
  userId      String?
  status      String   @default("new")
  createdAt   DateTime @default(now())
}

model SiteVisitRequest {
  id          String   @id @default(cuid())
  name        String
  phone       String
  projectSlug String
  visitDate   DateTime
  timeSlot    String
  userId      String?
  status      String   @default("pending")
  createdAt   DateTime @default(now())
}

enum ProjectStatus { UNDER_CONSTRUCTION READY_TO_MOVE NEW_LAUNCH }
enum ImageType { hero exterior interior floor_plan amenity }
enum AmenityCategory { sports lifestyle wellness kids security parking }
enum ConnectivityType { metro school hospital mall airport road }
enum ChatPhase { COLD GATHERING READY_TO_SEARCH SHORTLISTED }
enum MessageRole { user assistant }
```

---

## 4. Backend Routes

```
POST   /api/chat                     SSE streaming chat
GET    /api/sessions                 List user sessions
POST   /api/sessions                 Create session
GET    /api/sessions/:id             Get session + messages
POST   /api/sessions/migrate         Guest → user migration

GET    /api/projects                 Search (filters: sector, bhk, budget, status)
GET    /api/projects/:slug           Single project detail

GET    /api/saved                    User's saved list
POST   /api/saved                    Save a property
DELETE /api/saved/:id                Remove saved

POST   /api/leads/callback           Submit callback request
POST   /api/leads/site-visit         Book site visit

POST   /api/builder-reputation       AI-synthesized trust score
POST   /api/commute                  Google Maps commute time
POST   /api/documents/ask            RAG Q&A on project docs

GET    /api/admin/stats              Dashboard counts (secret header)
GET    /api/admin/leads              All leads (secret header)
POST   /api/admin/builders           Create builder
PUT    /api/admin/builders/:id       Update builder
POST   /api/admin/projects           Create project
PUT    /api/admin/projects/:id       Update project
POST   /api/admin/upload-image       Image upload to Supabase
```

---

## 5. Frontend Pages & Components

### Pages

| Route | Purpose | Auth |
|-------|---------|------|
| `/` | Landing — hero, query chips, search | None |
| `/chat` | New chat + re-engagement banner | Optional |
| `/chat/[id]` | Resume session | Optional |
| `/saved` | Shortlist | Required |
| `/compare` | Side-by-side (`?slugs=a,b`) | None |
| `/property/[slug]` | Detail page | None |
| `/auth` | Login / OTP / Google | None |
| `/admin` | Admin panel | Secret |

### Core Chat Components (from RealtyPals)

- `ChatShell` — SSE state machine, assembles whole chat UI
- `StatusSteps` — "Extracting intent → Searching → Generating…" visual steps
- `ReEngagementBanner` — "Welcome back! Last looking for 3BHK Sector 150. Continue?"
- `ConversationSidebar` — Session history list with dates and intent summary
- `FollowUpChips` — Contextual quick-reply suggestions
- `MessageStream` — Renders token stream as markdown + property cards
- `BuyerCriteriaHeader` — Shows detected intent (BHK / budget / sector / timeline)

### Property Components (from RealtyPalsxElite)

- `ProjectCard` — Compact card (price, BHK, status, hero image, match reason)
- `PropertySlideOver` — Full detail modal with tabs:
  - Overview (RERA, status, possession, price range, description)
  - Floor Plans (unit types, areas, pricing)
  - Amenities (by category)
  - Location (map, connectivity list, commute calculator)
  - Calculator (EMI, stamp duty, GST)
- `BuilderReputationCard` — Trust score, years active, delivered projects
- `DocumentQA` — Ask questions about uploaded RERA/brochure

### Feature Components (from RealtyPalsxElite)

- `SectorHeatmap` — Price heatmap overlay on Noida sector map
- `OnboardingTour` — First-time user walkthrough (4 steps)
- `MemoryBadge` — Shows what AI knows: "I know: 3BHK · ₹2Cr · Sector 150" (trust-building transparency)

### Utility Components

- `CalculatorModal` — EMI / stamp duty / GST as standalone modal
- `SiteVisitScheduler` — Date + slot picker
- `AuthGateModal` — Triggered on save/callback/visit
- `LeadSuccessModal` — Confirmation after lead submit

---

## 6. Re-engagement & Session Flow

### Guest → Auth Migration

1. Anonymous user: UUID `guestToken` generated and stored in `localStorage`
2. All ChatSessions, UserMemory tied to `guestToken`
3. On signup: `POST /api/sessions/migrate { guestToken }` → links everything to `userId`
4. Zero data loss on auth

### Re-engagement Logic

On `/chat` page load:
1. Fetch sessions with `phase >= GATHERING` and `updatedAt > 7 days ago`
2. If found: show `ReEngagementBanner` with last intent context
3. User clicks "Continue" → navigate to `/chat/[id]`
4. User dismisses → start fresh session

### Conversation Compression

Trigger: `ChatMessage` count in session > 12

1. Take messages 1 through N-8
2. Call LLM: "Summarize this conversation in 3-4 sentences focusing on: what the user is looking for, any properties they reacted to, any decisions made"
3. Store result in `ChatSession.summary`
4. Future context builds: summary + messages N-7 through N

---

## 7. What Is Explicitly NOT In This Rebuild

Per PRD V0.3 — out of V1 scope:

- Rentals, resale, commercial properties
- Native mobile apps
- Property valuation / investment analysis
- Voice search (future roadmap)
- VR/AR tours
- Multi-city rollout (Gurgaon, Bangalore — future)
- Loan approval workflow
- Tenant/landlord tools
- PriceAlert notifications (schema deferred)
- Kafka/event streaming
- Elasticsearch (Prisma full-text is sufficient at V1 scale)

---

## 8. Build Phases

| Phase | Scope | Deliverable |
|-------|-------|-------------|
| **1. Foundation** | Monorepo scaffold, Prisma schema, Express server boilerplate, Next.js app wired to backend, Supabase auth | Working shell — auth, DB, API health check |
| **2. AI Engine** | Intent extractor (Zod), context builder, user memory CRUD, conversation compression, Groq streaming, Claude fallback, Hindi/Hinglish prompts, SSE events | Chat that remembers users and understands Hinglish |
| **3. Core UI** | ChatShell, StatusSteps, MessageStream, PropertyCards, PropertySlideOver with tabs, ConversationSidebar, ReEngagementBanner, BuyerCriteriaHeader | Full conversational property discovery |
| **4. Features** | Admin panel (CRUD + image upload), calculators, builder reputation, document Q&A, commute, comparison page, lead forms | Complete V1 feature set |
| **5. Polish** | OnboardingTour, SectorHeatmap, MemoryBadge, WhatsApp handoff, PostHog analytics, error boundaries, performance | Launch-ready |

---

## 9. Success Criteria

- AI correctly extracts intent from Hinglish in ≥90% of test cases
- User memory persists across logout/login
- Re-engagement surfaces correct last search context
- Chat response (first token) < 1 second
- Property search query < 500ms
- Guest → user migration preserves all session history
- Admin can create/edit builders and projects without code changes

---

## 10. References

- `C:\Users\Furqan\Desktop\RealtyPals` — Clean Express + Next.js pattern, SSE architecture, session migration
- `C:\Users\Furqan\Desktop\RealtyPalsxElite` — Rich feature set, admin panel, property components
- `chatBotsAudit.md` — Memory system architecture (user profile layer, RAG, conversation compression)
- `listingAudit.md` — Lead DB as core value asset, chat intent → lead scoring
- `RealtyPals-PRD.md` — V1 scope locks, out-of-scope list, success metrics
