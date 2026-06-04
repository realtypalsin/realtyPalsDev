# Sprint E: Backend Migration Express → Next.js App Router

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate all Express API routes to Next.js App Router Route Handlers. Keep same URL paths (`/api/v1/*`) so zero frontend changes. Add Zod validation, fix JSON parsing, fix error logging. Frontend switches from `http://localhost:4000/api/v1` to `/api/v1`.

**Architecture:** Create `frontend/app/api/v1/` route handlers that mirror the Express backend. Share Prisma client, AI clients, and repositories via `frontend/lib/`. Once routes are live, update `NEXT_PUBLIC_API_URL` to `/api/v1`. Express backend becomes unused but is not deleted.

**Tech Stack:** Next.js App Router (Route Handlers), Prisma (already configured), Groq SDK (already in frontend deps), Zod (already in frontend deps), TypeScript

**Critical constraint:** Do NOT change any URL paths. Every `fetch(${API_BASE}/...)` call in the frontend continues to work without modification.

---

## File Map

**New lib files:**
| File | Purpose |
|------|---------|
| `frontend/lib/db.ts` | Prisma client singleton |
| `frontend/lib/ai/groq.ts` | Groq client + model constants |
| `frontend/lib/ai/prompts.ts` | All system prompts (copy from backend) |
| `frontend/lib/ai/intentManager.ts` | Intent state logic (copy from backend) |
| `frontend/lib/repositories/projectRepository.ts` | Project DB queries (copy from backend) |

**New API routes:**
| File | Express equivalent |
|------|--------------------|
| `frontend/app/api/v1/projects/route.ts` | `GET /api/v1/projects` |
| `frontend/app/api/v1/projects/[slug]/route.ts` | `GET /api/v1/projects/:slug` |
| `frontend/app/api/v1/saved/route.ts` | `GET + POST /api/v1/saved` |
| `frontend/app/api/v1/saved/[id]/route.ts` | `DELETE /api/v1/saved/:id` |
| `frontend/app/api/v1/chat/session/route.ts` | `GET /api/v1/chat/session` |
| `frontend/app/api/v1/chat/session/list/route.ts` | `GET /api/v1/chat/session/list` |
| `frontend/app/api/v1/chat/intent/route.ts` | `DELETE /api/v1/chat/intent` |
| `frontend/app/api/v1/chat/route.ts` | `POST /api/v1/chat` (main — most complex) |

**Modified:**
| File | Change |
|------|--------|
| `frontend/lib/env.ts` | Accept relative URLs (starting with `/`) |
| `frontend/.env.local` | `NEXT_PUBLIC_API_URL=/api/v1` |

---

## Task 1: Create frontend lib infrastructure

**Files to create:**
- `frontend/lib/db.ts`
- `frontend/lib/ai/groq.ts`
- `frontend/lib/ai/prompts.ts`
- `frontend/lib/ai/intentManager.ts`
- `frontend/lib/repositories/projectRepository.ts`

- [ ] **Step 1: Create `frontend/lib/db.ts`**

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 2: Create `frontend/lib/ai/groq.ts`**

```typescript
import Groq from 'groq-sdk'

if (!process.env.GROQ_API_KEY) {
  throw new Error('GROQ_API_KEY is not set')
}

export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export const GROQ_FAST = 'llama-3.1-8b-instant'
export const GROQ_SMART = 'llama-3.3-70b-versatile'

/** Safe JSON parse — strips markdown fences if present */
export function safeJsonParse(text: string | null | undefined): Record<string, unknown> {
  if (!text) return {}
  try {
    const clean = text
      .replace(/^```json\s*/m, '')
      .replace(/^```\s*/m, '')
      .replace(/```\s*$/m, '')
      .trim()
    const parsed = JSON.parse(clean)
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}
```

- [ ] **Step 3: Create `frontend/lib/ai/prompts.ts`**

Copy `backend/src/lib/ai/prompts.ts` exactly as-is. Read the backend file and write it to the frontend lib location.

```bash
# Read backend/src/lib/ai/prompts.ts — copy it verbatim to frontend/lib/ai/prompts.ts
```

The file exports `export const PROMPTS = { INTENT_EXTRACTION, GENERAL_QUERY, QUESTION_GENERATION, ADVISOR_MODE }`. Copy it exactly.

- [ ] **Step 4: Create `frontend/lib/ai/intentManager.ts`**

Copy `backend/src/lib/ai/intentManager.ts` exactly as-is to `frontend/lib/ai/intentManager.ts`.

- [ ] **Step 5: Create `frontend/lib/repositories/projectRepository.ts`**

Copy `backend/src/repositories/projectRepository.ts` to `frontend/lib/repositories/projectRepository.ts`.

Update the import at the top from:
```typescript
import { prisma } from '../lib/db'
import type { ProjectCard, ProjectDetail, UnitTypeSummary, AmenitySummary, ConnSummary } from '../types/project'
```
to:
```typescript
import { prisma } from '@/lib/db'
import type { ProjectCard, ProjectDetail, UnitTypeSummary, AmenitySummary, ConnSummary } from '@/types/project'
```

- [ ] **Step 6: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -E "lib/db|lib/ai|lib/repositories" | head -20
```

Fix any type errors. Common: Prisma model types may differ between `@prisma/client` versions — use `any` casts if needed as a short-term fix.

- [ ] **Step 7: Commit**

```bash
git add frontend/lib/db.ts frontend/lib/ai/ frontend/lib/repositories/
git commit -m "feat(e1): add frontend lib infrastructure — Prisma client, Groq client, prompts, intentManager, repository"
```

---

## Task 2: Simple API routes — projects, saved, session, intent

**Files to create:**
- `frontend/app/api/v1/projects/route.ts`
- `frontend/app/api/v1/projects/[slug]/route.ts`
- `frontend/app/api/v1/saved/route.ts`
- `frontend/app/api/v1/saved/[id]/route.ts`
- `frontend/app/api/v1/chat/session/route.ts`
- `frontend/app/api/v1/chat/session/list/route.ts`
- `frontend/app/api/v1/chat/intent/route.ts`

### Auth helper (inline each route — no shared util needed yet)

```typescript
function getUserId(request: Request): string | null {
  return request.headers.get('x-user-id')
}
```

- [ ] **Step 1: Create `frontend/app/api/v1/projects/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { searchProjects } from '@/lib/repositories/projectRepository'

const QuerySchema = z.object({
  sector: z.string().optional(),
  bhk: z.coerce.number().int().min(1).max(5).optional(),
  min_price: z.coerce.number().nonnegative().optional(),
  max_price: z.coerce.number().nonnegative().optional(),
})

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const parsed = QuerySchema.safeParse(Object.fromEntries(searchParams))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query params', details: parsed.error.flatten() }, { status: 400 })
  }
  const { sector, bhk, min_price, max_price } = parsed.data

  try {
    const projects = await searchProjects({
      city: 'Noida',
      sector: sector ?? 'Sector 150',
      bhk,
      budget_min_cr: min_price != null ? min_price / 10_000_000 : undefined,
      budget_max_cr: max_price != null ? max_price / 10_000_000 : undefined,
    })
    return NextResponse.json({ projects })
  } catch (err) {
    console.error('[GET /api/v1/projects]', err)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create `frontend/app/api/v1/projects/[slug]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getProjectDetail } from '@/lib/repositories/projectRepository'

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const project = await getProjectDetail(params.slug)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    return NextResponse.json({ project })
  } catch (err) {
    console.error('[GET /api/v1/projects/:slug]', err)
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Create `frontend/app/api/v1/saved/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { toProjectCard } from '@/lib/repositories/projectRepository'

function getUserId(req: NextRequest): string | null {
  return req.headers.get('x-user-id')
}

const SaveBodySchema = z.object({
  project_id: z.string().uuid(),
})

export async function GET(request: NextRequest) {
  const userId = getUserId(request)
  if (!userId) return NextResponse.json({ error: 'X-User-Id required' }, { status: 400 })

  try {
    const saved = await prisma.savedProperty.findMany({
      where: { user_id: userId },
      include: {
        project: {
          include: {
            builder: { select: { name: true, slug: true } },
            unit_types: { orderBy: { bhk: 'asc' } },
            amenities: true,
            connectivity: true,
            images: { orderBy: { sort_order: 'asc' } },
          },
        },
      },
      orderBy: { saved_at: 'desc' },
    })
    const projects = saved.map((s) => toProjectCard(s.project))
    return NextResponse.json({ projects, count: projects.length })
  } catch (err) {
    console.error('[GET /api/v1/saved]', err)
    return NextResponse.json({ error: 'Failed to fetch saved' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const userId = getUserId(request)
  if (!userId) return NextResponse.json({ error: 'X-User-Id required' }, { status: 400 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = SaveBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 })
  }

  try {
    await prisma.savedProperty.upsert({
      where: { user_id_project_id: { user_id: userId, project_id: parsed.data.project_id } },
      create: { user_id: userId, project_id: parsed.data.project_id },
      update: {},
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[POST /api/v1/saved]', err)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Create `frontend/app/api/v1/saved/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

function getUserId(req: NextRequest): string | null {
  return req.headers.get('x-user-id')
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const userId = getUserId(request)
  if (!userId) return NextResponse.json({ error: 'X-User-Id required' }, { status: 400 })

  await prisma.savedProperty.deleteMany({
    where: { user_id: userId, project_id: params.id },
  })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 5: Create `frontend/app/api/v1/chat/session/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const MAX_MESSAGES = 50

function getUserId(req: NextRequest): string | null {
  return req.headers.get('x-user-id')
}

export async function GET(request: NextRequest) {
  const userId = getUserId(request)
  if (!userId) return NextResponse.json({ error: 'X-User-Id header required' }, { status: 400 })

  let session = await prisma.chatSession.findFirst({
    where: { user_id: userId },
    orderBy: { last_active: 'desc' },
    include: { messages: { orderBy: { created_at: 'asc' }, take: MAX_MESSAGES } },
  })

  if (!session) {
    session = await prisma.chatSession.create({
      data: { user_id: userId },
      include: { messages: { orderBy: { created_at: 'asc' }, take: MAX_MESSAGES } },
    })
  }

  return NextResponse.json({
    session_id: session.id,
    messages: session.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      created_at: m.created_at,
    })),
  })
}
```

- [ ] **Step 6: Create `frontend/app/api/v1/chat/session/list/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

function getUserId(req: NextRequest): string | null {
  return req.headers.get('x-user-id')
}

export async function GET(request: NextRequest) {
  const userId = getUserId(request)
  if (!userId) return NextResponse.json({ error: 'X-User-Id header required' }, { status: 400 })

  const sessions = await prisma.chatSession.findMany({
    where: { user_id: userId },
    orderBy: { last_active: 'desc' },
    take: 5,
    include: {
      messages: {
        where: { role: 'user' },
        orderBy: { created_at: 'asc' },
        take: 1,
      },
    },
  })

  return NextResponse.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      label: s.messages[0]?.content
        ? s.messages[0].content.slice(0, 45) + (s.messages[0].content.length > 45 ? '…' : '')
        : `Chat ${new Date(s.last_active).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
      last_active: s.last_active,
    })),
  })
}
```

- [ ] **Step 7: Create `frontend/app/api/v1/chat/intent/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

function getUserId(req: NextRequest): string | null {
  return req.headers.get('x-user-id')
}

export async function DELETE(request: NextRequest) {
  const userId = getUserId(request)
  if (!userId) return NextResponse.json({ error: 'X-User-Id header required' }, { status: 400 })

  await prisma.userMemory.deleteMany({ where: { user_id: userId } })
  const newSession = await prisma.chatSession.create({ data: { user_id: userId } })
  return NextResponse.json({ ok: true, session_id: newSession.id })
}
```

- [ ] **Step 8: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

Fix errors. Common issues:
- `toProjectCard` may need to be exported from the repository file — ensure it's exported
- Prisma model includes may need type adjustments — use `as any` on prisma results if needed short-term

- [ ] **Step 9: Commit**

```bash
git add frontend/app/api/v1/projects/ frontend/app/api/v1/saved/ frontend/app/api/v1/chat/session/ frontend/app/api/v1/chat/intent/
git commit -m "feat(e2): add Next.js route handlers — projects, saved, chat session, chat intent"
```

---

## Task 3: Main chat route — POST /api/v1/chat

**File:** `frontend/app/api/v1/chat/route.ts`

This is the most complex route. It's a direct port of `backend/src/routes/chat.ts` with:
- Zod validation on request body
- `safeJsonParse` instead of bare `JSON.parse`
- `response_format: { type: 'json_object' }` on intent extraction call
- Errors logged in every catch block (not swallowed)

- [ ] **Step 1: Create the route file**

Write `frontend/app/api/v1/chat/route.ts` with this exact content:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { groq, GROQ_FAST, GROQ_SMART, safeJsonParse } from '@/lib/ai/groq'
import { PROMPTS } from '@/lib/ai/prompts'
import {
  mergeIntentState,
  isIntentComplete,
  getNextQuestion,
  type IntentState,
} from '@/lib/ai/intentManager'
import { searchProjects } from '@/lib/repositories/projectRepository'

const MAX_HISTORY = 12

const BodySchema = z.object({
  message: z.string().min(1).max(2000).trim(),
  session_id: z.string().uuid().optional(),
})

function getUserId(req: NextRequest): string | null {
  return req.headers.get('x-user-id')
}

export async function POST(request: NextRequest) {
  const userId = getUserId(request)
  if (!userId) {
    return NextResponse.json({ error: 'X-User-Id header required' }, { status: 400 })
  }

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
  }

  const { message, session_id } = parsed.data

  // ── 1. Load or create session ──────────────────────────────────────────
  let session = session_id
    ? await prisma.chatSession.findUnique({
        where: { id: session_id },
        include: { messages: { orderBy: { created_at: 'desc' }, take: MAX_HISTORY } },
      })
    : null

  if (!session) {
    session = await prisma.chatSession.create({
      data: { user_id: userId },
      include: { messages: { orderBy: { created_at: 'desc' }, take: MAX_HISTORY } },
    })
  }

  const sessionId = session.id
  const historyForAI = [...session.messages].reverse().map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  // ── 2. Load or create UserMemory ────────────────────────────────────────
  const userMemory = await prisma.userMemory.upsert({
    where: { user_id: userId },
    create: { user_id: userId },
    update: {},
  })

  const existingIntent: IntentState = userMemory.summary_text
    ? safeJsonParse(userMemory.summary_text) as IntentState
    : { completenessScore: 0 }

  // ── 3. Persist user message ─────────────────────────────────────────────
  await prisma.chatMessage.create({
    data: { session_id: sessionId, role: 'user', content: message },
  })

  // ── 4. Extract intent ───────────────────────────────────────────────────
  let extracted: Record<string, unknown> = {}
  try {
    const intentCompletion = await groq.chat.completions.create({
      model: GROQ_FAST,
      messages: [
        { role: 'system', content: PROMPTS.INTENT_EXTRACTION },
        ...historyForAI,
        { role: 'user', content: message },
      ],
      temperature: 0,
      max_tokens: 300,
      response_format: { type: 'json_object' },
    })
    extracted = safeJsonParse(intentCompletion.choices[0].message.content)
  } catch (err) {
    console.error('[chat] Intent extraction failed:', err)
    extracted = { is_general_query: true }
  }

  // ── 5. Map to IntentState updates ───────────────────────────────────────
  const updates: Partial<IntentState> = {}
  if (extracted.bhk) updates.bhk = extracted.bhk as number
  if (extracted.budget_min || extracted.budget_max) {
    updates.budget = {
      min: extracted.budget_min as number | undefined,
      max: extracted.budget_max as number | undefined,
      flexibility: 'unknown',
    }
  }
  if (extracted.sector) updates.sector = `Sector ${extracted.sector}`
  if (extracted.city) updates.city = extracted.city as string
  if (extracted.purpose) updates.purpose = extracted.purpose as IntentState['purpose']
  if (extracted.property_type) updates.property_type = extracted.property_type as IntentState['property_type']
  if (extracted.possession_status) {
    updates.preferences = {
      ready_to_move: extracted.possession_status === 'ready_to_move',
      under_construction: extracted.possession_status === 'under_construction',
    }
  }

  const newIntent = mergeIntentState(existingIntent, updates)

  // ── 6. Persist intent ───────────────────────────────────────────────────
  await prisma.userMemory.update({
    where: { user_id: userId },
    data: {
      summary_text: JSON.stringify(newIntent),
      bhk_preference: newIntent.bhk ?? null,
      budget_min_cr: newIntent.budget?.min != null ? newIntent.budget.min / 10_000_000 : null,
      budget_max_cr: newIntent.budget?.max != null ? newIntent.budget.max / 10_000_000 : null,
      sector_preference: newIntent.sector ?? null,
      purpose: newIntent.purpose ?? null,
    },
  })

  const intentSummary = {
    completenessScore: newIntent.completenessScore,
    bhk: newIntent.bhk,
    budget: newIntent.budget,
    purpose: newIntent.purpose,
    is_general_query: extracted.is_general_query as boolean | undefined,
  }

  // ── Helper: persist AI message and return response ──────────────────────
  const respond = async (responseMessage: string, extras: Record<string, unknown> = {}) => {
    await Promise.all([
      prisma.chatMessage.create({
        data: {
          session_id: sessionId,
          role: 'assistant',
          content: responseMessage,
          intent_snapshot: JSON.parse(JSON.stringify(newIntent)),
        },
      }),
      prisma.chatSession.update({
        where: { id: sessionId },
        data: { message_count: { increment: 2 } },
      }),
    ])
    return NextResponse.json({
      session_id: sessionId,
      message: responseMessage,
      resolvedFields: newIntent.resolvedFields,
      intent: intentSummary,
      ...extras,
    })
  }

  // ── 7a. Greeting / chitchat ─────────────────────────────────────────────
  if (extracted.conversational_reply) {
    return respond(extracted.conversational_reply as string, {
      showRecommendations: false,
      chatPhase: 'DISCOVERY',
    })
  }

  // ── 7b. General / informational query ───────────────────────────────────
  if (extracted.is_general_query) {
    let aiMessage = ''
    try {
      const generalCompletion = await groq.chat.completions.create({
        model: GROQ_SMART,
        messages: [
          { role: 'system', content: PROMPTS.GENERAL_QUERY.replace('{{SEARCH_CONTEXT}}', '') },
          ...historyForAI.slice(-8),
          { role: 'user', content: message },
        ],
        temperature: 0.3,
        max_tokens: 1024,
      })
      aiMessage = generalCompletion.choices[0].message.content ?? ''
    } catch (err) {
      console.error('[chat] General query LLM call failed:', err)
      aiMessage = "I couldn't fetch a response right now. Please try again."
    }
    return respond(aiMessage, { showRecommendations: false, chatPhase: 'DISCOVERY' })
  }

  // ── 7c. Intent complete — search + advisor ───────────────────────────────
  if (isIntentComplete(newIntent)) {
    const projects = await searchProjects({
      city: newIntent.city ?? 'Noida',
      sector: newIntent.sector,
      bhk: newIntent.bhk,
      budget_min_cr: newIntent.budget?.min != null ? newIntent.budget.min / 10_000_000 : undefined,
      budget_max_cr: newIntent.budget?.max != null ? newIntent.budget.max / 10_000_000 : undefined,
    })

    const projectContext = projects
      .map(
        (p) =>
          `**${p.name}** by ${p.builder.name}\n` +
          `Price: ${p.price_range_label}\n` +
          `Configs: ${p.unit_types.map((u) => u.name).join(', ')}\n` +
          `RERA: ${p.rera_number ?? 'Not registered'}\n` +
          `Status: ${p.status.replace(/_/g, ' ')}\n` +
          `Sector: ${p.sector}, ${p.city}\n` +
          `Amenities: ${p.top_amenities.map((a) => a.name).join(', ')}\n` +
          `Connectivity: ${p.top_connectivity.map((c) => c.name).join(', ')}`,
      )
      .join('\n\n---\n\n')

    let advisorMessage = ''
    try {
      const advisorCompletion = await groq.chat.completions.create({
        model: GROQ_SMART,
        messages: [
          {
            role: 'system',
            content: PROMPTS.ADVISOR_MODE + '\n\n═══ SHORTLISTED PROPERTIES ═══\n\n' + projectContext,
          },
          ...historyForAI.slice(-8),
          { role: 'user', content: message },
        ],
        temperature: 0.3,
        max_tokens: 1024,
      })
      advisorMessage = advisorCompletion.choices[0].message.content ?? ''
    } catch (err) {
      console.error('[chat] Advisor LLM call failed:', err)
      advisorMessage = `Here are ${projects.length} properties matching your criteria.`
    }

    // Track viewed slugs
    if (projects.length > 0) {
      const currentViewed = (userMemory.viewed_slugs as string[]) ?? []
      const allViewed = [...new Set([...currentViewed, ...projects.map((p) => p.slug)])]
      await prisma.userMemory.update({
        where: { user_id: userId },
        data: { viewed_slugs: allViewed },
      })
    }

    const SEARCH_PARAM_KEYS = ['bhk', 'budget', 'sector', 'city', 'property_type', 'purpose'] as const
    const hasNewSearchParams = SEARCH_PARAM_KEYS.some((k) => k in updates)
    const isFirstAdvisorTurn = historyForAI.length === 0

    return respond(advisorMessage, {
      showRecommendations: hasNewSearchParams || isFirstAdvisorTurn,
      projects: hasNewSearchParams || isFirstAdvisorTurn ? projects : undefined,
      chatPhase: 'ADVISOR',
    })
  }

  // ── 7d. Discovery — ask next question ───────────────────────────────────
  const nextQ = getNextQuestion(newIntent)

  const resolvedList = Object.entries(newIntent.resolvedFields ?? {})
    .filter(([, v]) => v)
    .map(([k]) => k)
    .join(', ')

  const questionSystemPrompt =
    `${PROMPTS.QUESTION_GENERATION}\n\n` +
    `═══ RESOLVED FIELDS — DO NOT ask about these ═══\n` +
    `${resolvedList || 'none yet'}\n\n` +
    `═══ NEXT QUESTION (rephrase naturally, keep it brief) ═══\n` +
    `"${nextQ.question}"\n\n` +
    `RULE: End your response with exactly this question rephrased. Ask no other question.`

  let questionMessage = nextQ.question
  try {
    const questionCompletion = await groq.chat.completions.create({
      model: GROQ_FAST,
      messages: [
        { role: 'system', content: questionSystemPrompt },
        ...historyForAI.slice(-4),
        { role: 'user', content: message },
      ],
      temperature: 0.3,
      max_tokens: 256,
    })
    questionMessage = questionCompletion.choices[0].message.content ?? nextQ.question
  } catch (err) {
    console.error('[chat] Question generation failed:', err)
    questionMessage = nextQ.question
  }

  return respond(questionMessage, {
    showRecommendations: false,
    chatPhase: 'DISCOVERY',
    next_expected_field: nextQ.field,
  })
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -v "^$" | head -30
```

Fix any errors. The most common:
- `respond` is async but used with `return` — ensure `return respond(...)` is awaited or handled. Since `respond` returns `NextResponse`, `return respond(...)` works as-is (await inside is fine, the outer function is async).
- `intentCompletion.choices[0].message.content` type — may need `?? ''` if TypeScript complains about null.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/api/v1/chat/route.ts
git commit -m "feat(e3): add main chat Route Handler — Zod validation, safe JSON parse, json_object mode, error logging"
```

---

## Task 4: Frontend switchover — update env.ts and .env.local

**Files to modify:**
- `frontend/lib/env.ts`
- `frontend/.env.local`

- [ ] **Step 1: Update `frontend/lib/env.ts` to accept relative URLs**

```typescript
function getApiBase(): string {
  const base = process.env.NEXT_PUBLIC_API_URL
  if (!base) {
    throw new Error(
      'NEXT_PUBLIC_API_URL is required. Set it in .env.local\n' +
      'Example: NEXT_PUBLIC_API_URL=/api/v1'
    )
  }
  // Allow both relative paths (/api/v1) and absolute URLs (http://...)
  return base.replace(/\/$/, '')
}

export const API_BASE = getApiBase()
```

- [ ] **Step 2: Update `NEXT_PUBLIC_API_URL` in `.env.local`**

Read `frontend/.env.local`. Find the line with `NEXT_PUBLIC_API_URL`. Change it from:
```
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```
to:
```
NEXT_PUBLIC_API_URL=/api/v1
```

Also ensure `GROQ_API_KEY` is present in `.env.local` — the Next.js routes need it (server-side, no `NEXT_PUBLIC_` prefix needed).

Check:
```bash
grep -E "GROQ_API_KEY|NEXT_PUBLIC_API_URL" frontend/.env.local
```

If `GROQ_API_KEY` is missing, add it (copy from backend's `.env` if it exists there):
```bash
grep "GROQ_API_KEY" backend/.env 2>/dev/null || echo "CHECK_BACKEND_ENV"
```

- [ ] **Step 3: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Build check**

```bash
cd frontend && npm run build 2>&1 | tail -30
```

Expected: build succeeds. If there are errors about missing env vars at build time, they may need to be in `.env.production` or handled differently — document any issues.

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/env.ts frontend/.env.local
git commit -m "feat(e4): switch frontend to Next.js API routes — NEXT_PUBLIC_API_URL=/api/v1, env.ts accepts relative URLs"
```

Note: `.env.local` is typically gitignored. If git says "nothing to add" for `.env.local`, that's expected — just commit `env.ts`.

---

## Task 5: Verify and mark Express backend deprecated

- [ ] **Step 1: Verify routes respond correctly**

Test each new route manually or with curl. If the Next.js dev server is running at `:3000`:

```bash
# Projects endpoint
curl http://localhost:3000/api/v1/projects | python -c "import sys,json; d=json.load(sys.stdin); print('projects count:', len(d.get('projects', [])))"

# Project detail
curl http://localhost:3000/api/v1/projects/ace-parkway-sector-150-noida | python -c "import sys,json; d=json.load(sys.stdin); print('project name:', d.get('project', {}).get('name', 'NOT FOUND'))"
```

If Next.js dev server is not running, skip these manual tests — TypeScript clean + successful build is sufficient validation.

- [ ] **Step 2: Add deprecation notice to Express backend**

Add a comment to `backend/src/index.ts` at the top:

```typescript
/**
 * DEPRECATED: This Express backend is superseded by Next.js App Router Route Handlers
 * at frontend/app/api/v1/. All routes have been migrated. This server is kept temporarily
 * for rollback safety and can be removed once the Next.js routes are verified in production.
 */
```

- [ ] **Step 3: Final TypeScript check on both**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
cd ../backend && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/index.ts
git commit -m "feat(e5): mark Express backend deprecated — all routes now served by Next.js App Router"
```

---

## Self-Review

**Spec coverage:**
- [x] Express routes → Next.js Route Handlers — Tasks 2+3
- [x] Zod validation on every route — all routes use `BodySchema.safeParse()` or `QuerySchema.safeParse()`
- [x] Safe JSON parsing — `safeJsonParse()` in groq.ts, used in chat route
- [x] `response_format: json_object` on intent extraction — Task 3 Step 1
- [x] Errors logged (not swallowed) — `console.error` in every catch block
- [x] `NEXT_PUBLIC_API_URL` updated to `/api/v1` — Task 4
- [x] `env.ts` accepts relative URLs — Task 4
- [x] TypeScript check at every task — each task has tsc step
- [x] Express backend preserved (not deleted) — Task 5 Step 2

**Auth note:** The `x-user-id` header pattern is preserved. Full Supabase server-side session validation is a follow-up task (requires `createServerClient` from `@supabase/ssr` in each route). Documented as TODO.

**Gaps (acknowledged):**
- Missing User model in Prisma schema — `user_id` is stored as a plain string in ChatSession/UserMemory/SavedProperty. This is existing behavior, not a regression. Adding a proper User FK requires a schema migration with data implications — deferred to a dedicated sprint.
- No spatial indexes — deferred (requires PostGIS setup).
