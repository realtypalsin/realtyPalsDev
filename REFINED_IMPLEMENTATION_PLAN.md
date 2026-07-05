# Refined Implementation Plan: Builder Command Center + Full Analytics

**Scope**: Complete builder management system + analytics tracking + promotional system  
**Estimated**: 10-12 weeks (6 phases)  
**Architecture**: Desktop-first, mobile-optimized

---

## Phase 1: Database Schema (Week 1)

### 1.1 Core Analytics Tables

```typescript
// Prisma schema additions

model ChatAnalytics {
  id                    String    @id @default(uuid())
  session_id            String
  user_id               String?
  guest_token           String?
  
  // Funnel stages
  chat_started_at       DateTime
  intent_identified_at  DateTime?
  results_shown_at      DateTime?
  first_engagement_at   DateTime?
  conversion_at         DateTime?
  
  // Extracted intent (from intent_snapshot)
  intent_type           String?   // "budget_search", "location_search", "property_type", etc.
  extracted_sector      String?
  extracted_bhk         Int?
  extracted_budget_min  Float?
  extracted_budget_max  Float?
  
  // Engagement metrics
  projects_viewed       Int @default(0)
  projects_clicked      Int @default(0)
  projects_saved        Int @default(0)
  time_spent_seconds    Int @default(0)
  
  // Conversion tracking
  conversion_type       String?   // "callback_requested", "site_visit_requested", "property_saved"
  converted_project_id  String?
  converted_builder_id  String?
  
  // Drop-off analysis
  drop_off_stage        String?   // "no_intent", "no_results", "no_engagement", "no_action"
  drop_off_at           DateTime?
  idle_seconds_before_drop_off Int? // How long user was idle
  
  // Promotional tracking
  promotional_id        String?   // If user was influenced by a promotional
  promo_clicked         Boolean @default(false)
  
  created_at            DateTime @default(now())
  session               ChatSession @relation(fields: [session_id], references: [id], onDelete: Cascade)
  
  @@index([session_id])
  @@index([user_id])
  @@index([created_at])
  @@index([converted_builder_id])
  @@index([conversion_type])
}

model QueryMetrics {
  id                String   @id @default(uuid())
  query_text        String   // Raw user query
  intent_type       String?
  sector            String?
  bhk               Int?
  budget_min_cr     Float?
  budget_max_cr     Float?
  session_id        String
  user_id           String?
  
  week_start        DateTime // ISO week start
  
  clicked           Boolean @default(false)
  converted         Boolean @default(false)
  
  created_at        DateTime @default(now())
  session           ChatSession @relation(fields: [session_id], references: [id], onDelete: Cascade)
  
  @@index([created_at])
  @@index([sector])
  @@index([week_start])
}

model WeeklyMetricsSummary {
  id                String   @id @default(uuid())
  week_start        DateTime
  week_end          DateTime
  
  total_queries     Int
  unique_sessions   Int
  conversion_rate   Float
  drop_off_rate     Float
  avg_time_spent_s  Int
  
  top_sectors       Json     // [{sector, count, conversions}]
  intent_breakdown  Json     // [{type, count}]
  budget_distribution Json   // [{range, count}]
  bhk_preferences   Json     // [{bhk, count}]
  
  created_at        DateTime @default(now())
  
  @@unique([week_start])
}

// Promotional System
model Promotional {
  id                String   @id @default(uuid())
  title             String
  description       String?
  
  type              PromotionalType // "button", "toast_text", "news_feature"
  content           String
  
  link_type         String?  // "project", "builder", "external_url"
  link_target       String?  // project_id, builder_id, URL
  
  image_url         String?
  icon_url          String?
  builder_id        String?
  
  starts_at         DateTime
  ends_at           DateTime
  is_active         Boolean @default(true)
  
  target_sectors    String[] @default([])  // Empty = all sectors
  target_bhk        Int[]    @default([])
  
  impressions       Int @default(0)
  clicks            Int @default(0)
  conversions       Int @default(0)
  
  created_by        String?
  created_at        DateTime @default(now())
  updated_at        DateTime @updatedAt
  
  @@index([is_active, starts_at, ends_at])
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
  
  @@index([promotional_id])
  @@index([interaction_type])
}

enum PromotionalType {
  button
  toast_text
  news_feature
}

// Builder News
model BuilderNews {
  id              String   @id @default(uuid())
  builder_id      String
  
  title           String
  description     String
  image_url       String?
  
  link_type       String?  // "project", "external_url"
  link_target     String?
  
  status          NewsStatus
  submitted_by    String?
  approved_by     String?
  approval_notes  String?
  
  run_as_promo    Boolean @default(false)
  promo_id        String?
  
  archived_at     DateTime?
  created_at      DateTime @default(now())
  published_at    DateTime?
  
  builder         Builder @relation(fields: [builder_id], references: [id], onDelete: Cascade)
  
  @@index([builder_id])
  @@index([status])
  @@index([published_at])
}

enum NewsStatus {
  draft
  pending_approval
  published
  archived
  rejected
}

// Self-Service Builder Form
model BuilderApplicationForm {
  id              String   @id @default(uuid())
  
  name            String
  cin             String
  email           String
  phone           String
  website         String?
  headquarters    String?
  logo_url        String?
  description     String?
  
  legal_entities  Json?    // [{name, cin, role, incorporated_date}]
  executives      Json?    // [{name, designation}]
  projects        String[]
  delivery_track  String?
  
  ip_address      String
  user_agent      String
  submitted_at    DateTime @default(now())
  
  status          FormStatus
  reviewed_by     String?
  review_notes    String?
  linked_builder  String?
  
  @@index([status])
  @@index([email])
}

enum FormStatus {
  new
  reviewing
  approved
  rejected
  clarification_requested
}

// Builder Dashboard Access
model BuilderAccount {
  id              String   @id @default(uuid())
  builder_id      String   @unique
  email           String
  password_hash   String?  // For password-based or OAuth ID
  auth_method     String   // "password", "google", "magic_link"
  
  last_login      DateTime?
  last_activity   DateTime?
  is_active       Boolean @default(true)
  
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt
  
  builder         Builder @relation(fields: [builder_id], references: [id], onDelete: Cascade)
  
  @@index([email])
  @@index([is_active])
}

// Lead Management (Leads from chat converted to specific builder)
model BuilderLead {
  id              String   @id @default(uuid())
  builder_id      String
  project_id      String?
  
  lead_type       String   // "callback_requested", "site_visit_requested", "inquiry"
  
  // Lead info
  name            String?
  email           String?
  phone           String?
  message         String?
  
  // Source
  source_session  String?  // chat_session_id
  source_intent   Json?    // Original user intent
  
  // Status
  status          LeadStatus
  assigned_to     String?  // broker/sales person (for future)
  notes           String?
  
  // Tracking
  contacted_at    DateTime?
  converted_at    DateTime?  // Did this lead become a customer?
  
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt
  
  builder         Builder @relation(fields: [builder_id], references: [id], onDelete: Cascade)
  
  @@index([builder_id])
  @@index([status])
  @@index([created_at])
}

enum LeadStatus {
  new
  contacted
  qualified
  lost
  converted
  archived
}

// Builder Analytics (Aggregated for builder dashboard)
model BuilderAnalytics {
  id              String   @id @default(uuid())
  builder_id      String
  
  date            DateTime // Daily snapshot
  
  leads_generated Int
  callbacks_requested Int
  site_visits_requested Int
  
  impressions     Int      // From promotionals
  clicks_on_promo Int
  conversions_from_promo Int
  
  projects_viewed Int
  projects_saved  Int
  
  created_at      DateTime @default(now())
  
  @@unique([builder_id, date])
  @@index([builder_id])
}

// Add to Builder model:
// news BuilderNews[]
// account BuilderAccount?
// leads BuilderLead[]
```

### 1.2 Property Color Scheme Storage

```typescript
// Add to Project model:
// builder_theme: Json? // {primaryColor, secondaryColor, logoUrl}

// Add to Builder model:
// default_theme: Json? // {primaryColor, secondaryColor, logoUrl}
```

---

## Phase 2: Analytics Core Tracking (Week 2)

### 2.1 Instrumentation Points

**In chat.ts/chat route handler:**

```typescript
// 1. Chat started
await prisma.chatAnalytics.create({
  data: {
    session_id,
    user_id,
    guest_token,
    chat_started_at: new Date(),
  }
})

// 2. Intent identified (after intent extraction)
const intent = extractIntent(userMessage)
await prisma.chatAnalytics.update({
  where: { session_id },
  data: {
    intent_identified_at: new Date(),
    intent_type: intent.type,
    extracted_sector: intent.sector,
    extracted_bhk: intent.bhk,
    extracted_budget_min: intent.budgetMin,
    extracted_budget_max: intent.budgetMax,
  }
})

// 3. Results shown (when projects returned)
await prisma.chatAnalytics.update({
  where: { session_id },
  data: {
    results_shown_at: new Date(),
  }
})

// 4. First engagement (on any project click)
if (!analytics.first_engagement_at) {
  await prisma.chatAnalytics.update({
    where: { session_id },
    data: {
      first_engagement_at: new Date(),
    }
  })
}

// 5. Conversion (callback/save)
await prisma.chatAnalytics.update({
  where: { session_id },
  data: {
    conversion_at: new Date(),
    conversion_type: "callback_requested",
    converted_project_id: projectId,
    converted_builder_id: project.builder_id,
  }
})

// Also create BuilderLead record
await prisma.builderLead.create({
  data: {
    builder_id: project.builder_id,
    project_id: projectId,
    lead_type: "callback_requested",
    source_session: session_id,
    source_intent: analytics.intent_snapshot,
    status: "new",
  }
})
```

### 2.2 Drop-Off Detection

```typescript
// Client-side timer (45s idle)
useEffect(() => {
  const timer = setTimeout(async () => {
    // No engagement in 45s
    await fetch('/api/chat/drop-off', {
      method: 'POST',
      body: JSON.stringify({
        session_id,
        drop_off_stage: "no_engagement",
        idle_seconds: 45,
      })
    })
  }, 45000)
  
  // Reset timer on user action
  const resetTimer = () => clearTimeout(timer)
  document.addEventListener('click', resetTimer)
  
  return () => {
    clearTimeout(timer)
    document.removeEventListener('click', resetTimer)
  }
}, [session_id])
```

### 2.3 Weekly Aggregation Job

```typescript
// /backend/scripts/aggregate-analytics.ts (Runs Sunday 2 AM via cron)
async function aggregateWeek() {
  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }) // Monday
  const weekEnd = endOfWeek(weekStart)
  
  // Check if already aggregated
  const existing = await prisma.weeklyMetricsSummary.findUnique({
    where: { week_start: weekStart }
  })
  if (existing) return
  
  // Get all analytics for the week
  const analytics = await prisma.chatAnalytics.findMany({
    where: {
      created_at: { gte: weekStart, lte: weekEnd }
    }
  })
  
  // Aggregate by sector
  const sectors: Record<string, {count: number, conversions: number}> = {}
  analytics.forEach(a => {
    if (a.extracted_sector) {
      if (!sectors[a.extracted_sector]) {
        sectors[a.extracted_sector] = {count: 0, conversions: 0}
      }
      sectors[a.extracted_sector].count++
      if (a.conversion_at) sectors[a.extracted_sector].conversions++
    }
  })
  
  const topSectors = Object.entries(sectors)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([sector, data]) => ({
      sector,
      count: data.count,
      conversions: data.conversions
    }))
  
  // Similar aggregations for intent, budget, bhk
  
  const totalConverted = analytics.filter(a => a.conversion_at).length
  const conversionRate = analytics.length > 0 
    ? (totalConverted / analytics.length) * 100 
    : 0
  
  await prisma.weeklyMetricsSummary.create({
    data: {
      week_start: weekStart,
      week_end: weekEnd,
      total_queries: analytics.length,
      unique_sessions: new Set(analytics.map(a => a.session_id)).size,
      conversion_rate: conversionRate,
      drop_off_rate: 100 - conversionRate,
      avg_time_spent_s: Math.round(
        analytics.reduce((sum, a) => sum + a.time_spent_seconds, 0) / analytics.length
      ),
      top_sectors: topSectors,
      intent_breakdown: [...], // Similar logic
      budget_distribution: [...],
      bhk_preferences: [...],
    }
  })
}
```

---

## Phase 3: Promotional System (Week 3-4)

### 3.1 Homepage Layout Redesign

**Discovery state (no chat):**
```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   RealtyPals Logo                                   │
│   "Find Your Perfect Home Faster"                  │
│                                                     │
│   ┌─────────────────────────────────────────────┐  │
│   │ [Search input with mic/location icon]       │  │
│   │ "Try: '3BHK under 2.5Cr in Sector 150'"     │  │
│   └─────────────────────────────────────────────┘  │
│                                                     │
│   ┌────────────────────────────────────────────┐   │
│   │ Active Promotional Button 1 (elite green)  │   │
│   │ "New Launch: Elite X - Limited Units"      │   │
│   └────────────────────────────────────────────┘   │
│   ┌────────────────────────────────────────────┐   │
│   │ Promotional Button 2                       │   │
│   └────────────────────────────────────────────┘   │
│   ┌────────────────────────────────────────────┐   │
│   │ Promotional Button 3                       │   │
│   └────────────────────────────────────────────┘   │
│   ┌────────────────────────────────────────────┐   │
│   │ Promotional Button 4                       │   │
│   └────────────────────────────────────────────┘   │
│                                                     │
│   ┌─ Scrolling Promotionals Area ────────────┐     │
│   │ "ACE Platinum Phase 2: Possession by..." │     │
│   │ ─────────────────────────────────────────│ ──> │
│   │ "Godrej Palm Retreat: Now Open for..."   │     │
│   └────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘

Chat state (active conversation):
┌─────────────────────────────────────────────────────┐
│                                                     │
│  [Chat messages and AI responses]                  │
│                                                     │
│  ┌────────────────────────────────────────────┐   │
│  │ Active Promotional Button (theme-colored)  │   │
│  └────────────────────────────────────────────┘   │
│                                                     │
│  ┌─ Scrolling Promotionals Area ────────────┐     │
│  │ [Rotating promotional messages]          │     │
│  └────────────────────────────────────────────┘   │
│                                                     │
│  [Chat input box]                                 │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 3.2 Smart Promotional Fetching

```typescript
// /api/promotions/active
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sector = searchParams.get('sector')
  const bhk = searchParams.get('bhk')
  const budget = searchParams.get('budget')
  
  const now = new Date()
  
  // Get all active promotions
  let promos = await prisma.promotional.findMany({
    where: {
      is_active: true,
      starts_at: { lte: now },
      ends_at: { gte: now },
    },
    orderBy: { created_at: 'desc' },
  })
  
  // Filter by targeting if intent available
  if (sector || bhk) {
    promos = promos.filter(p => {
      const matchesSector = p.target_sectors.length === 0 || p.target_sectors.includes(sector)
      const matchesBhk = p.target_bhk.length === 0 || (bhk && p.target_bhk.includes(parseInt(bhk)))
      return matchesSector && matchesBhk
    })
  }
  
  // Log impressions
  const session_id = searchParams.get('session_id')
  if (session_id) {
    for (const promo of promos.slice(0, 4)) {
      await prisma.promotionalInteraction.create({
        data: {
          promotional_id: promo.id,
          session_id,
          interaction_type: 'impression',
        }
      })
    }
  }
  
  return Response.json({
    promotions: promos.slice(0, 4),
  })
}
```

### 3.3 Toast Scroll Animation

```typescript
// components/PromotionalScroll.tsx
export function PromotionalScroll({ promotions, session_id }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0)
  
  useEffect(() => {
    if (promotions.length === 0) return
    
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % promotions.length)
    }, 6000) // Change every 6s
    
    return () => clearInterval(interval)
  }, [promotions.length])
  
  const current = promotions[currentIndex]
  
  return (
    <div className="relative h-16 overflow-hidden bg-gradient-to-r from-slate-50 to-transparent border-t border-slate-200">
      <motion.div
        key={current?.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5 }}
        className="flex items-center h-full px-6"
      >
        <span className="text-sm text-slate-700 font-medium">
          ✨ {current?.content}
        </span>
        {current?.link_target && (
          <button
            onClick={() => {
              handlePromoClick(current.id, session_id)
              navigate(current.link_target)
            }}
            className="ml-4 text-xs font-semibold text-blue-600 hover:underline"
          >
            Learn more →
          </button>
        )}
      </motion.div>
    </div>
  )
}
```

### 3.4 Promotional Interaction Tracking

```typescript
// /api/promotions/click
export async function POST(request: Request) {
  const { promotional_id, session_id, project_id } = await request.json()
  
  // Log click
  await prisma.promotionalInteraction.create({
    data: {
      promotional_id,
      session_id,
      interaction_type: 'click',
      converted_project_id: project_id,
    }
  })
  
  // Increment promotional counter
  await prisma.promotional.update({
    where: { id: promotional_id },
    data: { clicks: { increment: 1 } }
  })
  
  // Link to session if lead conversion happens
  if (session_id && project_id) {
    const session = await prisma.chatSession.findUnique({
      where: { id: session_id },
      include: { messages: true }
    })
    
    // Update ChatAnalytics with promotional_id
    await prisma.chatAnalytics.updateMany({
      where: { session_id },
      data: {
        promotional_id,
        promo_clicked: true,
      }
    })
  }
  
  return Response.json({ success: true })
}
```

---

## Phase 4: Builder News + Self-Service Form (Week 5)

### 4.1 Public Builder Form

**Endpoint:** `GET /forms/builder-registration`

```typescript
// app/forms/builder-registration/page.tsx
'use client'

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'

export default function BuilderForm() {
  const { register, control, handleSubmit, watch } = useForm({
    defaultValues: {
      name: '',
      cin: '',
      email: '',
      phone: '',
      website: '',
      headquarters: '',
      legal_entities: [{ name: '', cin: '', role: 'primary' }],
      executives: [{ name: '', designation: '' }],
      projects: [],
      delivery_track: '',
    }
  })
  
  const { fields: entityFields, append: appendEntity, remove: removeEntity } = useFieldArray({
    control,
    name: 'legal_entities'
  })
  
  const { fields: execFields, append: appendExec, remove: removeExec } = useFieldArray({
    control,
    name: 'executives'
  })
  
  const onSubmit = async (data: any) => {
    const res = await fetch('/api/builder-form/submit', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' }
    })
    
    if (res.ok) {
      toast.success('Form submitted! We\'ll review and get back to you.')
      // Redirect or show confirmation
    }
  }
  
  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">List Your Projects on RealtyPals</h1>
        <p className="text-slate-600 mt-2">
          Reach thousands of qualified buyers. Fill in your details below.
        </p>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Basic Info */}
        <div className="border-b pb-8">
          <h2 className="text-xl font-bold mb-6">Company Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Company Name *</label>
              <input
                {...register('name', { required: true })}
                className="w-full border rounded-lg px-4 py-2"
                placeholder="e.g., Elite Group"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">CIN *</label>
              <input
                {...register('cin', { required: true })}
                className="w-full border rounded-lg px-4 py-2"
                placeholder="e.g., U70200DL2012PTC237482"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Email *</label>
              <input
                {...register('email', { required: true })}
                type="email"
                className="w-full border rounded-lg px-4 py-2"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Phone *</label>
              <input
                {...register('phone', { required: true })}
                className="w-full border rounded-lg px-4 py-2"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Website</label>
              <input
                {...register('website')}
                placeholder="https://..."
                className="w-full border rounded-lg px-4 py-2"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Headquarters</label>
              <input
                {...register('headquarters')}
                placeholder="City/Region"
                className="w-full border rounded-lg px-4 py-2"
              />
            </div>
          </div>
          
          <div className="mt-6">
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              {...register('delivery_track')}
              rows={4}
              className="w-full border rounded-lg px-4 py-2"
              placeholder="Tell us about your company, track record, delivered projects..."
            />
          </div>
        </div>
        
        {/* Legal Entities */}
        <div className="border-b pb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Legal Entities</h2>
            <button
              type="button"
              onClick={() => appendEntity({ name: '', cin: '', role: 'secondary' })}
              className="text-sm bg-blue-50 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-100"
            >
              + Add Entity
            </button>
          </div>
          
          {entityFields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <input
                {...register(`legal_entities.${index}.name`, { required: true })}
                placeholder="Company name"
                className="border rounded-lg px-4 py-2"
              />
              <input
                {...register(`legal_entities.${index}.cin`)}
                placeholder="CIN"
                className="border rounded-lg px-4 py-2"
              />
              <select
                {...register(`legal_entities.${index}.role`)}
                className="border rounded-lg px-4 py-2"
              >
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
              </select>
              {index > 0 && (
                <button
                  type="button"
                  onClick={() => removeEntity(index)}
                  className="text-red-600 text-sm"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
        
        {/* Directors */}
        <div className="border-b pb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Directors</h2>
            <button
              type="button"
              onClick={() => appendExec({ name: '', designation: '' })}
              className="text-sm bg-blue-50 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-100"
            >
              + Add Director
            </button>
          </div>
          
          {execFields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input
                {...register(`executives.${index}.name`, { required: true })}
                placeholder="Name"
                className="border rounded-lg px-4 py-2"
              />
              <input
                {...register(`executives.${index}.designation`)}
                placeholder="Designation"
                className="border rounded-lg px-4 py-2"
              />
              {index > 0 && (
                <button
                  type="button"
                  onClick={() => removeExec(index)}
                  className="text-red-600 text-sm"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
        
        {/* Submit */}
        <div className="flex gap-4">
          <button
            type="submit"
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
          >
            Submit for Review
          </button>
        </div>
      </form>
      
      <div className="mt-12 p-6 bg-slate-50 rounded-lg">
        <h3 className="font-bold mb-4">What happens next?</h3>
        <ul className="space-y-2 text-sm text-slate-700">
          <li>✓ Our team reviews your submission (24-48 hours)</li>
          <li>✓ We verify your details against RERA records</li>
          <li>✓ You receive approval + dashboard access</li>
          <li>✓ Start managing promotions and tracking leads</li>
        </ul>
      </div>
    </div>
  )
}
```

### 4.2 Form Submission & Admin Review

```typescript
// /api/builder-form/submit
export async function POST(request: Request) {
  const data = await request.json()
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  
  // Check rate limit: 1 form per IP per 24h
  const recent = await prisma.builderApplicationForm.findFirst({
    where: {
      ip_address: ip,
      submitted_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }
  })
  
  if (recent) {
    return Response.json({ error: 'Please try again after 24 hours' }, { status: 429 })
  }
  
  // Create form record
  const form = await prisma.builderApplicationForm.create({
    data: {
      ...data,
      ip_address: ip,
      user_agent: request.headers.get('user-agent') || '',
      status: 'new',
    }
  })
  
  // Notify admin
  await sendEmail({
    to: process.env.ADMIN_EMAIL,
    subject: `New Builder Application: ${data.name}`,
    body: `
      ${data.name} submitted application form.
      Email: ${data.email}
      Phone: ${data.phone}
      CIN: ${data.cin}
      
      Review at: /admin/builder-applications/${form.id}
    `
  })
  
  return Response.json({ success: true, form_id: form.id })
}
```

### 4.3 Admin Builder Application Review Page

```typescript
// /admin/builder-applications/page.tsx
'use client'

export default function BuilderApplications() {
  const [forms, setForms] = useState([])
  const [filter, setFilter] = useState<'new' | 'reviewing' | 'approved' | 'rejected'>('new')
  
  useEffect(() => {
    fetch(`/api/admin/builder-applications?status=${filter}`)
      .then(r => r.json())
      .then(data => setForms(data.forms))
  }, [filter])
  
  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {(['new', 'reviewing', 'approved', 'rejected'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === s
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {s.toUpperCase()} ({/* count */})
          </button>
        ))}
      </div>
      
      <div className="space-y-4">
        {forms.map(form => (
          <Link key={form.id} href={`/admin/builder-applications/${form.id}`}>
            <div className="p-6 bg-white border rounded-lg hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-lg">{form.name}</h3>
                  <p className="text-sm text-slate-600">
                    {form.email} • {form.phone}
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    Submitted {new Date(form.submitted_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  form.status === 'new' ? 'bg-yellow-100 text-yellow-700' :
                  form.status === 'reviewing' ? 'bg-blue-100 text-blue-700' :
                  form.status === 'approved' ? 'bg-green-100 text-green-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {form.status}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

### 4.4 Builder News Management

```typescript
// /builder/[builder_id]/news
'use client'

export default function BuilderNewsPage({ params }: Props) {
  const [news, setNews] = useState([])
  const [showForm, setShowForm] = useState(false)
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Your News</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg"
        >
          + New News
        </button>
      </div>
      
      {showForm && <NewsSubmissionForm onSubmit={(data) => {
        fetch(`/api/builder/news`, {
          method: 'POST',
          body: JSON.stringify({ ...data, builder_id: params.builder_id }),
          headers: { 'Content-Type': 'application/json' }
        })
          .then(r => r.json())
          .then(() => {
            setShowForm(false)
            // Refetch news
          })
      }} />}
      
      <div className="space-y-4">
        {news.map(item => (
          <div key={item.id} className="p-6 bg-white border rounded-lg">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold">{item.title}</h3>
                <p className="text-sm text-slate-600 mt-2">{item.description}</p>
                <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
                  <span>{new Date(item.created_at).toLocaleDateString()}</span>
                  <span className={`font-medium ${
                    item.status === 'draft' ? 'text-slate-600' :
                    item.status === 'pending_approval' ? 'text-yellow-600' :
                    item.status === 'published' ? 'text-green-600' :
                    'text-red-600'
                  }`}>
                    {item.status}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="text-blue-600 text-sm">Edit</button>
                {item.status === 'published' && (
                  <button className="text-green-600 text-sm">
                    {item.run_as_promo ? 'Running as Promo' : 'Run as Promo'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## Phase 5: Builder Dashboard - Complete (Week 6-7)

### 5.1 Dashboard Structure

```
/builder/[builder_id]/
├── /dashboard
│   ├── Overview (KPIs)
│   ├── Recent leads
│   └── Quick stats
├── /leads
│   ├── All leads by status
│   ├── Lead detail
│   └── Lead handoff
├── /news
│   ├── List
│   ├── Create/edit
│   └── View approvals
├── /promotions
│   ├── Active promotions
│   ├── Performance
│   └── Request new promo
├── /analytics
│   ├── Weekly trends
│   ├── Lead source
│   └── Conversion funnel
└── /settings
    ├── Brand theme
    ├── Team members
    └── API keys (future)
```

### 5.2 Dashboard Pages

```typescript
// /builder/[builder_id]/dashboard/page.tsx
'use client'

export default function BuilderDashboard({ params }: Props) {
  const [analytics, setAnalytics] = useState(null)
  const [builder, setBuilder] = useState(null)
  
  useEffect(() => {
    Promise.all([
      fetch(`/api/builder/${params.builder_id}/analytics`).then(r => r.json()),
      fetch(`/api/builder/${params.builder_id}`).then(r => r.json()),
    ]).then(([analytics, builder]) => {
      setAnalytics(analytics)
      setBuilder(builder)
    })
  }, [])
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-lg bg-slate-200 flex items-center justify-center">
          {builder?.logo_url ? (
            <img src={builder.logo_url} alt={builder.name} />
          ) : (
            <Building2 size={24} className="text-slate-600" />
          )}
        </div>
        <div>
          <h1 className="text-3xl font-bold">{builder?.name}</h1>
          <p className="text-slate-600">{builder?.headquarters}</p>
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KPICard
          label="New Leads"
          value={analytics?.new_leads || 0}
          icon={<Users size={24} />}
          trend="+12% this week"
        />
        <KPICard
          label="Site Visit Requests"
          value={analytics?.site_visits || 0}
          icon={<Calendar size={24} />}
        />
        <KPICard
          label="Profile Views"
          value={analytics?.impressions || 0}
          icon={<Eye size={24} />}
        />
        <KPICard
          label="Conversion Rate"
          value={`${analytics?.conversion_rate || 0}%`}
          icon={<TrendingUp size={24} />}
        />
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WeeklyLeadsChart data={analytics?.weekly_leads} />
        <LeadSourceChart data={analytics?.lead_sources} />
      </div>
      
      {/* Recent Leads */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-bold mb-4">Recent Leads</h2>
        <div className="space-y-3">
          {analytics?.recent_leads?.map(lead => (
            <div key={lead.id} className="p-4 bg-slate-50 rounded-lg flex items-center justify-between">
              <div>
                <p className="font-medium">{lead.name || 'Anonymous'}</p>
                <p className="text-sm text-slate-600">{lead.phone || lead.email}</p>
              </div>
              <Link href={`/builder/${params.builder_id}/leads/${lead.id}`}>
                <ArrowRight size={20} className="text-slate-400" />
              </Link>
            </div>
          ))}
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href={`/builder/${params.builder_id}/promotions`}>
          <div className="p-6 bg-blue-50 rounded-lg border border-blue-200 hover:shadow-lg transition-shadow cursor-pointer">
            <h3 className="font-bold text-blue-900">Manage Promotions</h3>
            <p className="text-sm text-blue-700 mt-2">View active promotions & request new ones</p>
          </div>
        </Link>
        
        <Link href={`/builder/${params.builder_id}/news`}>
          <div className="p-6 bg-green-50 rounded-lg border border-green-200 hover:shadow-lg transition-shadow cursor-pointer">
            <h3 className="font-bold text-green-900">Upload News</h3>
            <p className="text-sm text-green-700 mt-2">Share project updates & achievements</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
```

### 5.3 Lead Management

```typescript
// /builder/[builder_id]/leads/page.tsx
'use client'

export default function BuilderLeads({ params }: Props) {
  const [leads, setLeads] = useState([])
  const [filter, setFilter] = useState<LeadStatus>('new')
  
  const statuses = ['new', 'contacted', 'qualified', 'lost', 'converted'] as const
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Manage Leads</h1>
      
      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {statuses.map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap font-medium transition-all ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {status.toUpperCase()} ({/* count */})
          </button>
        ))}
      </div>
      
      {/* Leads list */}
      <div className="space-y-3">
        {leads.map(lead => (
          <Link key={lead.id} href={`/builder/${params.builder_id}/leads/${lead.id}`}>
            <div className="p-6 bg-white border rounded-lg hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold">{lead.name || 'Anonymous Lead'}</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    {lead.project_id && `Interested in: ${lead.project?.name}`}
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    {lead.lead_type} • {new Date(lead.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    lead.status === 'new' ? 'bg-yellow-100 text-yellow-700' :
                    lead.status === 'contacted' ? 'bg-blue-100 text-blue-700' :
                    lead.status === 'qualified' ? 'bg-purple-100 text-purple-700' :
                    lead.status === 'lost' ? 'bg-red-100 text-red-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {lead.status}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

### 5.4 Brand Theme Application

```typescript
// In property-detail page
export function PropertyDetailWithTheme({ project }: Props) {
  const theme = project.builder_theme || project.builder.default_theme
  
  return (
    <div style={{
      '--primary': theme.primaryColor,
      '--secondary': theme.secondaryColor,
    } as React.CSSProperties}>
      <div className="bg-[var(--primary)] text-white p-8 rounded-lg">
        {/* Header with builder branding */}
        <img src={theme.logoUrl} alt={project.builder.name} className="h-12" />
        <h1 className="text-4xl font-bold mt-4">{project.name}</h1>
      </div>
      
      {/* Buttons themed */}
      <button className="bg-[var(--primary)] text-white hover:opacity-90">
        Request Callback
      </button>
      
      {/* Builder news section if available */}
      {project.builder.news?.length > 0 && (
        <div className="border-l-4" style={{ borderColor: 'var(--primary)' }}>
          <h3 className="font-bold mb-4">Latest from {project.builder.name}</h3>
          {project.builder.news.map(news => (
            <div key={news.id} className="p-4 bg-slate-50 rounded-lg">
              {news.image_url && <img src={news.image_url} alt="" />}
              <h4 className="font-bold mt-2">{news.title}</h4>
              <p className="text-sm text-slate-600 mt-1">{news.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

---

## Phase 6: Portal API Integration (Future - Week 8+)

**Placeholder for future:**
```typescript
// Builder can connect their portal APIs
// Sync leads, property updates, availability
// All managed from builder dashboard

// Settings page will have:
// - API key management
// - Connected portals
// - Sync status
// - Lead routing rules
```

---

## Admin Panel Additions

### `/admin/analytics`
- Weekly trends dashboard
- Funnel visualization (DISCOVERY → CALLBACK)
- Sector heatmap
- Query frequency top 50
- Drop-off analysis by stage
- Export CSV reports

### `/admin/promotions`
- Create/edit/pause promotions
- Performance by promotional
- A/B testing setup
- Schedule promos by date/sector/BHK

### `/admin/builder-applications`
- Review form submissions
- Approve/reject with notes
- Auto-create Builder on approval
- Send login credentials

### `/admin/builder-news`
- Review pending news
- Approve/reject with feedback
- Publish to live
- Mark as promotional

---

## Technical Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind, Recharts
- **Backend**: Node.js, Express, Prisma
- **Database**: PostgreSQL
- **Analytics**: Custom tracking in ChatAnalytics table
- **Auth**: Magic links + password (builder dashboard)
- **Email**: SendGrid for notifications

---

## Success Metrics

1. **Analytics**: Track conversion funnel completion (target: 5-10% callback rate)
2. **Promotions**: CTR > 2%, conversion from promo > 1%
3. **Builder Satisfaction**: NPS > 7/10 on dashboard
4. **Lead Quality**: 70%+ of builder leads result in contact
5. **News Uptake**: 80%+ of approved builders use news feature

---

## Questions Before Phase 1?

1. **Weekly aggregation**: Should the job run Sunday 2 AM or a different time?
2. **Drop-off idle time**: Should it be 45s or different threshold?
3. **Builder form email**: Should we auto-send login link or require password setup?
4. **Lead notification**: Should builders get email + SMS on new leads?
5. **Brand theme colors**: What's the fallback if builder doesn't set colors?

Ready to start Phase 1, or refinements needed?
