# Performance & Session Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 6 layered issues causing chat lag, broken session restoration, and deployment risk.

**Architecture:** All fixes are confined to `frontend/` (Next.js App Router). The deprecated `backend/` folder is deleted. Each task is independently deployable.

**Tech Stack:** Next.js 14, Prisma 5, Groq SDK, Upstash Redis, Supabase PostgreSQL (pgvector), TypeScript

---

## Files Modified / Created

| File | What Changes |
|---|---|
| `frontend/prisma/schema.prisma` | Add `chat_phase` + `last_projects` to `ChatSession` |
| `frontend/app/api/v1/chat/route.ts` | Single-pass streaming (eliminates double LLM call) |
| `frontend/app/api/v1/chat/session/route.ts` | Return `chat_phase` + `last_projects` on GET |
| `frontend/components/DiscoveryContent.tsx` | Restore phase + project cards on session load |
| `frontend/lib/repositories/projectRepository.ts` | Redis cache for `searchProjects()` |
| `frontend/lib/ai/prompts.ts` | Fix tool list (says 3, actually 8 — causes hallucinations) |
| `frontend/next.config.js` | Remove `ignoreBuildErrors` + `ignoreDuringBuilds` |
| `frontend/scripts/add-vector-index.ts` | HNSW index creation script |
| `RUNNING_LOCALLY.md` | Update (remove backend references) |
| `backend/` | Delete entire folder |
| `prisma/` (root) | Delete entire folder |
| `ruvector.db` (root + frontend) | Delete both |

---

## Task 1: Persistent Session Context (Schema + API)

**Goal:** Store `chat_phase` and `last_projects` in `ChatSession` so resumed sessions restore fully.

**Files:**
- Modify: `frontend/prisma/schema.prisma`
- Modify: `frontend/app/api/v1/chat/route.ts` (persistAndDone function)
- Modify: `frontend/app/api/v1/chat/session/route.ts`

- [ ] **Step 1.1: Add columns to ChatSession schema**

Open `frontend/prisma/schema.prisma`. Find the `ChatSession` model (around line 197). Add two fields before the closing `}`:

```prisma
model ChatSession {
  id            String    @id @default(uuid())
  user_id       String?
  guest_token   String?
  title         String?
  message_count Int       @default(0)
  chat_phase    String    @default("DISCOVERY")
  last_projects Json?
  created_at    DateTime  @default(now())
  last_active   DateTime  @updatedAt

  messages ChatMessage[]

  @@index([user_id])
  @@index([guest_token])
  @@map("chat_sessions")
}
```

- [ ] **Step 1.2: Push schema to Supabase DB**

```bash
cd frontend
npx prisma db push
```

Expected output: `Your database is now in sync with your Prisma schema.`

If you get `P1001` (can't reach DB): check `DATABASE_URL` in `frontend/.env` — it must be the pooler URL (port 5432), not the direct URL.

- [ ] **Step 1.3: Update persistAndDone in chat/route.ts**

In `frontend/app/api/v1/chat/route.ts`, find the `persistAndDone` async function (around line 610). Replace the `prisma.chatSession.update` call inside `persistPromises` with one that also saves phase and projects:

```typescript
async function persistAndDone() {
  const persistPromises: Promise<unknown>[] = [
    prisma.chatMessage.create({
      data: { session_id: sessionId, role: 'assistant', content: finalText || '...' },
    }),
    prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        message_count: { increment: 2 },
        chat_phase: chatPhase,
        last_projects: projects.length > 0 ? (projects as unknown as import('@prisma/client').Prisma.JsonArray) : undefined,
      },
    }),
  ]
  // ... rest of function unchanged
```

- [ ] **Step 1.4: Return chat_phase + last_projects from session GET**

Open `frontend/app/api/v1/chat/session/route.ts`. Replace the full file with:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const MAX_MESSAGES = 50

function getUserId(req: NextRequest): string | null {
  return req.headers.get('x-user-id')
}

function formatMessages(messages: Array<{ id: string; role: string; content: string; created_at: Date }>) {
  return messages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    created_at: m.created_at,
  }))
}

export async function GET(request: NextRequest) {
  const userId = getUserId(request)
  if (!userId) return NextResponse.json({ error: 'X-User-Id header required' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const specificId = searchParams.get('id')

  if (specificId) {
    const session = await prisma.chatSession.findFirst({
      where: { id: specificId, user_id: userId },
      include: { messages: { orderBy: { created_at: 'asc' }, take: MAX_MESSAGES } },
    })

    if (session) {
      return NextResponse.json({
        session_id: session.id,
        chat_phase: session.chat_phase ?? 'DISCOVERY',
        last_projects: session.last_projects ?? null,
        messages: formatMessages(session.messages as Parameters<typeof formatMessages>[0]),
      })
    }
  }

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
    chat_phase: session.chat_phase ?? 'DISCOVERY',
    last_projects: session.last_projects ?? null,
    messages: formatMessages(session.messages as Parameters<typeof formatMessages>[0]),
  })
}
```

- [ ] **Step 1.5: Restore phase + cards in DiscoveryContent**

Open `frontend/components/DiscoveryContent.tsx`. Find the session initialization `useEffect` (around line 336). Replace the section that processes `data` from the session API:

```typescript
// Replace this block (around lines 351-373):
//   setSessionId(data.session_id)
//   if (searchParams.get('session')) { ... }
//   if (data.messages && ...) { ... }

// With:
setSessionId(data.session_id)
if (searchParams.get('session')) {
  router.replace('/discover', { scroll: false })
}

// Restore chat phase
if (data.chat_phase === 'ADVISOR') {
  setChatPhase('ADVISOR')
}

// Restore last shortlist (property cards shown at end)
if (Array.isArray(data.last_projects) && data.last_projects.length > 0) {
  setLastShortlist(data.last_projects)
  setShowRecommendations(true)
}

if (data.messages && data.messages.length > 0) {
  const restored: ChatMessage[] = data.messages.map((m: { id: string; role: string; content: string; created_at: string }) => ({
    id: m.id,
    type: m.role === 'user' ? 'user' : 'ai',
    content: m.content,
    timestamp: m.created_at,
  }))
  setChatHistory(restored)
} else {
  setChatHistory([{
    id: crypto.randomUUID(),
    type: 'ai',
    content: "Hey, I am RealtyPal at your assistance, tell me how can I help you?",
    timestamp: new Date().toISOString(),
  }])
}
```

- [ ] **Step 1.6: Manual smoke test**

1. Start dev: `cd frontend && npm run dev`
2. Open http://localhost:3000, log in, ask for "3BHK in Sector 150 Noida under 2 crore"
3. Property cards appear — this is chatPhase=ADVISOR with lastShortlist populated
4. Copy the URL session ID or use sidebar recent chat
5. Hard-refresh (Ctrl+Shift+R) — cards should still appear
6. Click a recent chat in sidebar — property cards from that session should restore

- [ ] **Step 1.7: Commit**

```bash
cd C:\Users\Furqan\Desktop\RealtyPalsxElite
git add frontend/prisma/schema.prisma frontend/app/api/v1/chat/route.ts frontend/app/api/v1/chat/session/route.ts frontend/components/DiscoveryContent.tsx
git commit -m "feat(session): persist chat_phase + last_projects — restore property cards on session load"
```

---

## Task 2: Single-Pass Streaming Chat (Eliminate Double LLM Call)

**Goal:** For non-tool messages (~60% of traffic), stream tokens directly from the first LLM call instead of making a second call. Cuts TTFT in half for those messages.

**Files:**
- Modify: `frontend/app/api/v1/chat/route.ts`
- Modify: `frontend/lib/ai/prompts.ts` (fix tool count mismatch that causes hallucinations)

- [ ] **Step 2.1: Fix system prompt tool count**

Open `frontend/lib/ai/prompts.ts`. Find the line:

```
You have EXACTLY THREE tools. No others exist. Never attempt to call any other tool:
1. **search_properties** — search the property database (call when user gives location + any other detail)
2. **search_web** — real-time web search (builder news, RERA status, market trends, any current info)
3. **get_commute_time** — driving/transit time between two locations
```

Replace with:

```
You have EXACTLY EIGHT tools. No others exist. Never attempt to call any other tool:
1. **search_properties** — search the property database (call when user gives location + any other detail)
2. **search_web** — real-time web search (builder news, RERA status, market trends, any current info)
3. **get_commute_time** — driving/transit time between two locations
4. **calculate_emi** — monthly EMI, total interest, total payment for a home loan
5. **calculate_stamp_duty** — UP stamp duty and registration charges
6. **calculate_gst** — GST on property purchase (under-construction vs ready-to-move)
7. **get_area_info** — background info about a Noida sector from Wikipedia
8. **read_rera_page** — fetch live RERA registration details from UP-RERA portal

Also remove: "ALL calculations (EMI, stamp duty, GST, loan eligibility) must be done IN YOUR TEXT RESPONSE"
```

Replace the full sentence that says calculations must be done in text with:
```
Use the calculation tools (calculate_emi, calculate_stamp_duty, calculate_gst) when the user asks for specific numbers — they return precise formatted results.
```

- [ ] **Step 2.2: Refactor the streaming path in chat/route.ts**

This is the core change. Replace the entire `start(controller)` async function body in the `ReadableStream` constructor. The new version uses a single streaming first call; for non-tool paths it streams directly to the user without a second API call.

Replace everything from `let finalText = ''` through the closing `}` of the `try` block (before `catch`) with:

```typescript
let finalText = ''
let projects: ProjectCard[] = []
let chatPhase: 'DISCOVERY' | 'ADVISOR' = 'DISCOVERY'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let firstMsgForMemory: any = null

try {
  // ── Single-pass: stream from first call. Forward text directly; buffer tool calls. ──
  const firstStream = await groq.chat.completions.create({
    model: GROQ_SMART,
    messages: [{ role: 'system', content: systemPrompt }, ...chatMessages],
    tools: TOOLS,
    tool_choice: 'auto',
    temperature: 0,
    max_tokens: 1024,
    stream: true as const,
  })

  let toolCallId = ''
  let toolCallName = ''
  let toolCallArgs = ''
  let isToolCall = false

  for await (const chunk of firstStream) {
    const delta = chunk.choices[0]?.delta
    if (!delta) continue

    if (delta.tool_calls?.length) {
      isToolCall = true
      const tc = delta.tool_calls[0]
      if (tc.id) toolCallId = tc.id
      if (tc.function?.name) toolCallName += tc.function.name
      if (tc.function?.arguments) toolCallArgs += tc.function.arguments
    } else if (delta.content) {
      finalText += delta.content
      send({ type: 'text', delta: delta.content })
    }
  }

  // Hallucination guard
  if (isToolCall && !KNOWN_TOOL_NAMES.has(toolCallName)) {
    console.warn(`[chat] ⚠ hallucinated tool ignored: "${toolCallName}" — falling back to direct stream`)
    await saveUserMsg
    const fallbackStream = await getSmartClient().chat.completions.create({
      model: getSmartModel(),
      messages: [{ role: 'system', content: systemPrompt }, ...chatMessages],
      temperature: 0.3,
      max_tokens: 1024,
      stream: true as const,
    })
    finalText = ''
    for await (const chunk of fallbackStream) {
      const delta = chunk.choices[0]?.delta?.content
      if (delta) { finalText += delta; send({ type: 'text', delta }) }
    }
    await persistAndDone()
    return
  }

  // ── No tool — text was already streamed above ─────────────────────────────
  if (!isToolCall) {
    await saveUserMsg
    await persistAndDone()
    return
  }

  // ── Tool path: reconstruct message, execute tool, stream second response ──
  console.log(`[chat] 🔧 tool=${toolCallName} args=${toolCallArgs.slice(0, 200)}`)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const secondMessages: any[] = [
    { role: 'system', content: systemPrompt },
    ...chatMessages,
    {
      role: 'assistant',
      content: null,
      tool_calls: [{
        id: toolCallId,
        type: 'function',
        function: { name: toolCallName, arguments: toolCallArgs },
      }],
    },
  ]

  // Store for memory extraction (same pattern as before)
  firstMsgForMemory = {
    choices: [{
      message: {
        tool_calls: [{
          function: { name: toolCallName, arguments: toolCallArgs },
        }],
      },
    }],
  }

  if (toolCallName === 'search_properties') {
    send({ type: 'searching' })

    let filters: SearchFilters = {}
    try {
      const raw = JSON.parse(toolCallArgs) as Record<string, unknown>
      filters = coerceFilters(raw)
    } catch { /* ok */ }

    console.log(`[chat] 🔍 search_properties filters:`, JSON.stringify(filters))

    const [, searchResults] = await Promise.all([
      saveUserMsg,
      searchProjects(filters, message),
    ])
    projects = searchResults
    chatPhase = 'ADVISOR'

    console.log(`[chat] 📦 found ${projects.length} project(s): ${projects.map(p => p.slug).join(', ')}`)

    const toolResult =
      projects.length === 0
        ? 'No properties found. Tell the user we have limited inventory and ask if they want to broaden their search.'
        : formatProjects(projects)

    secondMessages.push({ role: 'tool', tool_call_id: toolCallId, content: toolResult })

  } else if (toolCallName === 'search_web') {
    send({ type: 'searching' })

    let webQuery = ''
    try { webQuery = JSON.parse(toolCallArgs).query as string } catch { /* ok */ }

    console.log(`[chat] 🌐 search_web query="${webQuery}"`)

    const webCacheKey = makeKey('websearch', webQuery.toLowerCase().slice(0, 120))
    let webContext = await getCached<string>(webCacheKey)

    if (!webContext) {
      const [, webResult] = await Promise.all([
        saveUserMsg,
        tavilySearch(webQuery, 3),
      ])
      webContext = formatTavilyContext(webResult.answer, webResult.results) || ''
      console.log(`[chat] 🌐 web result src=${webResult.source} results=${webResult.results.length} cached=false`)
      if (webContext) await setCached(webCacheKey, webContext, 60 * 60 * 24)
    } else {
      console.log(`[chat] 🌐 web result cached=true`)
      await saveUserMsg
    }

    secondMessages.push({
      role: 'tool',
      tool_call_id: toolCallId,
      content: webContext || 'No current information found for this query. Answer from your training knowledge.',
    })

  } else if (toolCallName === 'get_commute_time') {
    send({ type: 'searching' })

    let origin = '', destination = ''
    try {
      const args = JSON.parse(toolCallArgs)
      origin = args.origin as string
      destination = args.destination as string
    } catch { /* ok */ }

    console.log(`[chat] 🗺 commute origin="${origin}" → dest="${destination}"`)

    const commuteKey = makeKey('commute', origin.toLowerCase(), destination.toLowerCase())
    let commuteData = await getCached<object>(commuteKey)

    if (!commuteData) {
      const [, result] = await Promise.all([saveUserMsg, getCommuteTime(origin, destination)])
      if (result) {
        commuteData = result
        await setCached(commuteKey, result, 60 * 60 * 6)
      }
    } else {
      await saveUserMsg
    }

    secondMessages.push({
      role: 'tool',
      tool_call_id: toolCallId,
      content: commuteData
        ? JSON.stringify(commuteData)
        : `Could not calculate commute from "${origin}" to "${destination}". Share approximate distance/travel time from general knowledge.`,
    })

  } else if (toolCallName === 'calculate_emi') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let args: any = { principal_cr: 1, annual_rate: 8.5, tenure_years: 20 }
    try { Object.assign(args, JSON.parse(toolCallArgs)) } catch { /* ok */ }
    console.log(`[chat] 🧮 calculate_emi principal=${args.principal_cr}Cr rate=${args.annual_rate}% tenure=${args.tenure_years}yr`)
    const r = calculateEmi(Number(args.principal_cr), Number(args.annual_rate), Number(args.tenure_years))
    const toolResult = [
      `Monthly EMI: ${formatInr(r.emi_monthly)}`,
      `Loan amount: ${formatInr(r.principal)} @ ${r.annual_rate}% p.a. for ${r.tenure_months / 12} years`,
      `Total payment: ${formatInr(r.total_payment)}`,
      `Total interest: ${formatInr(r.total_interest)}`,
    ].join('\n')
    await saveUserMsg
    secondMessages.push({ role: 'tool', tool_call_id: toolCallId, content: toolResult })

  } else if (toolCallName === 'calculate_stamp_duty') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let args: any = { price_cr: 1, buyer_gender: 'male' }
    try { Object.assign(args, JSON.parse(toolCallArgs)) } catch { /* ok */ }
    const r = calculateStampDuty(Number(args.price_cr), args.buyer_gender ?? 'male')
    const toolResult = [
      `Stamp Duty (${r.stamp_duty_rate}%): ${formatInr(r.stamp_duty)}`,
      `Registration (1%): ${formatInr(r.registration)}`,
      `Total govt charges: ${formatInr(r.total_charges)}`,
      `Note: ${r.note}`,
    ].join('\n')
    await saveUserMsg
    secondMessages.push({ role: 'tool', tool_call_id: toolCallId, content: toolResult })

  } else if (toolCallName === 'calculate_gst') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let args: any = { price_cr: 1, status: 'under_construction', carpet_sqm: 0 }
    try { Object.assign(args, JSON.parse(toolCallArgs)) } catch { /* ok */ }
    const r = calculateGst(Number(args.price_cr), args.status, Number(args.carpet_sqm ?? 0))
    const toolResult = [
      `GST (${r.gst_rate}%): ${formatInr(r.gst_amount)}`,
      `Category: ${r.category.replace('_', ' ')}`,
      `Note: ${r.note}`,
    ].join('\n')
    await saveUserMsg
    secondMessages.push({ role: 'tool', tool_call_id: toolCallId, content: toolResult })

  } else if (toolCallName === 'get_area_info') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let args: any = { sector: 'Sector 150', city: 'Noida' }
    try { Object.assign(args, JSON.parse(toolCallArgs)) } catch { /* ok */ }
    const [, wikiResult] = await Promise.all([saveUserMsg, getAreaInfo(args.sector, args.city)])
    const toolResult = wikiResult
      ? `${wikiResult.title}: ${wikiResult.extract}\nSource: ${wikiResult.url}`
      : `No Wikipedia article found for ${args.sector}, ${args.city}. Answer from your knowledge of Noida.`
    secondMessages.push({ role: 'tool', tool_call_id: toolCallId, content: toolResult })

  } else if (toolCallName === 'read_rera_page') {
    send({ type: 'searching' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let args: any = {}
    try { Object.assign(args, JSON.parse(toolCallArgs)) } catch { /* ok */ }
    const reraUrl: string = args.rera_url || (args.rera_number
      ? `https://www.up-rera.in/projects?project_search=${encodeURIComponent(args.rera_number)}`
      : 'https://www.up-rera.in')
    const [, reraContent] = await Promise.all([saveUserMsg, jinaRead(reraUrl, 2000)])
    const toolResult = reraContent
      ? `RERA page for ${args.rera_number || 'search'}:\n${reraContent}`
      : `Could not fetch RERA page. Advise user to visit https://www.up-rera.in directly.`
    secondMessages.push({ role: 'tool', tool_call_id: toolCallId, content: toolResult })
  }

  // ── Second pass: stream the advisor response ──────────────────────────────
  const streamResp = await getSmartClient().chat.completions.create({
    model: getSmartModel(),
    messages: secondMessages,
    temperature: 0.3,
    max_tokens: 1024,
    stream: true as const,
  })

  for await (const chunk of streamResp) {
    const delta = chunk.choices[0]?.delta?.content
    if (delta) { finalText += delta; send({ type: 'text', delta }) }
  }

  await persistAndDone()
```

Then update `persistAndDone` to use `firstMsgForMemory` instead of `firstCompletionForMemory`:

```typescript
async function persistAndDone() {
  const persistPromises: Promise<unknown>[] = [
    prisma.chatMessage.create({
      data: { session_id: sessionId, role: 'assistant', content: finalText || '...' },
    }),
    prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        message_count: { increment: 2 },
        chat_phase: chatPhase,
        last_projects: projects.length > 0 ? (projects as unknown as import('@prisma/client').Prisma.JsonArray) : undefined,
      },
    }),
  ]

  if (projects.length > 0) {
    let filters: SearchFilters = {}
    try {
      const args = firstMsgForMemory?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments
      if (args) filters = coerceFilters(JSON.parse(args) as Record<string, unknown>)
    } catch { /* ok */ }

    const newViewedSlugs = projects.map((p) => p.slug)
    const existingViewed = (userMemoryResult?.viewed_slugs as string[]) ?? []
    const mergedViewed = [...new Set([...existingViewed, ...newViewedSlugs])]

    const memoryUpdate: Record<string, unknown> = { viewed_slugs: mergedViewed }
    if (filters.bhk)            memoryUpdate.bhk_preference     = filters.bhk
    if (filters.budget_min_cr)  memoryUpdate.budget_min_cr      = filters.budget_min_cr
    if (filters.budget_max_cr)  memoryUpdate.budget_max_cr      = filters.budget_max_cr
    if (filters.sector)         memoryUpdate.sector_preference   = filters.sector

    console.log(`[chat] 💾 memory update: ${Object.keys(memoryUpdate).join(', ')} | viewed=${mergedViewed.length} slugs`)

    persistPromises.push(
      prisma.userMemory.upsert({
        where: { user_id: userId! },
        create: { user_id: userId!, ...memoryUpdate },
        update: memoryUpdate,
      }).catch((e) => console.error('[chat] ❌ memory upsert failed:', e)),
    )
  }

  await Promise.all(persistPromises)
  console.log(`[chat] ✅ done in ${Date.now() - t0}ms | phase=${chatPhase} projects=${projects.length} chars=${finalText.length}`)

  send({
    type: 'done',
    data: {
      session_id: sessionId,
      showRecommendations: projects.length > 0,
      projects: projects.length > 0 ? projects : undefined,
      chatPhase,
    },
  })
}
```

- [ ] **Step 2.3: Remove unused `firstCompletionForMemory` variable**

In `chat/route.ts`, remove the line:
```typescript
let firstCompletionForMemory: any = null
```
It's been replaced by `firstMsgForMemory`.

- [ ] **Step 2.4: Verify TS compiles**

```bash
cd frontend
npx tsc --noEmit
```

Expected: no output (exit 0). If errors, fix them before continuing.

- [ ] **Step 2.5: Manual smoke test**

With `npm run dev` running:
1. Open http://localhost:3000, log in
2. Send a general knowledge question: "What is RERA?" — should get response with NO "searching..." indicator, noticeably faster TTFT
3. Send: "Show me 3BHK in Sector 150 under 2 crore" — should show "searching..." then property cards
4. Send: "What is the EMI for 1.5 crore at 8.5% for 20 years?" — should call calculate_emi tool and show formatted result
5. Watch browser Network tab — for case 2, you'll see 2 API calls to Groq; for case 1, only 1 call

- [ ] **Step 2.6: Commit**

```bash
cd C:\Users\Furqan\Desktop\RealtyPalsxElite
git add frontend/app/api/v1/chat/route.ts frontend/lib/ai/prompts.ts
git commit -m "perf(chat): single-pass streaming — direct stream for non-tool messages, fix tool count in system prompt"
```

---

## Task 3: HNSW Vector Index on Embeddings

**Goal:** Add an HNSW index so vector similarity search is O(log n) instead of O(n) full table scan.

**Files:**
- Create: `frontend/scripts/add-vector-index.ts`

- [ ] **Step 3.1: Create the index script**

Create `frontend/scripts/add-vector-index.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Adding HNSW index on projects.embedding...')

  // Enable pgvector extension first (idempotent)
  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector`)

  // HNSW index — m=16 ef_construction=64 are standard defaults
  // Cosine distance matches the <=> operator used in searchProjects
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS projects_embedding_hnsw_idx
    ON projects
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64)
  `)

  console.log('✓ HNSW index created (or already exists)')

  // Verify
  const result = await prisma.$queryRaw<Array<{ indexname: string }>>`
    SELECT indexname FROM pg_indexes
    WHERE tablename = 'projects' AND indexname = 'projects_embedding_hnsw_idx'
  `
  if (result.length > 0) {
    console.log('✓ Verified: index is present in pg_indexes')
  } else {
    console.error('✗ Index NOT found — check pgvector version (needs ≥ 0.5.0)')
    process.exit(1)
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 3.2: Run the script**

```bash
cd frontend
npx tsx scripts/add-vector-index.ts
```

Expected output:
```
Adding HNSW index on projects.embedding...
✓ HNSW index created (or already exists)
✓ Verified: index is present in pg_indexes
```

If you get `type "vector" does not exist`: Supabase's pgvector extension isn't enabled on the project. Enable it in Supabase Dashboard → Database → Extensions → search "vector" → enable.

If you get `access method "hnsw" does not exist`: pgvector version is < 0.5.0. Supabase should have 0.7+. Check Supabase dashboard.

- [ ] **Step 3.3: Commit**

```bash
cd C:\Users\Furqan\Desktop\RealtyPalsxElite
git add frontend/scripts/add-vector-index.ts
git commit -m "perf(db): HNSW index on projects.embedding for fast vector similarity search"
```

---

## Task 4: Redis Cache for Property Search

**Goal:** Cache `searchProjects()` results in Redis. Common queries (3BHK Sector 150 under 2Cr) return instantly on repeat within 2 hours.

**Files:**
- Modify: `frontend/lib/repositories/projectRepository.ts`

- [ ] **Step 4.1: Add cache wrapper to searchProjects**

Open `frontend/lib/repositories/projectRepository.ts`. Add the Redis imports at the top:

```typescript
import { getCached, setCached, makeKey } from '@/lib/redis'
```

Then wrap the `searchProjects` function body with a cache check. Add this at the very START of the `searchProjects` function body (before the `if (isVagueQuery(...))` check):

```typescript
export async function searchProjects(
  filters: SearchFilters,
  userQuery?: string,
): Promise<ProjectCard[]> {
  // ── Redis cache (2-hour TTL) ────────────────────────────────────────────
  const cacheKey = makeKey(
    'search',
    filters.city ?? 'noida',
    filters.sector ?? '',
    String(filters.bhk ?? ''),
    String(filters.budget_min_cr ?? ''),
    String(filters.budget_max_cr ?? ''),
    String(filters.possession_year_max ?? ''),
    (userQuery ?? '').toLowerCase().slice(0, 60).replace(/\s+/g, '-'),
  )

  const cached = await getCached<ProjectCard[]>(cacheKey)
  if (cached) {
    console.log(`[repo] 🗄 search cache hit key=${cacheKey.slice(0, 80)}`)
    return cached
  }

  // ... rest of function unchanged, but add cache write before each return:
```

Before each `return` statement in `searchProjects`, add the cache write:

```typescript
// Before: return ordered.slice(0, 6).map(toProjectCard)
const vectorResults = ordered.slice(0, 6).map(toProjectCard)
await setCached(cacheKey, vectorResults, 60 * 60 * 2)
return vectorResults
```

```typescript
// Before: return cards.slice(0, 6)
const finalResults = cards.slice(0, 6)
await setCached(cacheKey, finalResults, 60 * 60 * 2)
return finalResults
```

```typescript
// Before each ranked return:
const rankedJina = ranked.map((r) => cards[r.index]).filter(Boolean) as ProjectCard[]
await setCached(cacheKey, rankedJina, 60 * 60 * 2)
return rankedJina
```

```typescript
const rankedCohere = ranked.map((r) => cards[r.index]).filter(Boolean) as ProjectCard[]
await setCached(cacheKey, rankedCohere, 60 * 60 * 2)
return rankedCohere
```

Also add before the `if (cards.length === 0) return []` check:
```typescript
if (cards.length === 0) {
  await setCached(cacheKey, [], 60 * 30) // cache empty results for 30 min
  return []
}
```

- [ ] **Step 4.2: Verify TS compiles**

```bash
cd frontend
npx tsc --noEmit
```

Expected: no output (exit 0).

- [ ] **Step 4.3: Manual test**

1. Run dev server, ask "3BHK in Sector 150 Noida" — first time should be normal speed
2. Ask the same query again — second time should be visibly faster (cache hit logged in console)
3. Check console: `[repo] 🗄 search cache hit key=search:noida:sector-150:3:...`

- [ ] **Step 4.4: Commit**

```bash
cd C:\Users\Furqan\Desktop\RealtyPalsxElite
git add frontend/lib/repositories/projectRepository.ts
git commit -m "perf(cache): Redis 2h TTL on searchProjects — repeat queries return instantly"
```

---

## Task 5: Remove ignoreBuildErrors (TypeScript Safety)

**Goal:** Enable TypeScript and ESLint build checks so bugs can't silently ship to production.

**Files:**
- Modify: `frontend/next.config.js`

- [ ] **Step 5.1: Verify zero TS errors first**

```bash
cd frontend
npx tsc --noEmit
```

Expected: zero output, exit code 0. If you see errors, fix them before continuing.

- [ ] **Step 5.2: Remove the flags**

Open `frontend/next.config.js`. Remove the `eslint` and `typescript` override blocks entirely:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // react-leaflet v5 + leaflet are ESM-only; Next.js needs explicit transpilation
  transpilePackages: ['leaflet', 'react-leaflet'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'maps.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'unpkg.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.in',
      },
    ],
  },
}

module.exports = nextConfig
```

- [ ] **Step 5.3: Verify build still works**

```bash
cd frontend
npm run build
```

Expected: build completes successfully with no type errors. If errors appear, fix them and re-run.

- [ ] **Step 5.4: Commit**

```bash
cd C:\Users\Furqan\Desktop\RealtyPalsxElite
git add frontend/next.config.js
git commit -m "chore: remove ignoreBuildErrors — TS and ESLint checks now enforced in CI/build"
```

---

## Task 6: Delete Deprecated Files (Cleanup)

**Goal:** Remove the deprecated `backend/` folder, root-level `prisma/`, and SQLite stray files. Update docs.

**Files:**
- Delete: `backend/` (entire folder)
- Delete: `prisma/` (root-level, 3-file duplicate)
- Delete: `ruvector.db` (root)
- Delete: `frontend/ruvector.db`
- Modify: `RUNNING_LOCALLY.md`

- [ ] **Step 6.1: Delete deprecated folders and files**

```bash
cd C:\Users\Furqan\Desktop\RealtyPalsxElite
rm -rf backend/
rm -rf prisma/
rm -f ruvector.db
rm -f frontend/ruvector.db
```

PowerShell equivalent (if bash not available):
```powershell
Remove-Item -Recurse -Force backend
Remove-Item -Recurse -Force prisma
Remove-Item -Force ruvector.db
Remove-Item -Force frontend\ruvector.db
```

- [ ] **Step 6.2: Update RUNNING_LOCALLY.md**

Replace the full contents of `RUNNING_LOCALLY.md` with:

```markdown
# RealtyPals — Local Development Guide

## Repository Layout

```
RealtyPalsxElite/
├── frontend/        ← Next.js app (port 3000) — THE ONLY SERVER
│   ├── app/              # pages + API routes (chat, session, projects, sectors)
│   ├── components/       # React components
│   ├── lib/              # AI clients, Redis, Google Maps, calculators
│   ├── types/            # TypeScript types
│   ├── public/           # static assets
│   ├── prisma/           # schema + seed data
│   ├── scripts/          # DB utilities (vector index, embeddings, seed)
│   ├── package.json
│   ├── next.config.js
│   └── .env              # all secrets (gitignored)
│
├── CLAUDE.md        ← AI assistant context (product rules)
├── RUNNING_LOCALLY.md
└── .gitignore
```

All API routes live inside `frontend/app/api/v1/`. No separate Express backend.

---

## Prerequisites

- Node.js 18+
- npm 9+

---

## Setup

```bash
cd frontend
npm install
```

Create `frontend/.env` if missing (gitignored, contains real secrets):
```
NEXT_PUBLIC_API_URL=/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_URL=<supabase-pooler-connection-string>
DIRECT_URL=<supabase-direct-connection-string>
NEXT_PUBLIC_SUPABASE_URL=<supabase-url>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<anon-key>
GROQ_API_KEY=<groq-key>
UPSTASH_REDIS_URL=<upstash-url>
UPSTASH_REDIS_TOKEN=<upstash-token>
GOOGLE_MAPS_API_KEY=<google-maps-key>
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<same-key>
```

---

## Running Locally

```bash
cd frontend
npm run dev
```

Expected:
```
▲ Next.js 14.2.5
- Local: http://localhost:3000
```

Open http://localhost:3000 in browser. That's it — single terminal, single server.

---

## Database Commands

All run from `frontend/`:

```bash
# Push schema changes to Supabase
npx prisma db push

# Regenerate Prisma client after schema changes
npx prisma generate

# Seed property data
npm run db:seed

# Add HNSW vector index (run once after seeding with embeddings)
npx tsx scripts/add-vector-index.ts
```

---

## Test the Chat Flow

1. Open http://localhost:3000 → log in
2. Ask: `I'm looking for a 3BHK flat in Sector 150 Noida under 2 crore`
3. Property cards appear (ADVISOR mode)
4. Hard-refresh → cards still visible (session restore works)
5. Click a recent chat in sidebar → same session with cards resumes

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `GROQ_API_KEY is not set` | Check `frontend/.env` |
| Empty chat history on refresh | DB connection issue — check `DATABASE_URL` in `frontend/.env` |
| No property cards | DB needs seed data: `npm run db:seed` |
| Port conflict | `npx kill-port 3000` |
| P1001 DB connection error | Use session-mode pooler URL (port 5432) in DATABASE_URL |
```

- [ ] **Step 6.3: Verify frontend still starts**

```bash
cd frontend
npm run dev
```

Expected: starts on port 3000 with no errors.

- [ ] **Step 6.4: Commit**

```bash
cd C:\Users\Furqan\Desktop\RealtyPalsxElite
git add RUNNING_LOCALLY.md
git status  # verify backend/ and prisma/ show as deleted
git add -u  # stage all deletions
git commit -m "chore: delete deprecated backend/ + root prisma/ + ruvector.db stray files — frontend is now sole server"
```

---

## Deployment Readiness Notes

When deploying to Vercel (or any host), these are the only env vars needed:

```
NEXT_PUBLIC_API_URL=/api/v1
NEXT_PUBLIC_APP_URL=https://your-domain.com
DATABASE_URL=<supabase-pooler-url>          # session mode, port 5432
DIRECT_URL=<supabase-direct-url>            # for migrations only
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
GROQ_API_KEY=...
CEREBRAS_API_KEY=...
UPSTASH_REDIS_URL=...
UPSTASH_REDIS_TOKEN=...
GOOGLE_MAPS_API_KEY=...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
JINA_API_KEY=...
COHERE_API_KEY=...
TAVILY_API_KEY=...
WAQI_TOKEN=...
CHAT_PROVIDER=groq
```

Run `npx tsx scripts/add-vector-index.ts` once after first deploy (one-time DB setup).

The `DIRECT_URL` is only used by `prisma migrate deploy` — safe to omit from Vercel env if you push schema changes locally before deploys.
```
