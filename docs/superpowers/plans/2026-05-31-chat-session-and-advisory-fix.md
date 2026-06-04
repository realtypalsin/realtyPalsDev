# Chat Session & Advisory Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three critical bugs that break AI chat continuity — no conversation history sent to AI, question generator unaware of intent state, advisor follow-ups blind to prior context — and wire the existing ChatSession/ChatMessage Prisma models to persist history across page refreshes.

**Architecture:** Every POST /api/v1/chat call loads the last 12 messages from the user's ChatSession and passes them as context to all Groq calls. The question generator receives a dynamic system prompt suffix that includes resolved fields and the exact next question to rephrase. The UI fetches the current session on mount, restores history from DB, and includes session_id in every request. No schema changes needed — ChatSession and ChatMessage already exist in schema.prisma.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, Prisma ORM, Groq SDK (llama-3.1-8b-instant / llama-3.3-70b-versatile), React state

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `app/api/v1/chat/session/route.ts` | **CREATE** | GET — find or create user's current session, return messages |
| `app/api/v1/chat/intent/route.ts` | **MODIFY** | DELETE — clear intent AND create new session, return session_id |
| `app/api/v1/chat/route.ts` | **REWRITE** | POST — accept session_id, load history, pass to all Groq calls, persist messages |
| `components/DiscoveryContent.tsx` | **MODIFY** | Add sessionId state, load session on mount, pass session_id on every submit |

---

## Task 1: Create GET /api/v1/chat/session

**Files:**
- Create: `app/api/v1/chat/session/route.ts`

- [ ] **Step 1: Create the file**

```typescript
// app/api/v1/chat/session/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const userId = req.headers.get('X-User-Id')
  if (!userId) {
    return NextResponse.json({ error: 'X-User-Id header required' }, { status: 400 })
  }

  let session = await prisma.chatSession.findFirst({
    where: { user_id: userId },
    orderBy: { last_active: 'desc' },
    include: {
      messages: {
        orderBy: { created_at: 'asc' },
        take: 50,
      },
    },
  })

  if (!session) {
    session = await prisma.chatSession.create({
      data: { user_id: userId },
      include: {
        messages: { orderBy: { created_at: 'asc' }, take: 50 },
      },
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

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no new errors related to `app/api/v1/chat/session/route.ts`.

- [ ] **Step 3: Commit**

```bash
git add app/api/v1/chat/session/route.ts
git commit -m "feat: add GET /api/v1/chat/session — find or create user session with message history"
```

---

## Task 2: Update DELETE /api/v1/chat/intent to return new session_id

**Files:**
- Modify: `app/api/v1/chat/intent/route.ts`

- [ ] **Step 1: Replace the file content**

```typescript
// app/api/v1/chat/intent/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function DELETE(req: NextRequest) {
  const userId = req.headers.get('X-User-Id')
  if (!userId) {
    return NextResponse.json({ error: 'X-User-Id header required' }, { status: 400 })
  }

  await prisma.userMemory.deleteMany({ where: { user_id: userId } })

  const newSession = await prisma.chatSession.create({
    data: { user_id: userId },
  })

  return NextResponse.json({ ok: true, session_id: newSession.id })
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/v1/chat/intent/route.ts
git commit -m "feat: DELETE /chat/intent now creates new ChatSession and returns session_id"
```

---

## Task 3: Rewrite POST /api/v1/chat with session persistence and history context

This is the core fix. Every Groq call now receives the last 12 messages as context. The question generator receives a dynamic suffix with resolved fields and the exact next question. Messages are persisted to DB before (user) and after (AI) each turn.

**Files:**
- Modify: `app/api/v1/chat/route.ts`

- [ ] **Step 1: Replace the entire file**

```typescript
// app/api/v1/chat/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { groq, GROQ_FAST, GROQ_SMART } from '@/lib/ai/groq'
import { PROMPTS } from '@/lib/ai/prompts'
import {
  mergeIntentState,
  isIntentComplete,
  getNextQuestion,
  type IntentState,
} from '@/lib/ai/intentManager'
import { searchProjects } from '@/server/repositories/projectRepository'

const MAX_HISTORY = 12

export async function POST(req: NextRequest) {
  const userId = req.headers.get('X-User-Id')
  if (!userId) {
    return NextResponse.json({ error: 'X-User-Id header required' }, { status: 400 })
  }

  let body: { message?: string; session_id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const message = body.message?.trim()
  if (!message) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  // ── 1. Load or create session ─────────────────────────────────────────
  let session = body.session_id
    ? await prisma.chatSession.findUnique({
        where: { id: body.session_id },
        include: {
          messages: {
            orderBy: { created_at: 'desc' },
            take: MAX_HISTORY,
          },
        },
      })
    : null

  if (!session) {
    session = await prisma.chatSession.create({
      data: { user_id: userId },
      include: {
        messages: { orderBy: { created_at: 'desc' }, take: MAX_HISTORY },
      },
    })
  }

  const sessionId = session.id

  // Reverse to chronological order for AI (we fetched desc to get most recent N)
  const historyForAI = [...session.messages].reverse().map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  // ── 2. Load or create UserMemory ──────────────────────────────────────
  const userMemory = await prisma.userMemory.upsert({
    where: { user_id: userId },
    create: { user_id: userId },
    update: {},
  })

  const existingIntent: IntentState = userMemory.summary_text
    ? (JSON.parse(userMemory.summary_text) as IntentState)
    : { completenessScore: 0 }

  // ── 3. Persist user message before AI call ────────────────────────────
  await prisma.chatMessage.create({
    data: { session_id: sessionId, role: 'user', content: message },
  })

  // ── 4. Extract intent from message (with conversation history) ────────
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
    })
    extracted = JSON.parse(intentCompletion.choices[0].message.content ?? '{}')
  } catch {
    extracted = { is_general_query: true }
  }

  // ── 5. Map extracted fields to IntentState updates ────────────────────
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
  if (extracted.property_type)
    updates.property_type = extracted.property_type as IntentState['property_type']
  if (extracted.possession_status) {
    updates.preferences = {
      ready_to_move: extracted.possession_status === 'ready_to_move',
      under_construction: extracted.possession_status === 'under_construction',
    }
  }

  const newIntent = mergeIntentState(existingIntent, updates)

  // ── 6. Persist intent ─────────────────────────────────────────────────
  await prisma.userMemory.update({
    where: { user_id: userId },
    data: {
      summary_text: JSON.stringify(newIntent),
      bhk_preference: newIntent.bhk ?? null,
      budget_min_cr:
        newIntent.budget?.min != null ? newIntent.budget.min / 10_000_000 : null,
      budget_max_cr:
        newIntent.budget?.max != null ? newIntent.budget.max / 10_000_000 : null,
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

  // ── Helper: save AI response and return JSON ──────────────────────────
  const respond = async (
    responseMessage: string,
    extras: Record<string, unknown> = {},
  ) => {
    await Promise.all([
      prisma.chatMessage.create({
        data: {
          session_id: sessionId,
          role: 'assistant',
          content: responseMessage,
          intent_snapshot: newIntent as object,
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

  // ── 7a. Pure greeting / chitchat ──────────────────────────────────────
  if (extracted.conversational_reply) {
    return respond(extracted.conversational_reply as string, {
      showRecommendations: false,
      chatPhase: 'DISCOVERY',
    })
  }

  // ── 7b. General / informational query ────────────────────────────────
  if (extracted.is_general_query) {
    let aiMessage = ''
    try {
      const generalCompletion = await groq.chat.completions.create({
        model: GROQ_SMART,
        messages: [
          {
            role: 'system',
            content: PROMPTS.GENERAL_QUERY.replace('{{SEARCH_CONTEXT}}', ''),
          },
          ...historyForAI.slice(-8),
          { role: 'user', content: message },
        ],
        temperature: 0.3,
        max_tokens: 1024,
      })
      aiMessage = generalCompletion.choices[0].message.content ?? ''
    } catch {
      aiMessage = "I couldn't fetch a response right now. Please try again."
    }

    return respond(aiMessage, {
      showRecommendations: false,
      chatPhase: 'DISCOVERY',
    })
  }

  // ── 7c. Intent complete — search DB + advisor response ────────────────
  if (isIntentComplete(newIntent)) {
    const projects = await searchProjects({
      city: newIntent.city ?? 'Noida',
      sector: newIntent.sector,
      bhk: newIntent.bhk,
      budget_min_cr:
        newIntent.budget?.min != null ? newIntent.budget.min / 10_000_000 : undefined,
      budget_max_cr:
        newIntent.budget?.max != null ? newIntent.budget.max / 10_000_000 : undefined,
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
            content:
              PROMPTS.ADVISOR_MODE +
              '\n\n═══ SHORTLISTED PROPERTIES ═══\n\n' +
              projectContext,
          },
          ...historyForAI.slice(-8),
          { role: 'user', content: message },
        ],
        temperature: 0.3,
        max_tokens: 1024,
      })
      advisorMessage = advisorCompletion.choices[0].message.content ?? ''
    } catch {
      advisorMessage = `Here are ${projects.length} properties matching your criteria.`
    }

    return respond(advisorMessage, {
      showRecommendations: true,
      projects,
      chatPhase: 'ADVISOR',
    })
  }

  // ── 7d. Need more intent — ask next question with intent context ───────
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
  } catch {
    questionMessage = nextQ.question
  }

  return respond(questionMessage, {
    showRecommendations: false,
    chatPhase: 'DISCOVERY',
    next_expected_field: nextQ.field,
  })
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no new errors. If Prisma complains about `intent_snapshot: newIntent as object`, change to `intent_snapshot: newIntent as Record<string, unknown>`.

- [ ] **Step 3: Commit**

```bash
git add app/api/v1/chat/route.ts
git commit -m "feat: wire chat route to ChatSession — pass history to all Groq calls, persist every message, fix question generator context"
```

---

## Task 4: Update DiscoveryContent.tsx for session management

Add `sessionId` state. On mount, fetch `GET /api/v1/chat/session` and restore history. Pass `session_id` in every chat API call. Capture new `session_id` on reset.

**Files:**
- Modify: `components/DiscoveryContent.tsx`

- [ ] **Step 1: Add sessionId state after the existing state declarations (around line 53)**

Find this block:
```typescript
  const [chatPhase, setChatPhase] = useState<'DISCOVERY' | 'SHORTLIST' | 'ADVISOR' | 'PROPERTY_DETAIL' | 'DECISION'>('DISCOVERY');
```

Add directly below it:
```typescript
  const [sessionId, setSessionId] = useState<string | null>(null);
```

- [ ] **Step 2: Replace the initialization useEffect (the one that sets welcome message, around line 270–281)**

Remove this block:
```typescript
  // Initialize with welcome message
  useEffect(() => {
    if (!isInitialized && userId && searchParams.get('new') !== '1') {
      const welcomeMessage: ChatMessage = {
        id: crypto.randomUUID(),
        type: 'ai',
        content: "Hey, I am RealtyPal at your assistance, tell me how can I help you?",
        timestamp: new Date().toISOString(),
      };
      setChatHistory([welcomeMessage]);
      setIsInitialized(true);
    }
  }, [userId, isInitialized, searchParams]);
```

Replace with:
```typescript
  // Initialize: fetch session from server and restore history
  useEffect(() => {
    if (!userId || isInitialized || searchParams.get('new') === '1') return;

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/chat/session`, {
          headers: { 'X-User-Id': userId },
        });
        if (!res.ok) throw new Error('session fetch failed');
        const data = await res.json();

        setSessionId(data.session_id);

        if (data.messages && data.messages.length > 0) {
          const restored: ChatMessage[] = data.messages.map((m: { id: string; role: string; content: string; created_at: string }) => ({
            id: m.id,
            type: m.role === 'user' ? 'user' : 'ai',
            content: m.content,
            timestamp: m.created_at,
          }));
          setChatHistory(restored);
        } else {
          setChatHistory([{
            id: crypto.randomUUID(),
            type: 'ai',
            content: "Hey, I am RealtyPal at your assistance, tell me how can I help you?",
            timestamp: new Date().toISOString(),
          }]);
        }
      } catch {
        setChatHistory([{
          id: crypto.randomUUID(),
          type: 'ai',
          content: "Hey, I am RealtyPal at your assistance, tell me how can I help you?",
          timestamp: new Date().toISOString(),
        }]);
      } finally {
        setIsInitialized(true);
      }
    })();
  }, [userId, isInitialized, searchParams]);
```

- [ ] **Step 3: Update performReset to capture new session_id from DELETE response**

Find this block inside `performReset`:
```typescript
    if (userId) {
      try {
        await fetch(`${API_BASE}/chat/intent`, {
          method: 'DELETE',
          headers: { 'X-User-Id': userId },
        });
      } catch (e) {
        console.error('Failed to reset intent:', e);
      }
    }
```

Replace with:
```typescript
    if (userId) {
      try {
        const res = await fetch(`${API_BASE}/chat/intent`, {
          method: 'DELETE',
          headers: { 'X-User-Id': userId },
        });
        const data = await res.json();
        if (data.session_id) setSessionId(data.session_id);
      } catch (e) {
        console.error('Failed to reset intent:', e);
      }
    }
```

- [ ] **Step 4: Update handleChatSubmit to pass session_id in request body**

Find this line inside `handleChatSubmit`:
```typescript
        body: JSON.stringify({ message: currentInput }),
```

Replace with:
```typescript
        body: JSON.stringify({ message: currentInput, session_id: sessionId }),
```

Also find the response handling block where `data.chatPhase` is checked, and add `session_id` capture right after `if (data.chatPhase) setChatPhase(data.chatPhase);`:
```typescript
      if (data.chatPhase) setChatPhase(data.chatPhase);
      if (data.session_id) setSessionId(data.session_id);
      if (data.next_expected_field !== undefined) setNextExpectedField(data.next_expected_field);
```

- [ ] **Step 5: Update handleQuickReply to pass session_id**

Find this line inside `handleQuickReply`:
```typescript
        body: JSON.stringify({ message, quickReply: { field, value } }),
```

Replace with:
```typescript
        body: JSON.stringify({ message, session_id: sessionId }),
```

Also add `session_id` capture after `if (data.chatPhase) setChatPhase(data.chatPhase);` in `handleQuickReply`:
```typescript
      if (data.chatPhase) setChatPhase(data.chatPhase);
      if (data.session_id) setSessionId(data.session_id);
```

- [ ] **Step 6: Update handleRegenerate to pass session_id**

Find this line inside `handleRegenerate`:
```typescript
        body: JSON.stringify({ message: userMsg }),
```

Replace with:
```typescript
        body: JSON.stringify({ message: userMsg, session_id: sessionId }),
```

- [ ] **Step 7: Type-check**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 8: Commit**

```bash
git add components/DiscoveryContent.tsx
git commit -m "feat: DiscoveryContent restores chat history from server session on mount, passes session_id to all API calls"
```

---

## Task 5: Smoke test the full flow

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Open browser at http://localhost:3000**

Navigate to `/discover`. Open DevTools → Network tab.

- [ ] **Step 3: Verify session init**

On page load, confirm a `GET /api/v1/chat/session` request fires with `X-User-Id` header and returns `{ session_id, messages: [] }` (empty for fresh user).

- [ ] **Step 4: Send first message — sector only**

Type: `Sector 150 Noida`

Confirm:
- Network: `POST /api/v1/chat` body includes `session_id`
- Response: `chatPhase: "DISCOVERY"`, message asks next question (bhk or property type)
- Response includes `resolvedFields: { sector: true, city: true }`

- [ ] **Step 5: Answer follow-up questions until ADVISOR mode**

Continue answering questions (bhk, budget). Confirm each response:
- Has `session_id`
- `resolvedFields` accumulates correctly
- When complete: `chatPhase: "ADVISOR"`, `showRecommendations: true`, `projects` array populated

- [ ] **Step 6: Test context continuity**

In ADVISOR mode, ask: `Tell me more about the first property`

The AI should correctly reference the property from the prior response (it's in `historyForAI` context).

- [ ] **Step 7: Test history persistence**

Refresh the page. Confirm:
- Chat history is restored from DB (all previous messages visible)
- `sessionId` is the same as before refresh

- [ ] **Step 8: Test new chat**

Click the new chat button (+ icon). Confirm:
- Chat history clears
- Network shows `DELETE /api/v1/chat/intent` returning new `session_id`
- Next `POST /api/v1/chat` uses the new `session_id`

---

## Self-Review Notes

**Spec coverage:**
- ✅ GET /api/v1/chat/session — Task 1
- ✅ DELETE returns session_id — Task 2
- ✅ History passed to all Groq calls — Task 3
- ✅ Question generator gets resolved fields + next question — Task 3 (dynamic suffix)
- ✅ Advisor follow-ups get prior property context via history — Task 3 (historyForAI.slice(-8))
- ✅ UI restores history on mount — Task 4
- ✅ session_id threaded through all submit handlers — Task 4

**Known limitations (acceptable for V1):**
- On history restore, `properties` arrays (ProjectCard objects) are not restored — property cards won't re-render for past ADVISOR messages after a refresh. Users need to re-ask. This is acceptable; implementing would require storing ProjectCard JSON in ChatMessage.intent_snapshot.
- `chatPhase` always resets to 'DISCOVERY' on page refresh. Also acceptable.
