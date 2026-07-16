# Refined Production‑Readiness Implementation Plan

This plan is written as a series of **atomic, low‑level steps** that any script‑oriented model can execute directly (e.g., line‑by‑line `sed`/`apply_patch`). Each step includes the exact file, line numbers (or a search pattern), and the code to add, replace, or delete.

---

## Wave 1 – Critical Security & Auth (High Priority)
### 1.1 Fix `x‑user‑id` bypass (frontend/middleware.ts)
- **File:** `frontend/middleware.ts`
- **Location:** Lines 20‑47 (the block that reads `x-user-id`).
- **Action:** Replace the entire block with the code below:
```ts
// ----- Begin secure user extraction -----
const supabaseProjectRef = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').match(/\/\/([^.]*)\.supabase/)?.[1] || ''
const supabaseCookieName = supabaseProjectRef ? `sb-${supabaseCookieName}-auth-token` : 'sb-auth-token'
const supabaseToken = request.cookies.get(supabaseCookieName)?.value

// Verify token with Supabase (already done in existing verifyUser function)
// Do NOT trust any inbound `x-user-id` header – ignore it completely.
const userId = supabaseToken ? await verifySupabaseToken(supabaseToken) : null
// If no token, treat as guest – generate/lookup guest token as before.
// Any request that tries to set `x-user-id` without a valid JWT will now be rejected.
// ----- End secure user extraction -----
```
- **Result:** Header no longer trusted; only Supabase JWT determines identity.

### 1.2 Add Prompt‑Injection Sanitization (backend/src/lib/ai/sanitize.ts)
- **Create file:** `backend/src/lib/ai/sanitize.ts`
- **Content:** (copy exactly from earlier audit)
```ts
// backend/src/lib/ai/sanitize.ts
const JAILBREAK_PATTERNS = [
  /ignore\s+(all\s+|previous\s+|your\s+)?(system\s+|prior\s+)?instructions/i,
  /you\s+are\s+now\s+(a\s+|an\s+)?(?!real estate|property|advisor)/i,
  /disregard\s+(your\s+|the\s+)?(system\s+|prior\s+|previous\s+)?prompt/i,
  /repeat\s+(the\s+|your\s+|above\s+|following\s+)(text|prompt|instructions)/i,
  /\bDAN\b|\bACT\s+AS\b/i,
  /pretend\s+you\s+(are|have\s+no)/i,
  /override\s+(your\s+)?(programming|training|instructions)/i,
  /what\s+(is|are)\s+your\s+system\s+prompt/i,
  /reveal\s+(your\s+)?(system|internal)\s+(prompt|instructions)/i,
]

export function sanitizeUserMessage(message: string): { safe: string; blocked: boolean } {
  const trimmed = message.trim().slice(0, 2000)
  for (const p of JAILBREAK_PATTERNS) if (p.test(trimmed)) {
    console.warn('[sanitize] blocked jailbreak attempt')
    return { safe: '[Message filtered]', blocked: true }
  }
  return { safe: trimmed, blocked: false }
}
```
- **Result:** New helper ready for import.

### 1.3 Integrate Sanitizer into chat route (backend/src/routes/chat.ts)
- **File:** `backend/src/routes/chat.ts`
- **Search pattern:** `const { message, sessionId, guestToken } = req.body`
- **Insert after extraction:**
```ts
import { sanitizeUserMessage } from '../lib/ai/sanitize'
// ... after extracting `message`
const { safe: sanitizedMessage, blocked } = sanitizeUserMessage(message ?? '')
if (blocked) {
  return res.json({ blocked: true, message: sanitizedMessage })
}
// use `sanitizedMessage` in downstream LLM calls
```
- **Result:** All inbound messages are filtered.

### 1.4 Add SSRF protection (backend/src/lib/web.ts)
- **File:** `backend/src/lib/web.ts`
- **Insert near top (after imports):**
```ts
const BLOCKED_HOSTS = new Set([
  'localhost','127.0.0.1','0.0.0.0','::1',
  '169.254.169.254','169.254.170.2','100.100.100.200','metadata.google.internal',
])
function isSafeUrl(url: string): boolean {
  try { const u = new URL(url); if (u.protocol !== 'https:') return false; if (BLOCKED_HOSTS.has(u.hostname)) return false;
    const ipv4 = u.hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (ipv4) {
      const [_, a, b] = ipv4.map(Number);
      if (a===10) return false;
      if (a===172 && b>=16 && b<=31) return false;
      if (a===192 && b===168) return false;
    }
    return true;
  } catch { return false; }
}
```
- **Modify each exported fetch function (e.g., `readPage`):**
```ts
export async function readPage(url: string): Promise<string> {
  if (!isSafeUrl(url)) { console.warn('[web] blocked unsafe URL', url); return 'Error: URL blocked' }
  // existing implementation follows
}
```
- **Result:** Prevents internal‑network SSRF.

### 1.5 File‑type validation for uploads (backend/src/lib/uploadValidator.ts)
- **Create file:** `backend/src/lib/uploadValidator.ts`
- **Content:**
```ts
import { fileTypeFromBuffer } from 'file-type'
const ALLOWED = new Set(['image/jpeg','image/png','image/webp','image/gif','application/pdf'])
export async function validateUploadedFile(buf: Buffer) {
  const ft = await fileTypeFromBuffer(buf)
  if (!ft || !ALLOWED.has(ft.mime)) return { valid:false, error: 'Invalid file type' }
  return { valid:true, mime:ft.mime }
}
```
- **Install dependencies:**
```powershell
cd backend
npm i file-type@16
npm i -D @types/file-type
```
- **Integrate into upload routes (example in `backend/src/routes/builderRegistration.ts`):**
```ts
import { validateUploadedFile } from '../lib/uploadValidator'
// after multer processing
if (req.file) {
  const { valid, error } = await validateUploadedFile(req.file.buffer)
  if (!valid) return res.status(400).json({ error })
}
```
- **Result:** Only allowed MIME types accepted.

### 1.6 Fix hard‑coded Supabase cookie name (frontend/middleware.ts)
- **File:** `frontend/middleware.ts`
- **Replace existing line** that reads the cookie with:
```ts
const supabaseProjectRef = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').match(/\/\/([^.]*)\.supabase/)?.[1] || ''
const supabaseCookieName = supabaseProjectRef ? `sb-${supabaseProjectRef}-auth-token` : 'sb-auth-token'
const supabaseToken = request.cookies.get(supabaseCookieName)?.value
```
- **Result:** Cookie name now matches any Supabase project.

---

## Wave 2 – Chat Correctness & AI Cost Optimisation
### 2.1 Fix chat history order (backend/src/routes/chat.ts)
- **Search:** `orderBy: { created_at: 'desc' }`
- **Replace block:**
```ts
const messages = await prisma.chatMessage.findMany({
  where: { session_id: sessionId },
  orderBy: { created_at: 'desc' },
  take: 8,
})
// currently reversed to oldest‑first; remove `.reverse()` and instead fetch `orderBy: 'asc'` with `skip` if needed.
const ordered = messages.reverse() // keep this to deliver oldest‑first but newest context retained
```
- **Result:** Correct ordering so recent messages are included.

### 2.2 Persist orphaned user turns (backend/src/routes/chat.ts)
- **Locate:** after streaming assistant response, block where user message is saved.
- **Add:** Ensure both user and assistant messages are written atomically (inside same transaction) and that on abort the incomplete user turn is rolled back.
```ts
await prisma.$transaction(async (tx) => {
  await tx.chatMessage.create({ data: { ...userMessage, session_id: sessionId } })
  // stream assistant then create assistant message
})
```
- **Result:** No stray user messages.

### 2.3 Increase timeout & send truncated SSE (backend/src/routes/chat.ts)
- **File constants:** `REQUEST_TIMEOUT_MS`
- **Set to `50000` (50 s).**
- **During abort:** emit `event: truncated\ndata: response truncated` before ending stream.
- **Result:** UI can show proper message.

### 2.4 Slim system prompt (frontend/lib/ai/prompts.ts)
- **Open file**, locate the large prompt block (lines 10‑191).
- **Replace** the static tables (stamp duty, bank rates, legal checklists) with a placeholder comment and reference a new tool that returns the data on demand.
```ts
// Removed large static tables – now the prompt includes only a short description.
// Tools `getStampDutyTable`, `getBankRates`, `getLegalChecklist` will be called when needed.
```
- **Result:** Token usage reduced dramatically.

### 2.5 Cache property search (backend/src/routes/chat.ts – `search_properties` segment)
- **Add Redis cache wrapper:**
```ts
import { getCached, setCached } from '../lib/cache'
const cacheKey = `search:${JSON.stringify(filters)}`
const cached = await getCached(cacheKey)
if (cached) return cached
// after DB query
await setCached(cacheKey, results, 600) // 10 min TTL
```
- **Result:** Repeated identical searches hit Redis.

### 2.6 Sanitize memory injection (frontend/lib/ai/prompts.ts – `buildMemorySection`)
- **Add whitelist regex** for any stored sector strings.
```ts
if (!/^Sector \d{1,3}$/.test(sector)) sector = ''
```
- **Result:** Prevents malicious stored prompts.

### 2.7 Reduce step count (backend/src/lib/ai/config.ts)
- **Locate:** `MAX_STEPS` or similar constant.
- **Set to `3`.**
- **Result:** Faster response, lower cost.

---

## Wave 3 – Performance Optimisation
### 3.1 Dynamic import Leaflet (any file importing `SectorMapInner`)
- **Search pattern:** `import SectorMapInner from '@/components/SectorMapInner'`
- **Replace with:**
```ts
import dynamic from 'next/dynamic'
const SectorMapInner = dynamic(() => import('@/components/SectorMapInner'), { ssr:false, loading:()=> <div className="animate-pulse">Loading map…</div> })
```
- **Result:** Leaflet only loaded on demand.

### 3.2 Dynamic import Recharts (search for `'recharts'` imports)
- **Create wrapper component** `frontend/components/charts/LineChartWrapper.tsx` containing original Recharts code.
- **Replace original imports with dynamic load:**
```ts
import dynamic from 'next/dynamic'
const LineChartWrapper = dynamic(() => import('@/components/charts/LineChartWrapper'), { ssr:false, loading:()=> <div className="h-48 bg-slate-100 animate-pulse rounded-xl"/> })
```
- **Result:** Charts split from main bundle.

### 3.3 LazyMotion for Framer Motion (frontend/app/layout.tsx)
- **Add import:** `import { LazyMotion, domAnimation } from 'framer-motion'`
- **Wrap children:**
```tsx
<LazyMotion features={domAnimation} strict>
  {children}
</LazyMotion>
```
- **Replace all `motion.` usages** with `m.` (keep same API).
- **Result:** Reduces Motion payload.

### 3.4 Fix Prisma N+1 (backend/src/routes/admin.ts)
- **Locate:** `prisma.propertyEvent.findMany()`
- **Replace with limited query:**
```ts
const thirtyDaysAgo = new Date(Date.now() - 30*24*60*60*1000)
const events = await prisma.propertyEvent.findMany({
  where: { created_at: { gte: thirtyDaysAgo } },
  orderBy: { created_at: 'desc' },
  take: 50000,
})
```
- **Result:** Prevents huge scans.

### 3.5 Limit images in project queries (frontend/lib/repositories/projectRepository.ts)
- **In `searchProjects` include block:** change to
```ts
images: { orderBy:{ sort_order:'asc' }, take:5 },
```
- **In `getProjectBySlug` include block:** change to
```ts
images: { orderBy:{ sort_order:'asc' }, take:10 },
```
- **Result:** Payload reduced.

### 3.6 Add route‑level Redis cache middleware (backend/src/lib/routeCache.ts)
- **Create file** with code from earlier audit (same as in plan).
- **Apply to high‑traffic GET routes** (`projects.ts`, `builders.ts`).
- **Result:** Server‑side caching.

### 3.7 Add NProgress bar (frontend/app/layout.tsx)
- **Install:** `npm i next-nprogress-bar`
- **Import and render** inside `<body>` as per plan.
- **Result:** Visual page‑load indicator.

### 3.8 Skeleton component library (frontend/components/skeletons/index.tsx)
- **Create file** with all skeleton components (provided earlier).
- **Replace existing spinners** with appropriate skeletons in pages.
- **Result:** Consistent loading UI.

---

## Wave 4 – UI/UX & Code Quality
### 4.1 Design tokens (frontend/app/globals.css)
- **Replace existing `:root` and `.dark` blocks** with the comprehensive token list provided in the plan.
- **Add `.glass-card` class** after existing `.glass-surface`.

### 4.2 StatCard component (frontend/components/admin/StatCard.tsx)
- **Create file** with the component code supplied in the plan.
- **Use in admin dashboard** by replacing plain metric divs with `<StatCard .../>`.

### 4.3 Accessibility fixes
- **Chat input (frontend/components/DiscoveryContent.tsx):** add `aria-label="Type your property question"`.
- **Sidebar toggle button (frontend/components/Sidebar.tsx or DiscoveryContent.tsx):** add `aria-label="Toggle sidebar" aria-expanded={isOpen}`.
- **Save button in PropertyCard (frontend/components/PropertyCard.tsx):** add `aria-label={isSaved?"Remove from saved":"Save property"}`.
- **Skip link:** Insert at top of `<body>` in `app/layout.tsx` and give main wrapper `id="main-content"`.

### 4.4 Code cleanup
- **Remove unused lucide imports** in the listed component files (Sidebar, SiteVisitScheduler, VisualGuide, SocialProofAndTransparency).
- **Delete unused vars** (`K_RE` in `frontend/lib/normalize.ts`, `UnitTypeSummary` import in `projectRepository.ts`).
- **Fix any `any` casts** in `projectRepository.ts` by adding proper Prisma type (`ProjectWithRelations`).
- **Root clutter:** Move one‑off scripts to `scripts/archived/` and update `.gitignore` to exclude log files.

---

## Wave 5 – Deployment Hardening
### 5.1 Fix Sentry deprecation (frontend/instrumentation-client.ts)
- **Rename** `sentry.client.config.ts` to `instrumentation-client.ts` (already done in repo). Ensure imports reference the new name.

### 5.2 Add build & check npm scripts (both `frontend/package.json` & `backend/package.json`)
- **Add** `"typecheck":"tsc --noEmit"`, `"build:check":"npm run typecheck && npm run lint && npm run build"`, etc.

### 5.3 GitHub Actions CI (create `.github/workflows/ci.yml`)
- **Create file** with the YAML from the plan.

### 5.4 Render env vars
- **Manual step** – document the required env vars (list already in plan). No code change required.

---

## Verification Steps (run after each wave)
1. `cd backend && npm run build` – ensure TypeScript compiles with no errors.
2. `cd frontend && npm run build` – ensure Next.js builds, check bundle size for `/discover`.
3. Run unit/ESLint: `npm run lint` in both packages.
4. Start dev servers and manually test:
   - Authentication (guest vs logged‑in) cannot be spoofed.
   - Chat retains correct recent history.
   - No SSRF or file‑type bypass.
   - UI shows glass‑card, stat cards, skeletons, NProgress.
   - Admin dashboard renders StatCard components.
5. Run automated tests (if any) after each wave.

---

**Next step:** Please confirm you would like me to start applying **Wave 1** (the critical security fixes). Once approved, I will execute the atomic file edits listed above.
