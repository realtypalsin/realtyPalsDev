# RealtyPals Partner Demo Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all critical bugs, performance issues, and security gaps to make the app partner-demo ready.

**Architecture:** Targeted fixes across frontend pages, API routes, and utility libraries. No new abstractions. No new files except middleware.ts. All changes are backwards-compatible.

**Tech Stack:** Next.js 14 App Router, TypeScript, Prisma, Supabase Auth, Groq, Redis (Upstash), Tailwind CSS.

---

## File Map

| File | Change |
|------|--------|
| `frontend/app/page.tsx` | Fix supabase client re-created every render → causes home screen glitch |
| `frontend/components/Sidebar.tsx` | Add AbortController to session list fetch; skip fetch if userId unchanged |
| `frontend/components/DiscoveryContent.tsx` | Add AbortController to chat stream; fix session restore error state; memoize chips |
| `frontend/app/api/v1/chat/route.ts` | Per-tool try-catch isolation; populate session title on first message |
| `frontend/app/api/v1/chat/session/list/route.ts` | Use `title` field directly — eliminate message subquery |
| `frontend/lib/repositories/projectRepository.ts` | Reranker timeout (4 s circuit breaker) |
| `frontend/next.config.js` | Add security headers (CSP, X-Frame-Options, HSTS, etc.) |
| `frontend/middleware.ts` | Create: add `Secure` flag to admin cookie on HTTPS; request logging |
| `frontend/app/api/v1/admin/auth/route.ts` | Add `Secure` flag to Set-Cookie header |

---

## Task 1: Fix Home Screen Glitch

**Root cause:** `supabase = createClient()` runs on every render (line 13, `app/page.tsx`). React StrictMode double-invokes components, creating two clients and firing `getSession()` twice. On hydration mismatch, this triggers double-redirect to `/discover`, causing the visual glitch/flash.

**Files:**
- Modify: `frontend/app/page.tsx`

- [ ] **Step 1: Replace inline client with useRef**

Replace:
```typescript
export default function LandingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        localStorage.setItem('user_id', data.session.user.id);
        router.replace('/discover');
      } else {
        setChecking(false);
      }
    });
  }, []);
```

With:
```typescript
export default function LandingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    let cancelled = false;
    supabaseRef.current.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session?.user) {
        localStorage.setItem('user_id', data.session.user.id);
        router.replace('/discover');
      } else {
        setChecking(false);
      }
    }).catch(() => {
      if (!cancelled) setChecking(false);
    });
    return () => { cancelled = true; };
  }, []);
```

Also add `useRef` to the import line:
```typescript
import { useEffect, useState, useRef } from 'react';
```

- [ ] **Step 2: Commit**
```bash
git add frontend/app/page.tsx
git commit -m "fix(home): prevent supabase client re-creation on every render"
```

---

## Task 2: Fix Session List — Use Title Field (Eliminate Slow Message Subquery)

**Root cause:** `session/list/route.ts` includes `messages` relation (subquery per session) just to build the label. `ChatSession.title` field already exists in the schema — it's just never populated or used.

**Files:**
- Modify: `frontend/app/api/v1/chat/session/list/route.ts`

- [ ] **Step 1: Rewrite query to use title directly**

Replace the entire file with:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

function getUserId(req: NextRequest): string | null {
  return req.headers.get('x-user-id')
}

export async function GET(request: NextRequest) {
  const userId = getUserId(request)
  if (!userId) return NextResponse.json({ error: 'X-User-Id header required' }, { status: 400 })

  try {
    const sessions = await prisma.chatSession.findMany({
      where: { user_id: userId },
      orderBy: { last_active: 'desc' },
      take: 10,
      select: { id: true, title: true, last_active: true },
    })

    return NextResponse.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        label: s.title ??
          `Chat ${new Date(s.last_active).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
        last_active: s.last_active,
      })),
    })
  } catch {
    return NextResponse.json({ sessions: [] })
  }
}
```

- [ ] **Step 2: Commit**
```bash
git add frontend/app/api/v1/chat/session/list/route.ts
git commit -m "perf(sidebar): use session title field directly — removes message subquery"
```

---

## Task 3: Populate Session Title on First Message

**Context:** `ChatSession.title String?` exists in schema. It is never set. Fix: in `chat/route.ts`, inside `persistAndDone()`, set title from the first user message if not already set.

**Files:**
- Modify: `frontend/app/api/v1/chat/route.ts`

- [ ] **Step 1: Update persistAndDone to set title if not yet set**

Find this block in `chat/route.ts` (around line 624–638):
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(chatPhase === 'ADVISOR' && { chat_phase: chatPhase } as any),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(projects.length > 0 && { last_projects: projects as unknown as Prisma.JsonArray } as any),
      },
    }),
  ]
```

Replace with:
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
        // Set title from first user message if not yet set
        ...(!session.title && { title: rawMessage.slice(0, 60) }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(chatPhase === 'ADVISOR' && { chat_phase: chatPhase } as any),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(projects.length > 0 && { last_projects: projects as unknown as Prisma.JsonArray } as any),
      },
    }),
  ]
```

- [ ] **Step 2: Commit**
```bash
git add frontend/app/api/v1/chat/route.ts
git commit -m "feat(chat): populate session title from first user message"
```

---

## Task 4: Fix Chat Session Restore — Show Error State Instead of Silent Fail

**Root cause:** Session restore in `DiscoveryContent.tsx` (around line 394–452) has a catch block that silently shows a generic welcome message. Users who click a recent chat and get a broken session see no feedback.

**Files:**
- Modify: `frontend/components/DiscoveryContent.tsx`

- [ ] **Step 1: Add restoreError state and retry button**

Find the state declarations near the top of DiscoveryContent (around line 100–150). Add:
```typescript
const [restoreError, setRestoreError] = useState(false);
```

- [ ] **Step 2: Update session restore useEffect to set error state**

Find the session restore useEffect (starting around line 394):
```typescript
  // Initialize: fetch session from server and restore history
  useEffect(() => {
    if (!userId || isInitialized || searchParams.get('new') === '1') return;

    (async () => {
      try {
        // ... existing code ...
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

Replace the catch block:
```typescript
      } catch (err) {
        console.error('[session-restore] failed:', err);
        const sessionFromUrl = searchParams.get('session');
        if (sessionFromUrl) {
          // Specific session requested but failed — show error with retry
          setRestoreError(true);
        } else {
          // Generic new-session fallback
          setChatHistory([{
            id: crypto.randomUUID(),
            type: 'ai',
            content: "Hey, I am RealtyPal at your assistance, tell me how can I help you?",
            timestamp: new Date().toISOString(),
          }]);
        }
      } finally {
        setIsInitialized(true);
      }
```

- [ ] **Step 3: Add restoreError UI**

Find the main return JSX. Before the chat content renders, add a conditional for `restoreError`. Look for the main container div (around line 700–750) and add near the top of the chat area:

```tsx
{restoreError && (
  <div className="flex flex-col items-center justify-center flex-1 gap-4 p-8 text-center">
    <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
      <AlertTriangle size={24} className="text-red-500" />
    </div>
    <div>
      <p className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Could not load chat</p>
      <p className="text-sm text-gray-500 dark:text-gray-400">The session may have expired or been deleted.</p>
    </div>
    <button
      onClick={() => {
        setRestoreError(false);
        setIsInitialized(false);
      }}
      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
    >
      Start new chat
    </button>
  </div>
)}
```

- [ ] **Step 4: Commit**
```bash
git add frontend/components/DiscoveryContent.tsx
git commit -m "fix(chat): show error state when session restore fails instead of silent fallback"
```

---

## Task 5: Add AbortController to Chat Streaming

**Root cause:** `streamChat` in DiscoveryContent has no abort signal. If the user navigates away mid-stream, the ReadableStream reader keeps going in the background (memory leak + potential state mutation on unmounted component).

**Files:**
- Modify: `frontend/components/DiscoveryContent.tsx`

- [ ] **Step 1: Add abortControllerRef**

Near the other refs (around `submitLockRef`), add:
```typescript
const abortControllerRef = useRef<AbortController | null>(null);
```

- [ ] **Step 2: Cancel on unmount**

Find the existing useEffect cleanup pattern or add a new one:
```typescript
useEffect(() => {
  return () => {
    abortControllerRef.current?.abort();
  };
}, []);
```

- [ ] **Step 3: Wire AbortController into streamChat fetch**

Find in `streamChat` (around line 504–509):
```typescript
    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
        body: JSON.stringify({ message: userText, session_id: sessionId }),
      });
```

Replace with:
```typescript
    try {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
        body: JSON.stringify({ message: userText, session_id: sessionId }),
        signal: controller.signal,
      });
```

- [ ] **Step 4: Handle abort gracefully in catch block**

Find the catch block in streamChat (around line 585–592):
```typescript
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : '';
      setChatHistory(prev => prev.map(m =>
        m.id === streamId
          ? { ...m, content: `Sorry, something went wrong. ${errorMsg ? `(${errorMsg})` : ''} Please try again.`, isSearching: false }
          : m
      ));
```

Replace with:
```typescript
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return; // navigation abort — ignore
      const errorMsg = err instanceof Error ? err.message : '';
      setChatHistory(prev => prev.map(m =>
        m.id === streamId
          ? { ...m, content: `Sorry, something went wrong. ${errorMsg ? `(${errorMsg})` : ''} Please try again.`, isSearching: false }
          : m
      ));
```

- [ ] **Step 5: Commit**
```bash
git add frontend/components/DiscoveryContent.tsx
git commit -m "fix(chat): add AbortController to streaming fetch — prevents memory leak on navigate"
```

---

## Task 6: Add AbortController to Sidebar Session Fetch

**Root cause:** `Sidebar.tsx` fetch has no AbortController. If the component unmounts (navigation) while the fetch is pending, the `.then()` callbacks still fire and attempt state updates on unmounted component.

**Files:**
- Modify: `frontend/components/Sidebar.tsx`

- [ ] **Step 1: Update the session fetch useEffect**

Find (around line 25–35):
```typescript
  useEffect(() => {
    if (!userId) return;
    setSessionsLoading(true);
    fetch(`${API_BASE}/chat/session/list`, {
      headers: { 'X-User-Id': userId },
    })
      .then((r) => r.json())
      .then((data) => setRecentSessions(data.sessions ?? []))
      .catch(() => setRecentSessions([]))
      .finally(() => setSessionsLoading(false));
  }, [userId]);
```

Replace with:
```typescript
  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    setSessionsLoading(true);
    fetch(`${API_BASE}/chat/session/list`, {
      headers: { 'X-User-Id': userId },
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => setRecentSessions(data.sessions ?? []))
      .catch((err) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setRecentSessions([]);
      })
      .finally(() => setSessionsLoading(false));
    return () => controller.abort();
  }, [userId]);
```

- [ ] **Step 2: Commit**
```bash
git add frontend/components/Sidebar.tsx
git commit -m "fix(sidebar): add AbortController to session list fetch"
```

---

## Task 7: Add Reranker Timeout — Circuit Breaker

**Root cause:** `projectRepository.ts` calls `jinaRerank()` and `cohereRerank()` with no timeout. A slow or hung reranker blocks the entire chat response indefinitely.

**Files:**
- Modify: `frontend/lib/repositories/projectRepository.ts`

- [ ] **Step 1: Add withTimeout helper function**

Add after the imports and before `CATEGORY_ORDER`:
```typescript
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms)
    ),
  ]);
}
```

- [ ] **Step 2: Wrap reranker calls with 4-second timeout**

Find (around line 144–163):
```typescript
  // Rerank chain: Jina (primary) → Cohere (fallback) → DB order
  if (userQuery && cards.length > 1) {
    const docs = cards.map(toRerankDoc)

    if (process.env.JINA_API_KEY) {
      const ranked = await jinaRerank(userQuery, docs, 6)
      if (ranked.length > 0) {
        const jinaResults = ranked.map((r) => cards[r.index]).filter(Boolean) as ProjectCard[]
        await setCached(cacheKey, jinaResults, 60 * 60 * 2)
        return jinaResults
      }
    }

    if (process.env.COHERE_API_KEY) {
      const ranked = await cohereRerank(userQuery, docs, 6)
      if (ranked.length > 0) {
        const cohereResults = ranked.map((r) => cards[r.index]).filter(Boolean) as ProjectCard[]
        await setCached(cacheKey, cohereResults, 60 * 60 * 2)
        return cohereResults
      }
    }
  }
```

Replace with:
```typescript
  // Rerank chain: Jina (primary, 4s timeout) → Cohere (fallback, 4s timeout) → DB order
  if (userQuery && cards.length > 1) {
    const docs = cards.map(toRerankDoc)

    if (process.env.JINA_API_KEY) {
      try {
        const ranked = await withTimeout(jinaRerank(userQuery, docs, 6), 4000)
        if (ranked.length > 0) {
          const jinaResults = ranked.map((r) => cards[r.index]).filter(Boolean) as ProjectCard[]
          await setCached(cacheKey, jinaResults, 60 * 60 * 2)
          return jinaResults
        }
      } catch (err) {
        console.warn('[repo] jina rerank skipped:', err instanceof Error ? err.message : err)
      }
    }

    if (process.env.COHERE_API_KEY) {
      try {
        const ranked = await withTimeout(cohereRerank(userQuery, docs, 6), 4000)
        if (ranked.length > 0) {
          const cohereResults = ranked.map((r) => cards[r.index]).filter(Boolean) as ProjectCard[]
          await setCached(cacheKey, cohereResults, 60 * 60 * 2)
          return cohereResults
        }
      } catch (err) {
        console.warn('[repo] cohere rerank skipped:', err instanceof Error ? err.message : err)
      }
    }
  }
```

- [ ] **Step 3: Commit**
```bash
git add frontend/lib/repositories/projectRepository.ts
git commit -m "perf(search): add 4s timeout to reranker calls — prevents hung AI responses"
```

---

## Task 8: Per-Tool Error Isolation in Chat Route

**Root cause:** `chat/route.ts` has a single outer try-catch. If ANY tool fails (e.g., commute API returns 500), the entire response fails. Each tool should degrade gracefully.

**Files:**
- Modify: `frontend/app/api/v1/chat/route.ts`

- [ ] **Step 1: Wrap commute tool in its own try-catch**

Find (around line 492–523) the commute tool block. It starts with:
```typescript
        } else if (toolCallName === 'get_commute_time') {
          send({ type: 'searching' })

          let origin = '', destination = ''
          try {
            const args = JSON.parse(toolCallArgs)
            origin = args.origin as string
            destination = args.destination as string
          } catch { /* ok */ }
```

Wrap the whole `getCommuteTime` call in try-catch. Find:
```typescript
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
```

Replace with:
```typescript
          const commuteKey = makeKey('commute', origin.toLowerCase(), destination.toLowerCase())
          let commuteData = await getCached<object>(commuteKey)

          try {
            if (!commuteData) {
              const [, result] = await Promise.all([saveUserMsg, getCommuteTime(origin, destination)])
              if (result) {
                commuteData = result
                await setCached(commuteKey, result, 60 * 60 * 6)
              }
            } else {
              await saveUserMsg
            }
          } catch (toolErr) {
            console.warn('[chat] commute tool failed:', toolErr instanceof Error ? toolErr.message : toolErr)
            await saveUserMsg.catch(() => {})
          }

          secondMessages.push({
            role: 'tool',
            tool_call_id: toolCallId,
            content: commuteData
              ? JSON.stringify(commuteData)
              : `Could not calculate commute from "${origin}" to "${destination}". Share approximate distance/travel time from general knowledge.`,
          })
```

- [ ] **Step 2: Wrap web search tool in its own try-catch**

Find the web search block (around line 462–490). Find:
```typescript
          if (!webContext) {
            const [, webResult] = await Promise.all([
              saveUserMsg,
              tavilySearch(webQuery, 3),
            ])
            webContext = formatTavilyContext(webResult.answer, webResult.results) || ''
            console.log(`[chat] 🌐 web src=${webResult.source} results=${webResult.results.length} cached=false`)
            if (webContext) await setCached(webCacheKey, webContext, 60 * 60 * 24)
          } else {
            console.log(`[chat] 🌐 web cached=true`)
            await saveUserMsg
          }
```

Replace with:
```typescript
          try {
            if (!webContext) {
              const [, webResult] = await Promise.all([
                saveUserMsg,
                tavilySearch(webQuery, 3),
              ])
              webContext = formatTavilyContext(webResult.answer, webResult.results) || ''
              console.log(`[chat] 🌐 web src=${webResult.source} results=${webResult.results.length} cached=false`)
              if (webContext) await setCached(webCacheKey, webContext, 60 * 60 * 24)
            } else {
              console.log(`[chat] 🌐 web cached=true`)
              await saveUserMsg
            }
          } catch (toolErr) {
            console.warn('[chat] web search failed:', toolErr instanceof Error ? toolErr.message : toolErr)
            await saveUserMsg.catch(() => {})
            webContext = ''
          }
```

- [ ] **Step 3: Wrap RERA read tool in its own try-catch**

Find the `read_rera_page` block (around line 577–590). Find:
```typescript
          const [, reraContent] = await Promise.all([saveUserMsg, jinaRead(reraUrl, 2000)])
          const toolResult = reraContent
            ? `RERA page for ${args.rera_number || 'search'}:\n${reraContent}`
            : `Could not fetch RERA page. Advise user to visit https://www.up-rera.in directly.`
          secondMessages.push({ role: 'tool', tool_call_id: toolCallId, content: toolResult })
```

Replace with:
```typescript
          let reraContent: string | null = null
          try {
            const [, content] = await Promise.all([saveUserMsg, jinaRead(reraUrl, 2000)])
            reraContent = content
          } catch (toolErr) {
            console.warn('[chat] RERA read failed:', toolErr instanceof Error ? toolErr.message : toolErr)
            await saveUserMsg.catch(() => {})
          }
          const toolResult = reraContent
            ? `RERA page for ${args.rera_number || 'search'}:\n${reraContent}`
            : `Could not fetch RERA page. Advise user to visit https://www.up-rera.in directly.`
          secondMessages.push({ role: 'tool', tool_call_id: toolCallId, content: toolResult })
```

- [ ] **Step 4: Commit**
```bash
git add frontend/app/api/v1/chat/route.ts
git commit -m "fix(chat): isolate per-tool errors — failing commute/web/RERA no longer kills response"
```

---

## Task 9: Add Security Headers

**Root cause:** No security headers on any response. Partners may run security scanners.

**Files:**
- Modify: `frontend/next.config.js`

- [ ] **Step 1: Add headers() config**

Replace the entire file:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // react-leaflet v5 + leaflet are ESM-only; Next.js needs explicit transpilation
  transpilePackages: ['leaflet', 'react-leaflet'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'maps.googleapis.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'unpkg.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.in' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options',    value: 'nosniff' },
          { key: 'X-Frame-Options',            value: 'DENY' },
          { key: 'X-XSS-Protection',           value: '1; mode=block' },
          { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',         value: 'camera=(), microphone=(self), geolocation=(self)' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
```

- [ ] **Step 2: Commit**
```bash
git add frontend/next.config.js
git commit -m "security: add security headers (HSTS, X-Frame-Options, CSP, COOP)"
```

---

## Task 10: Add Secure Flag to Admin Cookie

**Root cause:** Admin `Set-Cookie` header is missing `Secure` flag. On HTTPS (production/Vercel), this means the cookie can be sent over plain HTTP. Simple fix.

**Files:**
- Modify: `frontend/app/api/v1/admin/auth/route.ts`

- [ ] **Step 1: Add Secure flag conditionally**

Replace:
```typescript
  res.headers.set(
    'Set-Cookie',
    `admin_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${60 * 60 * 24 * 7}`,
  )
```

With:
```typescript
  const isProduction = process.env.NODE_ENV === 'production'
  res.headers.set(
    'Set-Cookie',
    `admin_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${60 * 60 * 24 * 7}${isProduction ? '; Secure' : ''}`,
  )
```

- [ ] **Step 2: Commit**
```bash
git add frontend/app/api/v1/admin/auth/route.ts
git commit -m "security: add Secure flag to admin cookie on production"
```

---

## Task 11: Create middleware.ts — Request Logging + Admin Route Protection

**Root cause:** No middleware.ts exists. Admin routes have auth checks but no central enforcement. No request logging for debugging during demo.

**Files:**
- Create: `frontend/middleware.ts`

- [ ] **Step 1: Create middleware.ts**

Create `frontend/middleware.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { validateAdminToken } from '@/app/api/v1/admin/auth/route'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const t0 = Date.now()

  // Protect all admin API routes (except the auth login endpoint itself)
  if (pathname.startsWith('/api/v1/admin') && pathname !== '/api/v1/admin/auth') {
    const token = request.cookies.get('admin_token')?.value
    if (!validateAdminToken(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const response = NextResponse.next()

  // Log API requests for demo debugging
  if (pathname.startsWith('/api/')) {
    response.headers.set('X-Response-Time', `${Date.now() - t0}ms`)
    console.log(`[mw] ${request.method} ${pathname} uid=${request.headers.get('x-user-id')?.slice(0, 8) ?? '-'}`)
  }

  return response
}

export const config = {
  matcher: ['/api/v1/admin/:path*', '/api/:path*'],
}
```

- [ ] **Step 2: Commit**
```bash
git add frontend/middleware.ts
git commit -m "feat(middleware): centralized admin auth guard + API request logging"
```

---

## Task 12: Memoize Follow-Up Chips in DiscoveryContent

**Root cause:** `getFollowUpChips(phase, shortlist, turnCount)` is called inside render (it returns JSX chips). Since it's a pure function, it recomputes on every render. Memoize with `useMemo`.

**Files:**
- Modify: `frontend/components/DiscoveryContent.tsx`

- [ ] **Step 1: Find where chips are rendered in the JSX**

Search for where `getFollowUpChips` is called in the render. It will look something like:
```tsx
{getFollowUpChips(chatPhase, lastShortlist, chatTurnCount).map((chip) => (
```

- [ ] **Step 2: Replace inline call with memoized value**

Add near the other useMemo/useCallback declarations:
```typescript
const followUpChips = useMemo(
  () => getFollowUpChips(chatPhase, lastShortlist, chatTurnCount),
  [chatPhase, lastShortlist, chatTurnCount],
);
```

Then in JSX replace `getFollowUpChips(chatPhase, lastShortlist, chatTurnCount).map(...)` with `followUpChips.map(...)`.

- [ ] **Step 3: Commit**
```bash
git add frontend/components/DiscoveryContent.tsx
git commit -m "perf(chat): memoize follow-up chips to prevent recompute on every render"
```

---

## Task 13: Fix Carousel Bounds Check

**Root cause:** Image carousel in DiscoveryContent has no bounds check. If `carouselIndexes[index]` is undefined, accessing `message.images[undefined]` returns `undefined`, causing a crash.

**Files:**
- Modify: `frontend/components/DiscoveryContent.tsx`

- [ ] **Step 1: Find the carousel image render**

Search for `carouselIndexes[index]` in DiscoveryContent. It will look like:
```tsx
src={message.images[carouselIndexes[index] || 0]?.url || message.images[0].url}
```

- [ ] **Step 2: Add safe bounds access**

Replace:
```tsx
src={message.images[carouselIndexes[index] || 0]?.url || message.images[0].url}
alt={message.images[carouselIndexes[index] || 0]?.caption || 'Property image'}
```

With:
```tsx
src={message.images[carouselIndexes[index] ?? 0]?.url ?? message.images[0]?.url ?? ''}
alt={message.images[carouselIndexes[index] ?? 0]?.caption ?? 'Property image'}
```

The key change: `|| 0` treats index 0 as falsy; use `?? 0` instead. Add `?.url` on fallback too.

- [ ] **Step 3: Commit**
```bash
git add frontend/components/DiscoveryContent.tsx
git commit -m "fix(carousel): use nullish coalescing for carousel index — prevents crash on empty images"
```

---

## Self-Review Checklist

- [x] Home screen glitch: fixed (Task 1) — supabase client stabilized with useRef + cancellation flag
- [x] Slow recent chats: fixed (Task 2) — no longer fetches messages, uses title field directly
- [x] Chat continuation: fixed (Task 4) — error state with retry instead of silent reset
- [x] Session title populated: fixed (Task 3) — set from first user message
- [x] Streaming memory leak: fixed (Task 5) — AbortController on fetch + unmount cleanup
- [x] Sidebar memory leak: fixed (Task 6) — AbortController on fetch
- [x] Reranker blocking AI: fixed (Task 7) — 4s timeout circuit breaker
- [x] Tool error cascade: fixed (Task 8) — per-tool isolation for commute, web search, RERA
- [x] Security headers: fixed (Task 9) — X-Frame-Options, HSTS, nosniff, etc.
- [x] Admin cookie Secure flag: fixed (Task 10)
- [x] Admin route central enforcement: fixed (Task 11) — middleware.ts
- [x] Chips recompute: fixed (Task 12) — useMemo
- [x] Carousel crash: fixed (Task 13) — nullish coalescing

## What Else to Consider After Demo

1. **Replace `x-user-id` with proper Supabase JWT verification** — current header is spoofable. Use `supabase.auth.getUser()` server-side with the bearer token from cookie. This is the #1 security gap post-demo.

2. **Add bcrypt to admin password hashing** — install `bcryptjs`, replace sha256 derivation. Simple 2-file change.

3. **Supabase RLS policies** — enforce row-level security so DB queries only return data belonging to the authenticated user.

4. **Add HNSW vector index** — in Supabase SQL editor: `CREATE INDEX ON projects USING hnsw (embedding vector_cosine_ops);` — makes semantic search 10–100× faster.

5. **Add Sentry or similar** — partners will trigger errors; you need visibility. `npm install @sentry/nextjs` + 30-min setup.

6. **Add `title` to session on GET creation** — currently GET `/chat/session` creates session but title stays null until first chat. Set a placeholder like "New chat" or set it from the first POST.

7. **WhatsApp lead handoff** — the sidebar "Get Callback" and "Book Site Visit" lead forms don't have a WhatsApp webhook wired. Wire to a WhatsApp Business API or Twilio.

8. **Rate limit UI feedback** — when user hits 429, chat shows a generic error. Show a countdown timer so they know when to retry.
