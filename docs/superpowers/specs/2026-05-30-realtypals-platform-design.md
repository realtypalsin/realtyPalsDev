# RealtyPals Platform — Design Spec

**Date:** 2026-05-30  
**Status:** Approved  
**Version:** 1.0

---

## 1. Product Summary

RealtyPals is an AI-powered real estate advisor for home buyers in India, starting with Noida (Sector 150). Users describe needs in natural language and receive honest property recommendations with trade-offs, calculators, comparison tools, and cross-session memory.

Not a listings portal. Not a broker marketplace. An advisor.

---

## 2. Locked Decisions

| Area | Decision |
|------|----------|
| Brand | RealtyPals |
| City V1 | Noida — Sector 150 |
| Property type | New construction only |
| Auth | Supabase Auth (Google OAuth + OTP) |
| Auth gate | 5 anonymous messages → prompt on 6th |
| AI — intent | Groq (llama-3.3-70b-versatile) |
| AI — synthesis | Cohere (command-r-plus) |
| AI — upgrade path | Claude Sonnet 4.6 for synthesis (future) |
| DB | Supabase PostgreSQL via Prisma |
| Storage | Supabase Storage (images, floor plans) |
| Frontend | Next.js App Router + TypeScript + Tailwind + shadcn/ui |
| Deployment | Vercel |
| Data source | Brochure-extracted .md files (primary) + Google Places (enrichment fallback) |
| Pricing | Estimated ranges per BHK, labeled "(est.)", user-entered from market knowledge |
| Paywall | None for V1 — everything open |
| Lead capture | Out of V1 scope (Phase 2) |
| Style base | Reuse existing RealtyPals frontend (glassmorphism, Outfit font, dark mode) |

---

## 3. Architecture

```
Browser
  ↓
Next.js App (Vercel)
  ├── /                        → Landing + Chat
  ├── /projects                → Browse all projects
  ├── /projects/[slug]         → Property detail page
  ├── /compare                 → AI-narrated comparison tool
  ├── /calculators             → EMI / Stamp Duty / GST / Total Cost
  └── /chat/[id]               → Saved conversation (auth required)

API Routes (Next.js)
  ├── POST /api/chat            → Main chat handler
  ├── GET  /api/projects        → Project listing with filters
  ├── GET  /api/projects/[slug] → Single project
  ├── POST /api/saved           → Save/unsave property
  ├── GET  /api/saved           → User's saved properties
  ├── POST /api/memory/update   → Update UserMemory after session
  └── GET  /api/enrichment/[slug] → Google Places fallback data

Server Layer (lib/)
  ├── ai/intentManager.ts      → extracts BHK, budget, sector, purpose, city
  ├── ai/projectMatcher.ts     → scores DB projects against intent
  ├── ai/aiService.ts          → Groq intent + Cohere synthesis
  ├── ai/compareEngine.ts      → multi-property comparison logic
  ├── ai/valueEstimator.ts     → EMI, stamp duty, GST, total cost
  ├── ai/memoryService.ts      → load/save/summarize UserMemory
  ├── ai/prompts.ts            → all prompts as named constants
  ├── db/prisma.ts             → Prisma client
  ├── enrichment/places.ts     → Google Places gap-fill pipeline
  └── utils/formatters.ts      → Indian price formatting, dates

Data
  ├── Supabase PostgreSQL       → all structured data via Prisma
  └── Supabase Storage          → /projects/{slug}/{type}/{filename}
```

---

## 4. Data Model (Prisma Schema)

```prisma
model Builder {
  id                  String    @id @default(uuid())
  name                String    @unique
  slug                String    @unique
  tagline             String?
  parent_group        String?
  founded_year        Int?
  headquarters        String?
  website             String?
  email               String?
  phone               String?
  credai_member       Boolean   @default(false)
  delivered_units     Int?
  delivered_projects  String[]
  ongoing_projects    String[]
  awards              String[]
  awards_count        Int?
  description         String?
  created_at          DateTime  @default(now())

  projects  Project[]

  @@map("builders")
}

model Project {
  id                  String          @id @default(uuid())
  slug                String          @unique
  name                String
  tagline             String?
  builder_id          String
  rera_number         String?
  rera_url            String?
  city                String          @default("Noida")
  sector              String
  address             String?
  lat                 Float?
  lng                 Float?
  land_area_acres     Float?
  total_units         Int?
  total_towers        Int?
  status              ProjectStatus
  possession_date     DateTime?
  possession_label    String?         // "Q4 2027", "Ready to Move", etc.
  description         String?
  long_description    String?
  design_theme        String?
  architect           String?
  interior_designer   String?
  marketing_claims    String[]
  ai_search_keywords  String[]
  hero_image_url      String?
  created_at          DateTime        @default(now())
  updated_at          DateTime        @updatedAt

  builder         Builder           @relation(fields: [builder_id], references: [id])
  unit_types      UnitType[]
  images          ProjectImage[]
  amenities       Amenity[]
  connectivity    Connectivity[]
  saved_by        SavedProperty[]

  @@index([city, sector])
  @@index([status])
  @@map("projects")
}

enum ProjectStatus {
  under_construction
  ready_to_move
  new_launch
}

model UnitType {
  id                  String    @id @default(uuid())
  project_id          String
  name                String    // "Type A1", "Type B", "3BHK"
  bhk                 Int
  super_area_sqft     Int?
  carpet_area_sqft    Int?
  balcony_area_sqft   Int?
  bathrooms           Int?
  utility_room        Boolean   @default(false)
  dress_area          Boolean   @default(false)
  towers              String[]
  price_min_cr        Float?
  price_max_cr        Float?
  price_label         String?   // "₹2.89–5.62 Cr (est.)"
  price_is_estimated  Boolean   @default(true)

  project  Project @relation(fields: [project_id], references: [id], onDelete: Cascade)

  @@index([project_id, bhk])
  @@map("unit_types")
}

model ProjectImage {
  id          String      @id @default(uuid())
  project_id  String
  url         String
  type        ImageType
  caption     String?
  sort_order  Int         @default(0)

  project  Project @relation(fields: [project_id], references: [id], onDelete: Cascade)

  @@index([project_id, type])
  @@map("project_images")
}

enum ImageType {
  hero
  exterior
  interior
  floor_plan
  amenity
  master_plan
  clubhouse
  pool
  location_map
}

model Amenity {
  id          String          @id @default(uuid())
  project_id  String
  name        String
  category    AmenityCategory

  project  Project @relation(fields: [project_id], references: [id], onDelete: Cascade)

  @@map("amenities")
}

enum AmenityCategory {
  sports
  lifestyle
  wellness
  kids
  security
  parking
}

model Connectivity {
  id           String              @id @default(uuid())
  project_id   String
  type         ConnectivityType
  name         String
  distance_km  Float?
  data_source  DataSource          @default(brochure)
  notes        String?

  project  Project @relation(fields: [project_id], references: [id], onDelete: Cascade)

  @@map("connectivity")
}

enum ConnectivityType {
  metro
  road
  school
  hospital
  mall
  landmark
  airport
  university
}

enum DataSource {
  brochure
  google
  estimated
  manual
}

model ChatSession {
  id            String    @id @default(uuid())
  user_id       String?   // null for anonymous
  guest_token   String?   // localStorage UUID for anonymous
  title         String?   // auto-generated from first message
  message_count Int       @default(0)
  created_at    DateTime  @default(now())
  last_active   DateTime  @updatedAt

  messages  ChatMessage[]

  @@index([user_id])
  @@index([guest_token])
  @@map("chat_sessions")
}

model ChatMessage {
  id               String      @id @default(uuid())
  session_id       String
  role             MessageRole
  content          String
  intent_snapshot  Json?       // intentManager state at this point
  created_at       DateTime    @default(now())

  session  ChatSession @relation(fields: [session_id], references: [id], onDelete: Cascade)

  @@index([session_id, created_at])
  @@map("chat_messages")
}

enum MessageRole {
  user
  assistant
}

model UserMemory {
  id                  String    @id @default(uuid())
  user_id             String    @unique
  bhk_preference      Int?
  budget_min_cr       Float?
  budget_max_cr       Float?
  sector_preference   String?
  purpose             String?   // 'end_use' | 'investment'
  possession_pref     String?   // 'ready_to_move' | 'under_construction' | 'any'
  viewed_slugs        String[]
  rejected_slugs      String[]
  saved_slugs         String[]
  summary_text        String?   // Groq-generated natural language summary
  updated_at          DateTime  @updatedAt

  @@map("user_memory")
}

model SavedProperty {
  id          String    @id @default(uuid())
  user_id     String
  project_id  String
  saved_at    DateTime  @default(now())

  project  Project @relation(fields: [project_id], references: [id], onDelete: Cascade)

  @@unique([user_id, project_id])
  @@index([user_id])
  @@map("saved_properties")
}
```

---

## 5. AI Chat System

### Flow

```
User message
  ↓
[If logged in] Load UserMemory → inject summary into system prompt
  ↓
Groq: intent extraction
  → BHK, budget_min, budget_max, sector, city, purpose,
     possession_status, project_name, conversational_reply,
     is_general_query
  ↓
Completeness check (intentManager)
  → < 60%: return clarifying question
  → ≥ 60%: proceed to discovery
  ↓
Prisma: query Projects + UnitTypes
  → filter: city, sector, bhk, price range, status
  → rank: budget fit, builder trust, possession fit, amenity match
  → return top 3–5
  ↓
Context assembly
  → project data block (source: "verified DB")
  → connectivity data (brochure or Google-enriched)
  → [optional] Serper for current price trends
  ↓
Cohere synthesis
  → honest recommendations with trade-offs
  → structured: name + reason + trade-off + RERA
  ↓
Save ChatMessage to DB
Update UserMemory (every 5 messages via Groq summary)
  ↓
Return response + project slugs for card rendering
```

### Chat Phases

**DISCOVERY** (completeness < 60%)
Bot asks max 3–5 natural clarifying questions. One per turn.
Never asks all at once.

**RECOMMENDATIONS** (completeness ≥ 60%)
Returns 3–5 projects. Format:
```
PROJECT NAME — Sector/Config
Why: [specific match reason]
Trade-off: [honest limitation]
RERA: [number or "Not listed"]
[View Details] [Save]
```

**ADVISOR** (after recommendations shown)
User refines: "show only ready-to-move", "what about Godrej?"
AI re-ranks or answers specific questions from DB + memory.

### Cross-Session Memory

On every login, homepage checks `UserMemory`:
- If exists → show Welcome Back popup (bottom-right slide-in, 8s auto-hide)
- Popup: last project viewed + budget context + saved count
- Memory summary injected into every new session's system prompt

Memory updated by Groq every 5 messages:
```
"Summarize this user's real estate search preferences based on conversation history. 
Output: budget range, BHK preference, sector, purpose, viewed projects, rejected projects. 
Be specific. Max 3 sentences."
```

### Anonymous Users

- Sessions stored with `guest_token` (localStorage UUID)
- 5 messages free
- Message 6: modal "Save your search and continue" → auth
- After auth: guest session migrated to user account

### Anti-Hallucination Rules

1. No city assumed — ask if not stated
2. No invented project names, prices, dates, contacts
3. Source-tagged context: `[DB — verified]`, `[Google Places]`, `[estimated]`
4. Empty states explicit: "I don't have data on this yet"
5. Prices always labeled "(est.)" when `price_is_estimated = true`

---

## 6. Frontend Pages

### `/` — Landing

- Hero: chat input, prominent, centered
- Subtext: "Describe what you're looking for" + example prompts
- Below fold: 3 featured project cards
- Logged-in: Welcome Back popup (bottom-right)
- Anonymous: "No account needed to start"

### `/projects` — Browse

- Grid of project cards (3 cols desktop, 2 tablet, 1 mobile)
- Minimal filters: BHK, Budget range, Status (UC/RTM)
- No filter wall — conversation is primary
- Stagger card entrance animation (reuse from existing)

### `/projects/[slug]` — Property Detail

Sections in order:
1. Hero image carousel (project images from Supabase Storage)
2. Project headline: name, builder, sector, status, RERA badge
3. Price range per BHK (labeled "(est.)")
4. "What will it actually cost?" → expands to Total Cost Calculator
5. Unit configurations table: BHK, carpet area, super area, price
6. Amenities: grouped by category (sports, lifestyle, wellness, kids)
7. Neighborhood Score Card: metro, schools, hospitals, connectivity, green cover
8. Builder credibility section: delivered projects, awards, founded year
9. Possession risk indicator: timeline + builder track record
10. Floor plans (if available)
11. Sticky bottom bar: [Save ♡] [Compare] [Share]

### `/compare` — AI-Narrated Comparison

- Entry: requires 2+ saved properties
- AI narrative at top (Cohere-generated): honest comparison based on user's stated criteria
- Structured table below: price, carpet area, BHK, amenities count, possession, RERA, builder age, metro distance
- "Ask AI about this comparison" input — inline question answering
- Max 4 properties side-by-side

### `/calculators` — Smart Budget Planner

**Total Cost Breakdown** (CarDekho-style, primary feature):
```
Select property (from saved or enter price manually)
  ↓
Base Price:              ₹X
Stamp Duty (7% UP):      ₹Y
Registration (1%):       ₹Z
GST (5% UC / 0% RTM):   ₹W
─────────────────────────
Total Outlay:            ₹Total

Minimum Down Payment (20%): ₹X
Loan Amount Needed:         ₹Y
EMI @ 8.5% / 20yr:         ₹Z/month
```

- Property selection pre-fills price
- GST auto-set from project status (5% UC, 0% RTM)
- UP stamp duty hardcoded (7% above 1Cr)
- Tenure and loan rate are adjustable sliders
- Side-by-side EMI for two properties
- "Share this breakdown" button

### `/chat/[id]` — Saved Conversation (Auth)

- Full chat history
- Resume conversation button
- Intent summary sidebar (what the AI understood)

---

## 7. Property Card Design

Every card shows:
- Hero image
- Project name (bold)
- Sector + status tag (color-coded: green=RTM, amber=UC)
- BHK options available
- Price range "(est.)"
- RERA badge (green tick if verified, red X if missing)
- Builder name (linked to builder page)
- Metro distance (from Connectivity or Google fallback)
- One school name (nearest, from Connectivity)
- [View Details] [♡ Save] buttons

---

## 8. Saved Properties + Compare Flow

```
Browse / Chat → [♡ Save] on any card
  ↓
Saved Drawer (accessible from nav, floating badge count)
  ↓
Select 2–4 saved properties → [Compare]
  ↓
/compare page: AI narrative + structured table
```

- Guest: save up to 3 in localStorage, login to keep permanently
- Logged-in: unlimited saves, synced to DB
- Saved properties persist across devices (DB-backed)

---

## 9. Data Enrichment Pipeline

Runs once post-seed, re-runs when new projects added:

```
Step 1: Seed from .md files → Projects, Builders, UnitTypes, Amenities, Connectivity
Step 2: For each project with lat=null → Google Geocoding API (address → coordinates)
Step 3: For each project with coordinates → Google Distance Matrix (metro stations list)
Step 4: For each project → Google Places Nearby (schools 5km, hospitals 10km)
Step 5: Store all in Connectivity with data_source = 'google'
Step 6: Log unfilled gaps → monitor for manual resolution
```

Data source tags used throughout:
- `brochure` — from extracted .md files, highest trust
- `google` — from Google Places/Maps APIs
- `estimated` — user-entered market estimates
- `manual` — verified manually (RERA portal)

---

## 10. Files to Reuse from Old RealtyPals

### Copy entire `frontend/` folder
Base for the new Next.js app. Contains:
- All pages (discover, compare, saved, value-estimator, property/[id])
- All components (PropertyCard, Sidebar, Header, PropertyDetailView, etc.)
- Glassmorphism design system (globals.css, tailwind.config.ts)
- Outfit font setup, dark mode, all animations
- All SVG icons
- All existing property images (godrej, ats, prateek, ace, eldeco variants)

### Copy from `src/` (backend logic) → `lib/ai/`
| Source | Destination |
|--------|------------|
| `src/services/intentManager.ts` | `lib/ai/intentManager.ts` |
| `src/logic/compareEngine.ts` | `lib/ai/compareEngine.ts` |
| `src/logic/propertyMatcher.ts` | `lib/ai/propertyMatcher.ts` |
| `src/logic/valueEstimator.ts` | `lib/ai/valueEstimator.ts` |
| `src/utils/formatters.ts` | `lib/utils/formatters.ts` |
| `src/utils/constants.ts` | `lib/utils/constants.ts` |
| `src/services/prompts.ts` | `lib/ai/prompts.ts` |

### Do NOT copy
- `aiService.ts` — too tightly coupled to Google Places, rewrite
- `chatController.ts` / `server.ts` — Express, not needed
- `googleIntelligence.ts` / `googlePlacesService.ts` — replacing with enrichment pipeline
- `chatHistoryService.ts` — rewrite for Supabase

---

## 11. Design System (Slop-Reduction Rules)

Per `slop-reduct.md` — the UI must feel inevitable, not generated.

- No decorative gradients
- No cards inside cards
- Typography: Outfit (display) + system mono for numbers/prices
- One accent color: blue (#2563eb) — used for actions only, not decoration
- Glassmorphism surfaces only where they add depth semantics
- Every component has: idle, hover, active, disabled, loading, error states
- No "seamless", "robust", "cutting-edge" copy anywhere
- Real data density — no fake metrics, no placeholder testimonials
- Possession risk shown explicitly, never buried
- Price disclaimer on every card that shows estimated pricing

---

## 12. Neighborhood Score Card

Visual score bars, not numbers. Data from brochure Connectivity + Google enrichment.

```
SECTOR 150 — NOIDA (Sports City / Noida Expressway)

Metro Access      ████████░░  Good     (Sector 148, 2.1km)
Schools           █████████░  Excellent (DPS, Lotus Valley, Genesis Global)
Hospitals         ███████░░░  Good     (Fortis, Apollo, Felix)
Connectivity      █████████░  Excellent (Yamuna Exp, DND, FNG)
Green Cover       ██████████  Outstanding (42 acre green belt)
Air Quality       ██████░░░░  Moderate  (check seasonally)
```

Bar fill = percentage score. Labels: Outstanding / Excellent / Good / Moderate / Poor.
Air quality uses Serper search fallback.

---

## 13. Builder Page

Linked from every project card. One page per builder.

Sections:
- Builder name, parent group, founded year
- Awards count + key awards
- Delivered projects list (from DB)
- Ongoing projects (linked to project pages)
- RERA member status
- No fake scores, no made-up ratings

---

## 14. Possession Risk Indicator

On every property detail page for under-construction projects:

```
⚠ Under Construction
Estimated possession: [label from DB]

Builder delivery track record:
[Builder] delivered [N] units across [X] projects.
[On-schedule / one delay recorded / data unavailable]
```

If possession_date is null → "Verify possession timeline with builder before booking."

---

## 15. Development Phases

| Phase | Scope | Estimated effort |
|-------|-------|-----------------|
| 1 — Data Layer | Prisma schema, seed script, enrichment pipeline | 1 week |
| 2 — AI Chat Engine | Intent extraction, DB matching, Cohere synthesis, memory | 1.5 weeks |
| 3 — Frontend | Chat UI, project cards, detail pages, compare, calculators | 2 weeks |
| 4 — Auth + Memory | Supabase Auth, session migration, UserMemory, Welcome Back popup | 0.5 week |
| 5 — Polish | Slop reduction audit, performance, SEO, mobile | 1 week |

Total: ~6 weeks to production-ready showcase.

---

## 16. Success Criteria (V1 Showcase)

- User can chat, get DB-matched recommendations, view detail pages
- Comparison tool shows AI narrative between 2+ projects
- Total Cost Calculator works from property card
- Cross-session memory works — returning user sees last project + context
- All 7 projects seeded with complete data, images, and estimated pricing
- RERA badge on all projects that have it
- Mobile-responsive, dark mode working
- No fake data, no invented specifics
- Slop score < 40 on any page (per slop-reduct.md criteria)
