# Feature Plan: Analytics Suite + Promotions + Builder Tools

**Scope**: Analytics tracking, promotional management, builder news, self-service form, builder dashboard  
**Estimated**: 6-8 weeks (phased)  
**Status**: Planning

---

## Part 1: Analytics Suite (Full Tracking)

### 1.1 Drop-Off Point Definition (Research-Based)

**Optimal conversion funnel for RealtyPals:**
```
Chat Started
    ↓
Intent Identified (user specifies sector/BHK/budget)
    ↓
Results Shown (projects match criteria)
    ↓
User Engages (clicks property detail, expands amenities, etc.) — 30-60s timeout
    ↓
Action Taken (saves project, requests callback, site visit) ← CONVERSION
```

**Drop-off definition:**
- After results shown, user idle > 45 seconds without interaction → counted as drop-off
- Tracks at each stage: intent → results → engagement → conversion

### 1.2 Database Schema Additions

```typescript
// New tables for analytics

model ChatAnalytics {
  id              String    @id @default(uuid())
  session_id      String
  user_id         String?
  guest_token     String?
  
  // Funnel stages
  chat_started_at      DateTime
  intent_identified_at DateTime?
  results_shown_at     DateTime?
  first_engagement_at  DateTime?
  conversion_at        DateTime?  // callback/save/visit requested
  
  // Intent extracted
  intent_type          String?     // "budget_search", "location_search", etc.
  extracted_sector     String?
  extracted_bhk        Int?
  extracted_budget_min Float?
  extracted_budget_max Float?
  
  // Engagement
  projects_viewed      Int @default(0)
  projects_saved       Int @default(0)
  properties_clicked   Int @default(0)
  time_spent_seconds   Int @default(0)
  
  // Conversion
  conversion_type      String?     // "callback", "site_visit", "saved_property"
  converted_project_id String?
  
  // Drop-off
  drop_off_stage       String?     // "no_intent", "no_results", "no_engagement", null if converted
  drop_off_at          DateTime?
  
  created_at           DateTime @default(now())
  session              ChatSession @relation(fields: [session_id], references: [id], onDelete: Cascade)
  
  @@index([session_id])
  @@index([user_id])
  @@index([created_at])
  @@index([conversion_type])
}

model QueryMetrics {
  id                String   @id @default(uuid())
  query_text        String   // Raw user query
  intent_type       String?  // Extracted: "budget", "location", "property_type", etc.
  sector            String?
  bhk               Int?
  budget_min_cr     Float?
  budget_max_cr     Float?
  session_id        String
  user_id           String?
  
  // Aggregation (weekly bucket)
  week_start        DateTime // ISO week start (Monday)
  
  clicked           Boolean @default(false)  // User clicked a result
  converted         Boolean @default(false)  // User took action (callback/save/visit)
  
  created_at        DateTime @default(now())
  session           ChatSession @relation(fields: [session_id], references: [id], onDelete: Cascade)
  
  @@index([created_at])
  @@index([sector])
  @@index([intent_type])
  @@index([week_start])
}

model WeeklyMetricsSummary {
  id                String   @id @default(uuid())
  week_start        DateTime // Monday of week
  week_end          DateTime // Sunday of week
  
  // Aggregates
  total_queries     Int
  unique_sessions   Int
  conversion_rate   Float    // % that converted
  drop_off_rate     Float
  avg_time_spent_s  Int
  
  // By sector
  top_sectors       Json     // [{sector, count, conversions}]
  
  // By intent
  intent_breakdown  Json     // [{intent_type, count}]
  
  // By budget
  budget_distribution Json   // [{range, count}]
  
  // By BHK
  bhk_preferences   Json     // [{bhk, count}]
  
  created_at        DateTime @default(now())
  
  @@unique([week_start])
  @@index([week_start])
}
```

### 1.3 Implementation Approach

**Phase 1A: Core Tracking**
- Add `ChatAnalytics` listener on each chat stage transition
- Capture intent snapshot on intent identification
- Track `first_engagement_at` on any project click/save
- Track conversion on callback request

**Phase 1B: Weekly Aggregation**
- Cron job (Sunday 2 AM): aggregate ChatAnalytics → WeeklyMetricsSummary
- Extract sector/BHK/budget from intent_snapshot JSON
- Calculate drop-off rates per stage
- Store JSON summaries for trends

**Phase 1C: Admin Dashboard Pages**
- `/admin/analytics/overview` — weekly trends (charts)
- `/admin/analytics/funnel` — conversion funnel by stage
- `/admin/analytics/sectors` — top sectors searched
- `/admin/analytics/queries` — heatmap of top 50 queries
- `/admin/analytics/exports` — CSV download

---

## Part 2: Promotional System

### 2.1 Database Schema

```typescript
model Promotional {
  id                String   @id @default(uuid())
  
  // Identity
  title             String
  description       String?
  
  // Content type
  type              PromotionalType   // "button", "toast_text", "news_feature"
  content           String   // Button text, toast message, etc.
  
  // Link destination
  link_type         String?  // "project", "builder", "external_url"
  link_target       String?  // project_id, builder_id, or URL
  
  // Media
  image_url         String?
  icon_url          String?
  builder_id        String?  // If builder-specific branding
  brand_theme       Json?    // {primaryColor, secondaryColor, logo_url}
  
  // Scheduling
  starts_at         DateTime
  ends_at           DateTime
  is_active         Boolean @default(true)
  
  // Targeting (optional)
  target_sectors    String[] @default([])  // Empty = show to all
  target_bhk        Int[]    @default([])
  
  // Tracking
  impressions       Int @default(0)
  clicks            Int @default(0)
  conversions       Int @default(0)  // callback/save/visit from this promo
  
  // Metadata
  created_by        String?
  created_at        DateTime @default(now())
  updated_at        DateTime @updatedAt
  
  @@index([is_active])
  @@index([starts_at, ends_at])
  @@index([builder_id])
}

model PromotionalInteraction {
  id                String   @id @default(uuid())
  promotional_id    String
  session_id        String?
  user_id           String?
  guest_token       String?
  
  interaction_type  String   // "impression", "click", "conversion"
  converted_project_id String?
  
  created_at        DateTime @default(now())
  promotional       Promotional @relation(fields: [promotional_id], references: [id], onDelete: Cascade)
  
  @@index([promotional_id, created_at])
  @@index([interaction_type])
}

enum PromotionalType {
  button
  toast_text
  news_feature
}
```

### 2.2 Homepage Redesign

**Current state:** 4 hardcoded buttons (Best 3BHK, Luxury on Expressway, Top Investment, Ready to Move)

**New state:**
```
┌─────────────────────────────────────────┐
│                                         │
│  Chat Interface (Main content area)     │
│                                         │
│  [User types query / AI responds]       │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ Promotional Button 1              │ │ ← Rotates based on schedule
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ Toast scrolling text area...      │ │
│  │ fading in/out continuously        │ │
│  └───────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘

Empty Discovery State (Before chat):
┌─────────────────────────────────────────┐
│                                         │
│  RealtyPals Logo / Tagline              │
│                                         │
│  [Search/Chat input box]                │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ Promotional Button 1              │ │
│  │ Promotional Button 2              │ │
│  │ Promotional Button 3              │ │
│  │ Promotional Button 4              │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ Toast scrolling text area...      │ │
│  │ fading in/out continuously        │ │
│  └───────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

### 2.3 Smart Scheduling

**Approach:**
```typescript
// At chat load, fetch active promotions
const getActivePromotionals = async (intent?: {sector?, bhk?, budget?}) => {
  const now = new Date()
  const promotions = await prisma.promotional.findMany({
    where: {
      is_active: true,
      starts_at: { lte: now },
      ends_at: { gte: now },
      // Filter by targeting if intent available
      OR: [
        { target_sectors: { isEmpty: true } },  // Show to all
        { target_sectors: { has: intent?.sector } },
      ]
    },
    orderBy: { created_at: 'desc' },  // Most recent first
    take: 4,  // For 4 button slots
  })
  return promotions
}

// Toast scrolling: Rotate through all active promos with 5s delay
```

### 2.4 Admin Panel Pages

- `/admin/promotions` — list all promotions with performance metrics
- `/admin/promotions/new` — create new promo (date picker, link selector, media upload)
- `/admin/promotions/[id]` — edit, view performance, pause/resume

---

## Part 3: Builder News + Self-Service Form

### 3.1 Database Schema

```typescript
model BuilderNews {
  id              String   @id @default(uuid())
  builder_id      String
  
  // Content
  title           String
  description     String
  image_url       String?
  
  // Link (optional)
  link_type       String?  // "project", "external_url"
  link_target     String?
  
  // Publishing
  status          NewsStatus  // "draft", "pending_approval", "published", "rejected"
  submitted_by    String?     // builder_id who submitted
  approved_by     String?     // admin_id who approved
  
  // Promotional
  run_as_promo    Boolean @default(false)
  promo_id        String?     // Links to Promotional record if running as promo
  
  created_at      DateTime @default(now())
  published_at    DateTime?
  expires_at      DateTime?
  
  builder         Builder @relation(fields: [builder_id], references: [id], onDelete: Cascade)
  
  @@index([builder_id])
  @@index([status])
  @@index([published_at])
}

enum NewsStatus {
  draft
  pending_approval
  published
  rejected
}

// In Builder model, add:
// news BuilderNews[]
```

### 3.2 Builder Self-Service Form

**Public endpoint:** `/forms/builder-registration`
- No auth required
- Rate-limited (1 form per IP per 24h)
- Collects:
  - Builder name, CIN, email, phone
  - Website, headquarters
  - Logo upload
  - Description
  - Legal entities (array form)
  - Directors (array form)
  - Current projects (text list)
  - Delivery track record
  
- Stores in new table:
```typescript
model BuilderApplicationForm {
  id              String   @id @default(uuid())
  
  // Builder info (form input)
  name            String
  cin             String
  email           String
  phone           String
  website         String?
  headquarters    String?
  logo_url        String?
  description     String?
  
  // Structured data
  legal_entities  Json?    // [{name, cin, role}]
  executives      Json?    // [{name, designation}]
  projects        String[]
  delivery_track  String?
  
  // Metadata
  ip_address      String
  user_agent      String
  submitted_at    DateTime @default(now())
  
  // Admin workflow
  status          FormStatus  // "new", "reviewing", "approved", "rejected"
  reviewed_by     String?
  review_notes    String?
  linked_builder  String?     // builder_id if approved → created
  created_at      DateTime @default(now())
}

enum FormStatus {
  new
  reviewing
  approved
  rejected
}
```

### 3.3 Workflows

**News approval workflow:**
1. Builder uploads news via dashboard
2. Stored as `status: "pending_approval"`
3. Admin sees in `/admin/news-approvals`
4. Admin reviews: approve → `status: "published"` + `published_at: now()`
5. News appears in builder detail page + can mark "run as promotional"

**Form approval workflow:**
1. Builder fills public form → `BuilderApplicationForm` created with `status: "new"`
2. Admin sees in `/admin/builder-applications`
3. Admin reviews form, can request clarification or approve
4. On approval: auto-create `Builder` record, link `linked_builder: builder_id`
5. Email sent to builder with dashboard access

---

## Part 4: Builder Dashboard (Lean Version)

### 4.1 Structure

**URL:** `/builder/[builder_id]/dashboard`
- Auth: builders log in with email sent after form approval
- Super lean: 3 pages

**Pages:**
1. `/builder/dashboard` — overview
   - Promotional performance (clicks, conversions)
   - News status (published, pending, draft)
   - Latest metrics

2. `/builder/news` — manage news
   - List published + pending news
   - Upload new news
   - View approval status

3. `/builder/promotions` — manage promotions
   - Active promotions for their properties
   - Performance metrics
   - Request new promotional

### 4.2 Database Addition

```typescript
model BuilderDashboardAccess {
  id            String   @id @default(uuid())
  builder_id    String   @unique
  email         String
  password_hash String  // OAuth or password-based
  
  last_login    DateTime?
  created_at    DateTime @default(now())
  
  builder       Builder @relation(fields: [builder_id], references: [id], onDelete: Cascade)
}
```

### 4.3 Brand Theme System

**For Elite Group example:**
```typescript
// In Promotional model:
brand_theme: {
  primaryColor: "#2D5016",      // Elite Group green
  secondaryColor: "#F4E4C1",    // Gold accent
  logoUrl: "https://...",
  fontFamily: "Poppins"
}

// Apply to:
// - Promotional buttons (themed background/text)
// - Builder news cards (branded header)
// - All builder properties in search (subtle brand indicator)
```

---

## Implementation Phases

### Phase 1: Analytics Core (2 weeks)
- Add ChatAnalytics tracking
- Implement weekly aggregation cron
- Basic admin dashboard

### Phase 2: Promotional System (2 weeks)
- Database schema
- Admin CRUD
- Homepage integration
- Performance tracking

### Phase 3: Builder News (1 week)
- News submission form
- Approval workflow
- Display on builder detail pages

### Phase 4: Builder Self-Service Form (1 week)
- Public form page
- Admin review panel
- Auto-builder-creation on approval

### Phase 5: Builder Dashboard (1 week)
- Lean builder interface
- News management
- View promotions + performance

### Phase 6: Polish + Integration (1 week)
- Brand theme application
- Advanced targeting (by sector/BHK)
- Export reports

---

## Technical Approach

### Analytics Tracking

Instrument at:
1. **Chat start** → `ChatAnalytics.chat_started_at`
2. **Intent identified** → extract from intent_snapshot, set `intent_identified_at`
3. **Results shown** → set `results_shown_at`, fetch 4 active promotions
4. **First click** → set `first_engagement_at`, start idle timer
5. **Callback/save** → set `conversion_at`, log conversion_type
6. **45s idle** → set `drop_off_stage: "no_engagement"`

### Promotional Rotation

```javascript
// Client-side
const promotions = await fetch('/api/promotions/active?sector=sector-10&bhk=3')
// Shows 4 buttons matching intent

// Toast rotates every 5s:
setInterval(() => {
  currentPromo = (currentPromo + 1) % activePromos.length
  animateToast(activePromos[currentPromo].content)
}, 5000)
```

### Weekly Cron

```typescript
// Runs Sunday 2 AM
const aggregateWeek = async () => {
  const weekStart = startOfWeek(new Date())
  const weekEnd = endOfWeek(weekStart)
  
  const data = await prisma.chatAnalytics.groupBy({
    by: ['sector', 'intent_type'],
    where: {
      created_at: { gte: weekStart, lte: weekEnd }
    },
    _count: true,
    _avg: { time_spent_seconds: true }
  })
  
  // Create WeeklyMetricsSummary
}
```

---

## Questions for Refinement

1. **Analytics goal:** Is this purely for product insights (what people want) or for personalization (recommend based on trends)?

2. **Promotional branding:** Should builder branding appear on:
   - Just promo buttons?
   - Also in search results?
   - Also in project detail pages (full brand takeover)?

3. **News expiry:** Should builder news automatically unpublish after X days? Or stay until manually archived?

4. **Builder form validation:** How strict? CIN verification? Or just email confirmation?

5. **Builder dashboard features:** Any other must-haves beyond news + promotions + metrics?

6. **Mobile:** All of this mobile-responsive? Or desktop admin only?

---

## Next Steps

1. Review this plan
2. Clarify questions above
3. Get approval on database schema
4. Refine brand theme system
5. Start Phase 1

Ready to proceed or refinements needed?
