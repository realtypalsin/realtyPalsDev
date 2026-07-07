# Phase 1: Schema + Instrumentation Guide

**Status**: Schema added to `frontend/prisma/schema.prisma`  
**Next**: Apply migration + add tracking code

---

## Step 1: Apply Schema Migration

```bash
cd frontend

# Option A: If migration system works
npx prisma migrate dev --name "Add analytics and promotions"

# Option B: If direct push needed
npx prisma db push
```

**New tables created:**
- `chat_analytics` — funnel tracking
- `query_metrics` — query aggregation
- `weekly_metrics_summary` — weekly rollup
- `promotionals` — promo management
- `promotional_interactions` — promo tracking
- `builder_news` — builder news/updates
- `builder_application_forms` — self-service form
- `builder_accounts` — builder dashboard auth
- `builder_leads` — lead tracking
- `builder_analytics` — builder dashboard metrics
- `builder_themes` — brand theme system

**New enums:**
- `PromotionalType`
- `NewsStatus`
- `FormStatus`
- `LeadStatus`

**Relations added to:**
- `Builder` → news, account, leads, theme
- `ChatSession` → analytics, query_metrics
- `Project` → builder_theme (JSON field)

---

## Step 2: Instrumentation Points

### 2.1 Chat Initiation

**File**: `backend/src/routes/chat.ts` or `app/api/chat/route.ts`

```typescript
// At start of chat handler
import { prisma } from '@/lib/prisma'

async function handleChat(request: Request) {
  const { message, session_id, user_id, guest_token } = await request.json()
  
  // 1. CREATE ChatAnalytics on first message
  let analytics = await prisma.chatAnalytics.findFirst({
    where: { session_id }
  })
  
  if (!analytics) {
    analytics = await prisma.chatAnalytics.create({
      data: {
        session_id,
        user_id: user_id || null,
        guest_token: guest_token || null,
        chat_started_at: new Date(),
      }
    })
  }
  
  // Continue with chat logic...
}
```

### 2.2 Intent Identification

**File**: `backend/src/lib/discovery/intent.ts` or wherever intent extraction happens

```typescript
// After intent is extracted and confirmed
async function extractAndLogIntent(userMessage: string, session_id: string, analytics_id: string) {
  const intent = extractIntent(userMessage)  // Existing function
  
  // Log intent to ChatAnalytics
  if (intent.type !== 'unclear') {
    await prisma.chatAnalytics.update({
      where: { id: analytics_id },
      data: {
        intent_identified_at: new Date(),
        intent_type: intent.type,
        extracted_sector: intent.sector || null,
        extracted_bhk: intent.bhk || null,
        extracted_budget_min: intent.budgetMin || null,
        extracted_budget_max: intent.budgetMax || null,
      }
    })
    
    // Also create QueryMetrics entry
    await prisma.queryMetrics.create({
      data: {
        query_text: userMessage,
        intent_type: intent.type,
        sector: intent.sector || null,
        bhk: intent.bhk || null,
        budget_min_cr: intent.budgetMin || null,
        budget_max_cr: intent.budgetMax || null,
        session_id,
        week_start: new Date().toISOString().split('T')[0],  // Will be calculated properly
        clicked: false,
        converted: false,
      }
    })
  }
  
  return intent
}
```

### 2.3 Results Shown

**File**: `backend/src/routes/search.ts` or API route that returns projects

```typescript
// After projects query returns
async function returnResults(projects: Project[], session_id: string, analytics_id: string) {
  // Update ChatAnalytics
  await prisma.chatAnalytics.update({
    where: { id: analytics_id },
    data: {
      results_shown_at: new Date(),
    }
  })
  
  // Return projects to client
  return Response.json({ projects })
}
```

### 2.4 First Engagement (Client-side)

**File**: `frontend/components/chat/ChatInterface.tsx` or property card handler

```typescript
// When user clicks any project card/property
async function handleProjectClick(projectId: string, session_id: string) {
  // Update analytics
  await fetch('/api/chat/engagement', {
    method: 'POST',
    body: JSON.stringify({
      session_id,
      event: 'first_engagement',
      projectId,
    })
  })
  
  // Navigate to project detail
  router.push(`/property/${projectId}`)
}

// Backend: /api/chat/engagement
export async function POST(request: Request) {
  const { session_id, event, projectId } = await request.json()
  
  const analytics = await prisma.chatAnalytics.findFirst({
    where: { session_id }
  })
  
  if (analytics && !analytics.first_engagement_at) {
    await prisma.chatAnalytics.update({
      where: { id: analytics.id },
      data: {
        first_engagement_at: new Date(),
        projects_clicked: { increment: 1 },
      }
    })
  }
  
  return Response.json({ success: true })
}
```

### 2.5 Conversion (Callback Request)

**File**: Where callback form is submitted

```typescript
// When user requests callback
async function submitCallback(data: CallbackData) {
  const response = await fetch('/api/callback/request', {
    method: 'POST',
    body: JSON.stringify({
      ...data,
      session_id,
      project_id: currentProjectId,
    })
  })
  
  return response.json()
}

// Backend: /api/callback/request
export async function POST(request: Request) {
  const { name, phone, email, session_id, project_id } = await request.json()
  
  // Get current analytics
  const analytics = await prisma.chatAnalytics.findFirst({
    where: { session_id },
    include: { ChatSession: true }
  })
  
  // Update ChatAnalytics with conversion
  await prisma.chatAnalytics.update({
    where: { id: analytics.id },
    data: {
      conversion_at: new Date(),
      conversion_type: 'callback_requested',
      converted_project_id: project_id,
      converted_builder_id: project.builder_id,
    }
  })
  
  // Create BuilderLead
  const lead = await prisma.builderLead.create({
    data: {
      builder_id: project.builder_id,
      project_id,
      lead_type: 'callback_requested',
      name,
      email,
      phone,
      source_session: session_id,
      source_intent: analytics.intent_snapshot || {},
      status: 'new',
    }
  })
  
  // Increment promo conversion if promo was clicked
  if (analytics.promotional_id) {
    await prisma.promotional.update({
      where: { id: analytics.promotional_id },
      data: { conversions: { increment: 1 } }
    })
  }
  
  return Response.json({ success: true, lead_id: lead.id })
}
```

### 2.6 Drop-off Detection (Client-side)

**File**: `frontend/components/chat/ChatInterface.tsx` or useEffect hook

```typescript
import { useEffect, useRef } from 'react'

export function useChatDropoffDetection(session_id: string, analytics_id: string) {
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  
  useEffect(() => {
    // Start 45-second idle timer
    const startIdleTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      
      timerRef.current = setTimeout(async () => {
        // User has been idle for 45 seconds
        await fetch('/api/chat/drop-off', {
          method: 'POST',
          body: JSON.stringify({
            session_id,
            analytics_id,
            drop_off_stage: 'no_engagement',
            idle_seconds: 45,
          })
        })
      }, 45000)
    }
    
    // Reset on any user interaction
    const resetTimer = () => {
      startIdleTimer()
    }
    
    const handleUserInteraction = (e: Event) => {
      // Only reset if it's a meaningful interaction
      if (e.target instanceof HTMLElement && 
          (e.target.matches('[data-interactive]') || 
           e.target.closest('[data-interactive]'))) {
        resetTimer()
      }
    }
    
    document.addEventListener('click', handleUserInteraction, true)
    startIdleTimer()
    
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      document.removeEventListener('click', handleUserInteraction, true)
    }
  }, [session_id, analytics_id])
}

// Backend: /api/chat/drop-off
export async function POST(request: Request) {
  const { session_id, analytics_id, drop_off_stage, idle_seconds } = await request.json()
  
  await prisma.chatAnalytics.update({
    where: { id: analytics_id },
    data: {
      drop_off_stage,
      drop_off_at: new Date(),
      idle_seconds_before_drop_off: idle_seconds,
    }
  })
  
  return Response.json({ success: true })
}
```

---

## Step 3: Promotional Tracking

**File**: `frontend/components/PromotionalButton.tsx`

```typescript
export function PromotionalButton({ promo, session_id }: Props) {
  useEffect(() => {
    // Log impression
    fetch('/api/promotions/impression', {
      method: 'POST',
      body: JSON.stringify({ promotional_id: promo.id, session_id })
    })
  }, [promo.id, session_id])
  
  const handleClick = async () => {
    // Log click
    await fetch('/api/promotions/click', {
      method: 'POST',
      body: JSON.stringify({
        promotional_id: promo.id,
        session_id,
      })
    })
    
    // Navigate
    if (promo.link_target) {
      router.push(promo.link_target)
    }
  }
  
  return (
    <button
      onClick={handleClick}
      style={{
        backgroundColor: promo.builder_theme?.primaryColor || '#3B82F6',
      }}
    >
      {promo.content}
    </button>
  )
}
```

---

## Step 4: Cron Job - Weekly Aggregation

**File**: `backend/scripts/aggregate-weekly-analytics.ts` (NEW)

```typescript
import { PrismaClient } from '@prisma/client'
import { startOfWeek, endOfWeek } from 'date-fns'

const prisma = new PrismaClient()

export async function aggregateWeeklyAnalytics() {
  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }) // Monday
  const weekEnd = endOfWeek(weekStart)
  
  console.log(`📊 Aggregating analytics for week: ${weekStart.toISOString()} to ${weekEnd.toISOString()}`)
  
  // Check if already aggregated
  const existing = await prisma.weeklyMetricsSummary.findUnique({
    where: { week_start: weekStart }
  })
  
  if (existing) {
    console.log('✓ Week already aggregated, skipping')
    return existing
  }
  
  // Get all analytics for the week
  const analytics = await prisma.chatAnalytics.findMany({
    where: {
      created_at: { gte: weekStart, lte: weekEnd }
    }
  })
  
  console.log(`Found ${analytics.length} sessions`)
  
  if (analytics.length === 0) {
    return null // No data to aggregate
  }
  
  // Aggregate by sector
  const sectors: Record<string, {count: number, conversions: number}> = {}
  const intents: Record<string, number> = {}
  const budgets: Record<string, number> = {}
  const bhks: Record<number, number> = {}
  
  analytics.forEach(a => {
    // Sectors
    if (a.extracted_sector) {
      if (!sectors[a.extracted_sector]) {
        sectors[a.extracted_sector] = { count: 0, conversions: 0 }
      }
      sectors[a.extracted_sector].count++
      if (a.conversion_at) {
        sectors[a.extracted_sector].conversions++
      }
    }
    
    // Intents
    if (a.intent_type) {
      intents[a.intent_type] = (intents[a.intent_type] || 0) + 1
    }
    
    // BHKs
    if (a.extracted_bhk) {
      bhks[a.extracted_bhk] = (bhks[a.extracted_bhk] || 0) + 1
    }
    
    // Budget ranges
    if (a.extracted_budget_min && a.extracted_budget_max) {
      const range = `₹${Math.round(a.extracted_budget_min)}-${Math.round(a.extracted_budget_max)} Cr`
      budgets[range] = (budgets[range] || 0) + 1
    }
  })
  
  // Calculate metrics
  const totalConverted = analytics.filter(a => a.conversion_at).length
  const conversionRate = analytics.length > 0 ? (totalConverted / analytics.length) * 100 : 0
  const avgTimeSpent = Math.round(
    analytics.reduce((sum, a) => sum + a.time_spent_seconds, 0) / analytics.length
  )
  
  // Sort and limit
  const topSectors = Object.entries(sectors)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([sector, data]) => ({
      sector,
      count: data.count,
      conversions: data.conversions,
      conversion_rate: ((data.conversions / data.count) * 100).toFixed(1)
    }))
  
  // Create summary
  const summary = await prisma.weeklyMetricsSummary.create({
    data: {
      week_start: weekStart,
      week_end: weekEnd,
      total_queries: analytics.length,
      unique_sessions: new Set(analytics.map(a => a.session_id)).size,
      conversion_rate: parseFloat(conversionRate.toFixed(2)),
      drop_off_rate: parseFloat((100 - conversionRate).toFixed(2)),
      avg_time_spent_s: avgTimeSpent,
      top_sectors: topSectors,
      intent_breakdown: Object.entries(intents).map(([type, count]) => ({ type, count })),
      budget_distribution: Object.entries(budgets).map(([range, count]) => ({ range, count })),
      bhk_preferences: Object.entries(bhks).map(([bhk, count]) => ({ bhk: parseInt(bhk), count })),
    }
  })
  
  console.log('✓ Weekly summary created:', summary.id)
  return summary
}

// Export for cron scheduling
if (require.main === module) {
  aggregateWeeklyAnalytics()
    .then(() => {
      console.log('✓ Aggregation complete')
      process.exit(0)
    })
    .catch(err => {
      console.error('❌ Aggregation failed:', err)
      process.exit(1)
    })
    .finally(() => {
      prisma.$disconnect()
    })
}
```

**Schedule in package.json:**
```json
{
  "scripts": {
    "cron:analytics-weekly": "node -r ts-node/register backend/scripts/aggregate-weekly-analytics.ts"
  }
}
```

**Setup cron (Vercel/Railway/host):**
```bash
# Weekly on Sunday 2 AM (Unix cron: 0 2 * * 0)
0 2 * * 0 npm run cron:analytics-weekly
```

---

## Checklist: Phase 1 Complete

- [ ] Schema migration applied (npx prisma db push)
- [ ] ChatAnalytics creation in chat handler
- [ ] Intent tracking in intent extraction
- [ ] Results tracking in search handler
- [ ] First engagement tracking (client-side)
- [ ] Drop-off detection (45s idle timer)
- [ ] Conversion tracking (callback request)
- [ ] Promotional impression/click tracking
- [ ] Weekly aggregation cron job set up
- [ ] Test with real chat flow
- [ ] Verify data in `/admin/analytics` dashboard

---

## Next: Phase 2

Once instrumentation is done and data is flowing:
1. Build `/admin/analytics` pages (overview, funnel, sectors, queries)
2. Implement promotional system UI
3. Wire up promotional fetching on chat load

---

## Database Verification

**Check tables created:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%analytic%' OR table_name LIKE '%promotional%' OR table_name LIKE '%builder%';
```

**Check sample data:**
```sql
SELECT COUNT(*) FROM chat_analytics;
SELECT COUNT(*) FROM query_metrics;
SELECT COUNT(*) FROM weekly_metrics_summary;
```
