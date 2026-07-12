# RealtyPals Rebuild — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild RealtyPals with an Express.js backend, improved AI engine (persistent memory, conversation compression, Hindi/Hinglish intent extraction), guest token support, and re-engagement UI.

**Architecture:** `backend/` (Express.js, AI engine, SSE chat) sits alongside existing `frontend/` (Next.js). Both share the same PostgreSQL DB. Frontend calls `http://localhost:3001/api` for chat and session routes; other existing Next.js API routes (`/api/v1/`) remain in place and are migrated gradually.

**Tech Stack:** Express.js, TypeScript, Prisma (shared schema from frontend/prisma), Groq (primary AI), Anthropic claude-haiku-4-5 (fallback), Zod, Upstash Redis, Supabase Auth/Storage, Next.js 14 (frontend), Tailwind/shadcn.

---

## File Map

### New Files (backend/)
```
backend/
├── package.json
├── tsconfig.json
├── .env                              ← keys from RealtyPals
├── src/
│   ├── index.ts                      ← Express server entry
│   ├── lib/
│   │   ├── db.ts                     ← Prisma client
│   │   ├── redis.ts                  ← Upstash Redis client + rate limit
│   │   ├── calculators.ts            ← EMI, stamp duty, GST
│   │   ├── webhooks.ts               ← Lead notifications (retry)
│   │   └── ai/
│   │       ├── prompts.ts            ← System prompt + intent extraction prompt
│   │       ├── intent.ts             ← Zod intent extractor (Groq + Claude fallback)
│   │       ├── memory.ts             ← UserMemory CRUD
│   │       ├── context.ts            ← Context builder (memory + summary + history)
│   │       ├── compression.ts        ← Conversation compression (long sessions)
│   │       ├── groq.ts               ← Groq streaming helper
│   │       └── claude.ts             ← Claude streaming helper
│   ├── discovery.ts                  ← Project scoring + ranking
│   └── routes/
│       ├── chat.ts                   ← POST /api/chat (SSE)
│       ├── sessions.ts               ← GET/POST /api/sessions + /migrate
│       ├── projects.ts               ← GET /api/projects, /api/projects/:slug
│       ├── saved.ts                  ← GET/POST/DELETE /api/saved
│       ├── leads.ts                  ← POST /api/leads/callback + /site-visit
│       └── admin.ts                  ← Admin routes (secret header)
```

### Modified Files (frontend/)
```
frontend/
├── prisma/
│   ├── schema.prisma                 ← Add summary + guest_token fields
│   ├── seed.ts                       ← Update to use Elite data files
│   └── data/
│       ├── seed-data.ts              ← Copy from Elite
│       └── seed-data-new.ts          ← Copy from Elite
├── lib/
│   └── backend-api.ts               ← API client pointing to Express backend
├── components/
│   └── chat/
│       ├── ReEngagementBanner.tsx   ← New: welcome-back banner
│       └── StatusSteps.tsx           ← New: intent→search→generating steps
├── app/
│   └── discover/
│       └── page.tsx                  ← Remove auth gate, add guest token, add re-engagement
└── .env.local                        ← Add NEXT_PUBLIC_BACKEND_URL
```

---

## Task 1: Root workspace & backend scaffold

**Files:**
- Modify: `package.json` (root)
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/src/index.ts`

- [ ] **Step 1: Update root package.json**

```json
{
  "name": "realtypals-monorepo",
  "private": true,
  "workspaces": ["frontend", "backend"],
  "scripts": {
    "dev:backend": "npm run dev --workspace=backend",
    "dev:frontend": "npm run dev --workspace=frontend",
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\""
  },
  "devDependencies": {
    "concurrently": "^9.1.0"
  },
  "dependencies": {
    "baseline-browser-mapping": "^2.10.33",
    "caniuse-lite": "^1.0.30001793"
  }
}
```

- [ ] **Step 2: Create backend/package.json**

```json
{
  "name": "realtypals-backend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "db:generate": "prisma generate --schema=../frontend/prisma/schema.prisma",
    "db:seed": "tsx ../frontend/prisma/seed.ts"
  },
  "prisma": {
    "schema": "../frontend/prisma/schema.prisma"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.52.0",
    "@prisma/client": "^5.20.0",
    "@upstash/redis": "^1.38.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.21.1",
    "groq-sdk": "^0.7.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.0",
    "@types/node": "^20.14.12",
    "prisma": "^5.20.0",
    "tsx": "^4.19.0",
    "typescript": "^5.5.4"
  }
}
```

- [ ] **Step 3: Create backend/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: Create backend/src/index.ts**

```typescript
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import chatRouter from './routes/chat'
import sessionsRouter from './routes/sessions'
import projectsRouter from './routes/projects'
import savedRouter from './routes/saved'
import leadsRouter from './routes/leads'
import adminRouter from './routes/admin'

const app = express()
const PORT = Number(process.env.PORT ?? 3001)

app.use(cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  credentials: true,
}))
app.use(express.json())

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }))

app.use('/api/chat', chatRouter)
app.use('/api/sessions', sessionsRouter)
app.use('/api/projects', projectsRouter)
app.use('/api/saved', savedRouter)
app.use('/api/leads', leadsRouter)
app.use('/api/admin', adminRouter)

app.listen(PORT, () => {
  console.log(`[backend] listening on :${PORT}`)
  const keys = {
    GROQ_API_KEY: !!process.env.GROQ_API_KEY,
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    DATABASE_URL: !!process.env.DATABASE_URL,
    UPSTASH_REDIS_REST_URL: !!process.env.UPSTASH_REDIS_REST_URL,
  }
  console.log('[backend] env check:', keys)
  if (!keys.GROQ_API_KEY && !keys.ANTHROPIC_API_KEY) {
    console.error('[backend] WARNING: No AI keys. Chat will not work.')
  }
})
```

- [ ] **Step 5: Install backend dependencies**

```bash
cd backend && npm install
```

Expected: `node_modules/` populated, no errors.

- [ ] **Step 6: Install root concurrently**

```bash
cd C:\Users\Furqan\Desktop\UiRealtyPals && npm install
```

- [ ] **Step 7: Commit**

```bash
git add backend/ package.json package-lock.json
git commit -m "feat: add Express backend scaffold alongside Next.js frontend"
```

---

## Task 2: Env files

**Files:**
- Create: `backend/.env`
- Modify: `frontend/.env.local`

- [ ] **Step 1: Create backend/.env**

```bash
# backend/.env
PORT=3001
FRONTEND_URL=http://localhost:3000

# Database (from RealtyPals — Supabase PostgreSQL)
DATABASE_URL="postgresql://<user>:<password>@<host>:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://<user>:<password>@<host>:5432/postgres"

# Supabase
SUPABASE_URL=https://eargxntetfmtdpwedjbd.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>

# AI
GROQ_API_KEY=<your-groq-api-key>
# ANTHROPIC_API_KEY=  ← add when available

# Leads & Webhooks
WEBHOOK_URL=<your-make-webhook-url>

# Admin
ADMIN_SECRET=<your-admin-secret>
```

- [ ] **Step 2: Ensure frontend/.env.local includes backend URL**

The file should contain at minimum (merge with existing, don't replace):

```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://eargxntetfmtdpwedjbd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-supabase-anon-key>
```

Copy existing frontend/.env.local (if any) to preserve existing keys, then add `NEXT_PUBLIC_BACKEND_URL`.

Also ensure the **frontend** DATABASE_URL is set (for Prisma migrations/seeding). Copy from backend .env into frontend .env if not present.

- [ ] **Step 3: Add .env to .gitignore**

Check that `backend/.env` and `frontend/.env.local` are in `.gitignore`. The root `.gitignore` should already cover `*.env` and `.env.local`.

- [ ] **Step 4: Commit**

```bash
git add .gitignore
git commit -m "chore: add backend/.env template and document env setup"
```

---

## Task 3: Update Prisma schema

**Files:**
- Modify: `frontend/prisma/schema.prisma`

Add `summary` and `guest_token` to `ChatSession`. Update `UserMemory` to support both userId and guestToken. Add `CallbackRequest` model if missing.

- [ ] **Step 1: Update ChatSession model**

Find the `ChatSession` model. Add these two fields after `chat_phase`:

```prisma
model ChatSession {
  id            String    @id @default(uuid())
  user_id       String?
  guest_token   String?                           // ← ADD
  title         String?
  message_count Int       @default(0)
  chat_phase    String    @default("DISCOVERY")
  summary       String?                           // ← ADD (conversation compression)
  last_projects Json?
  created_at    DateTime  @default(now())
  last_active   DateTime  @updatedAt

  messages ChatMessage[]

  @@index([user_id])
  @@index([guest_token])                          // ← ADD
  @@map("chat_sessions")
}
```

- [ ] **Step 2: Update UserMemory to support guest_token**

Replace the existing `UserMemory` model:

```prisma
model UserMemory {
  id                     String   @id @default(uuid())
  user_id                String?  @unique
  guest_token            String?  @unique
  bhk_preference         Int?
  bhk_preferences        Int[]    @default([])
  budget_min_cr          Float?
  budget_max_cr          Float?
  sector_preference      String?
  purpose                String?
  possession_pref        String?
  timeline_months        Int?
  work_location          String?
  home_loan_pre_approved Boolean?
  contact_phone          String?
  viewed_slugs           String[]
  rejected_slugs         String[]
  saved_slugs            String[]
  summary_text           String?
  updated_at             DateTime @updatedAt

  @@map("user_memory")
}
```

- [ ] **Step 3: Add CallbackRequest model (if not present)**

Add after `SiteVisitRequest`:

```prisma
model CallbackRequest {
  id           String   @id @default(uuid())
  name         String
  phone        String
  project_name String?
  project_slug String?
  user_id      String?
  guest_token  String?
  status       String   @default("new")
  created_at   DateTime @default(now())

  @@index([project_slug])
  @@map("callback_requests")
}
```

- [ ] **Step 4: Run Prisma migration**

```bash
cd frontend && npx prisma migrate dev --name "add_guest_token_summary_callback"
```

Expected output: `✓ Applied migration 'add_guest_token_summary_callback'`

If migration fails due to existing data conflicts, use `--create-only` to inspect SQL first.

- [ ] **Step 5: Regenerate Prisma client**

```bash
cd frontend && npx prisma generate
cd backend && npm run db:generate
```

Expected: `✓ Generated Prisma Client`

- [ ] **Step 6: Commit**

```bash
git add frontend/prisma/schema.prisma frontend/prisma/migrations/
git commit -m "feat: add guest_token, summary to ChatSession; update UserMemory; add CallbackRequest"
```

---

## Task 4: Port Elite seed data and seed the database

**Files:**
- Create: `frontend/prisma/data/seed-data.ts` (copy from Elite)
- Create: `frontend/prisma/data/seed-data-new.ts` (copy from Elite)
- Modify: `frontend/prisma/seed.ts`

- [ ] **Step 1: Copy Elite seed data files**

```bash
cp "C:\Users\Furqan\Desktop\RealtyPalsxElite\frontend\prisma\data\seed-data.ts" \
   "C:\Users\Furqan\Desktop\UiRealtyPals\frontend\prisma\data\seed-data.ts"

cp "C:\Users\Furqan\Desktop\RealtyPalsxElite\frontend\prisma\data\seed-data-new.ts" \
   "C:\Users\Furqan\Desktop\UiRealtyPals\frontend\prisma\data\seed-data-new.ts"
```

- [ ] **Step 2: Replace frontend/prisma/seed.ts**

```typescript
// frontend/prisma/seed.ts
import { PrismaClient, ProjectStatus, AmenityCategory, ConnectivityType, DataSource, ImageType } from '@prisma/client'

// Dynamically import data to avoid TypeScript errors from large files
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { BUILDERS, PROJECTS } = require('./data/seed-data')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { NEW_BUILDERS, NEW_PROJECTS } = require('./data/seed-data-new')

const ALL_BUILDERS = [...BUILDERS, ...NEW_BUILDERS]
const ALL_PROJECTS = [...PROJECTS, ...NEW_PROJECTS]

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding RealtyPals database...\n')

  console.log('📦 Seeding builders...')
  const builderMap = new Map<string, string>()

  for (const b of ALL_BUILDERS) {
    const { ...builderData } = b
    const builder = await prisma.builder.upsert({
      where: { slug: b.slug },
      update: builderData,
      create: builderData,
    })
    builderMap.set(b.slug, builder.id)
    console.log(`  ✓ ${builder.name}`)
  }

  console.log('\n🏗️  Seeding projects...')

  for (const p of ALL_PROJECTS) {
    const builder_id = builderMap.get(p.builder_slug)
    if (!builder_id) {
      console.error(`  ✗ Builder not found for slug: ${p.builder_slug}`)
      continue
    }

    const { unit_types, amenities, connectivity, project_images, builder_slug, ...projectData } = p

    // Normalize fields: Elite uses rera_numbers[] but our schema uses rera_number (singular)
    const normalizedProject = {
      ...projectData,
      builder_id,
      status: projectData.status as ProjectStatus,
      // Take first RERA number if array provided
      rera_number: Array.isArray(projectData.rera_numbers)
        ? projectData.rera_numbers[0] ?? null
        : projectData.rera_number ?? null,
    }
    // Remove rera_numbers array if present (not in our schema)
    delete (normalizedProject as Record<string, unknown>).rera_numbers

    const project = await prisma.project.upsert({
      where: { slug: p.slug },
      update: normalizedProject,
      create: normalizedProject,
    })

    await Promise.all([
      prisma.unitType.deleteMany({ where: { project_id: project.id } }),
      prisma.amenity.deleteMany({ where: { project_id: project.id } }),
      prisma.connectivity.deleteMany({ where: { project_id: project.id } }),
      prisma.projectImage.deleteMany({ where: { project_id: project.id } }),
    ])

    const inserts: Promise<unknown>[] = []

    if (unit_types?.length > 0) {
      inserts.push(prisma.unitType.createMany({
        data: unit_types.map((u: Record<string, unknown>) => ({ ...u, project_id: project.id })),
      }))
    }
    if (amenities?.length > 0) {
      inserts.push(prisma.amenity.createMany({
        data: amenities.map((a: Record<string, unknown>) => ({
          ...a, project_id: project.id, category: a.category as AmenityCategory,
        })),
      }))
    }
    if (connectivity?.length > 0) {
      inserts.push(prisma.connectivity.createMany({
        data: connectivity.map((c: Record<string, unknown>) => ({
          ...c, project_id: project.id,
          type: c.type as ConnectivityType,
          data_source: (c.data_source as DataSource) ?? 'manual',
        })),
      }))
    }
    if (project_images?.length > 0) {
      inserts.push(prisma.projectImage.createMany({
        data: project_images.map((img: Record<string, unknown>) => ({
          ...img, project_id: project.id, type: img.type as ImageType,
        })),
      }))
    }

    await Promise.all(inserts)
    console.log(`  ✓ ${project.name} (${unit_types?.length ?? 0} units, ${amenities?.length ?? 0} amenities, ${connectivity?.length ?? 0} connectivity, ${project_images?.length ?? 0} images)`)
  }

  console.log('\n✅ Seed complete.')
}

main()
  .catch(e => { console.error('❌ Seed failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 3: Run seed**

```bash
cd frontend && npx prisma db seed
```

Expected: `✅ Seed complete.` with each builder and project logged.

If seed fails with "column does not exist", run `npx prisma migrate dev` first (Task 3 Step 4).

- [ ] **Step 4: Verify seed data in Prisma Studio**

```bash
cd frontend && npx prisma studio
```

Open browser to `http://localhost:5555`. Confirm builders and projects tables have data.

- [ ] **Step 5: Commit**

```bash
git add frontend/prisma/seed.ts frontend/prisma/data/
git commit -m "feat: port Elite property seed data (builders + projects + amenities + images)"
```

---

## Task 5: Backend db.ts and redis.ts

**Files:**
- Create: `backend/src/lib/db.ts`
- Create: `backend/src/lib/redis.ts`

- [ ] **Step 1: Create backend/src/lib/db.ts**

```typescript
// backend/src/lib/db.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 2: Create backend/src/lib/redis.ts**

```typescript
// backend/src/lib/redis.ts
import { Redis } from '@upstash/redis'

let _redis: Redis | null = null

function getRedis(): Redis | null {
  if (_redis) return _redis
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  }
  return _redis
}

export async function checkRateLimit(key: string, limit = 20, windowSecs = 60): Promise<{ allowed: boolean; remaining: number }> {
  const redis = getRedis()
  if (!redis) return { allowed: true, remaining: 999 }

  const redisKey = `rl:${key}`
  try {
    const count = await redis.incr(redisKey)
    if (count === 1) await redis.expire(redisKey, windowSecs)
    return { allowed: count <= limit, remaining: Math.max(0, limit - count) }
  } catch {
    return { allowed: true, remaining: 999 }
  }
}

export async function getCached<T>(key: string): Promise<T | null> {
  const redis = getRedis()
  if (!redis) return null
  try {
    return await redis.get<T>(key)
  } catch {
    return null
  }
}

export async function setCached<T>(key: string, value: T, ttlSecs = 3600): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  try {
    await redis.set(key, value, { ex: ttlSecs })
  } catch {}
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/lib/db.ts backend/src/lib/redis.ts
git commit -m "feat: add backend Prisma client and Redis helpers"
```

---

## Task 6: Backend calculators.ts

**Files:**
- Create: `backend/src/lib/calculators.ts`

- [ ] **Step 1: Create backend/src/lib/calculators.ts**

```typescript
// backend/src/lib/calculators.ts

export function formatInr(amount: number): string {
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2)} Cr`
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(2)} L`
  return `₹${amount.toLocaleString('en-IN')}`
}

export function calcEmi(
  principalCr: number,
  annualRatePct: number,
  tenureYears: number
): { emi: number; totalPayment: number; totalInterest: number } {
  const P = principalCr * 1_00_00_000
  const r = annualRatePct / 1200
  const n = tenureYears * 12
  if (r === 0) return { emi: P / n, totalPayment: P, totalInterest: 0 }
  const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
  const totalPayment = emi * n
  return { emi, totalPayment, totalInterest: totalPayment - P }
}

export function calcStampDuty(
  priceCr: number,
  gender: 'male' | 'female' | 'joint' = 'male'
): { stampDuty: number; registration: number; total: number; rate: number } {
  const price = priceCr * 1_00_00_000
  const rate = gender === 'female' ? 6 : 7   // UP rates
  const stampDuty = (price * rate) / 100
  const registration = price * 0.01
  return { stampDuty, registration, total: stampDuty + registration, rate }
}

export function calcGst(
  priceCr: number,
  status: 'under_construction' | 'ready_to_move',
  carpetSqm = 0
): { gst: number; rate: number; category: string } {
  if (status === 'ready_to_move') return { gst: 0, rate: 0, category: 'OC received — no GST' }
  const price = priceCr * 1_00_00_000
  const isAffordable = priceCr < 0.45 && carpetSqm > 0 && carpetSqm <= 60
  const rate = isAffordable ? 1 : 5
  return { gst: (price * rate) / 100, rate, category: isAffordable ? 'affordable_housing' : 'standard' }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/lib/calculators.ts
git commit -m "feat: add backend calculators (EMI, stamp duty, GST)"
```

---

## Task 7: Backend AI prompts

**Files:**
- Create: `backend/src/lib/ai/prompts.ts`

- [ ] **Step 1: Create backend/src/lib/ai/prompts.ts**

This is the system prompt for the advisor and a separate intent extraction prompt.

```typescript
// backend/src/lib/ai/prompts.ts
import type { Intent } from '../discovery'

export const INTENT_EXTRACTION_PROMPT = `You are an intent extractor for a real estate search assistant in India.

Extract structured property preferences from the user message. Understand Hindi, Hinglish, and English.

Hinglish mappings (always apply):
- "do BHK" / "2 BHK" / "two bedroom" → bhk: [2]
- "teen BHK" / "3 BHK" → bhk: [3]
- "ek BHK" / "1 BHK" / "studio" → bhk: [1]
- "ek crore" / "1 crore" / "1Cr" → budgetMax: 1.0
- "do crore" / "2Cr" / "2 crore" → budgetMax: 2.0
- "dedh crore" / "1.5 crore" / "1.5Cr" → budgetMax: 1.5
- "teen crore" / "3 crore" → budgetMax: 3.0
- "X se Y crore" / "between X and Y crore" → budgetMin: X, budgetMax: Y
- "RTM" / "ready to move" / "tayaar ghar" → possession: "immediate"
- "under construction" / "UC" / "under construction hai" → possession: "3year+"
- "sector 150" / "s-150" → sector: "Sector 150"
- "investment ke liye" / "for investment" → purpose: "investment"
- "end use" / "khud rehna" → purpose: "endUse"

Return ONLY valid JSON with these optional fields:
{
  "bhk": [number],          // array of acceptable BHK values e.g. [2,3]
  "budgetMin": number,      // crore
  "budgetMax": number,      // crore
  "possession": "immediate" | "1year" | "2year" | "3year+",
  "sector": string,         // e.g. "Sector 150"
  "areaMin": number,        // sqft
  "areaMax": number,        // sqft
  "purpose": "endUse" | "investment",
  "builderName": string
}

Rules:
- Only include fields that are explicitly present in the message
- Do NOT invent or guess fields
- If user says "under 2 crore" → budgetMax: 2.0 (no budgetMin)
- If user says "3-4 BHK" → bhk: [3, 4]
- Return {} if no property intent found
- Return only the JSON object, no markdown or explanation`

export function buildAdvisorSystemPrompt(
  intent: Intent,
  projectCount: number,
  memory?: {
    bhk_preference?: number | null
    budget_max_cr?: number | null
    sector_preference?: string | null
    purpose?: string | null
    viewed_slugs?: string[]
  } | null
): string {
  const intentSummary = buildIntentSummary(intent)
  const memorySummary = memory ? buildMemorySummary(memory) : ''
  const contextSuffix = intentSummary || memorySummary
    ? `\n\n## Current Session Context\n${intentSummary}${memorySummary}`
    : ''
  const resultNote = projectCount > 0
    ? `\n\nProperty cards are displayed to the user. Write a 2-3 sentence advisory summary (under 100 words). Lead with best-fit and one reason. Note one honest trade-off. Do NOT repeat specs from the cards.`
    : ''

  return BASE_SYSTEM_PROMPT + contextSuffix + resultNote
}

function buildIntentSummary(intent: Intent): string {
  const parts: string[] = []
  if (intent.bhk?.length) parts.push(`BHK: ${intent.bhk.join(' or ')}`)
  if (intent.budgetMax) parts.push(`Budget: up to ₹${intent.budgetMax}Cr`)
  if (intent.sector) parts.push(`Area: ${intent.sector}`)
  if (intent.possession) parts.push(`Possession: ${intent.possession}`)
  if (intent.purpose) parts.push(`Purpose: ${intent.purpose}`)
  return parts.length ? `Detected intent: ${parts.join(' · ')}\n` : ''
}

function buildMemorySummary(memory: {
  bhk_preference?: number | null
  budget_max_cr?: number | null
  sector_preference?: string | null
  purpose?: string | null
  viewed_slugs?: string[]
}): string {
  const parts: string[] = []
  if (memory.bhk_preference) parts.push(`Past preference: ${memory.bhk_preference}BHK`)
  if (memory.budget_max_cr) parts.push(`Past budget: ₹${memory.budget_max_cr}Cr`)
  if (memory.sector_preference) parts.push(`Past area interest: ${memory.sector_preference}`)
  if (memory.viewed_slugs?.length) parts.push(`Already viewed: ${memory.viewed_slugs.slice(0, 3).join(', ')}`)
  return parts.length ? `Returning user context: ${parts.join(' · ')}\nUse as defaults when not re-stated.\n` : ''
}

const BASE_SYSTEM_PROMPT = `You are RealtyPal — India's most honest AI real estate advisor AND a knowledgeable general assistant.

## Tools Available
You have EXACTLY EIGHT tools — never attempt any other:
1. search_properties — search Noida/Greater Noida property database
2. search_web — real-time web search (builder news, RERA, market trends)
3. get_commute_time — driving/transit time between two locations
4. calculate_emi — monthly EMI, total interest, total payment
5. calculate_stamp_duty — UP stamp duty and registration charges
6. calculate_gst — GST on property purchase
7. get_area_info — background on a Noida sector from Wikipedia
8. read_rera_page — fetch live RERA details from UP-RERA portal

## Who You Are
- Deeply knowledgeable across all major Indian cities
- Expert in the full home-buying journey
- Fluent in Hindi, Hinglish, and Indian English — match the user's language
- Honest and direct — show trade-offs, never oversell
- Think like a trusted senior friend who knows real estate, not a salesperson

## Property Database Rules
Call search_properties when: user gives any location + at least one more signal (BHK, budget, status, timeline).
DO NOT call when: no location given, pure knowledge questions, follow-ups about already-shown properties.
NEVER assume a city. If none given → ask "Which city or area are you looking in?"
Database covers Noida and Greater Noida only.

## After Search
Write 2-3 sentences MAX (under 100 words):
- Best-fit property and ONE specific reason
- ONE honest trade-off
- End with suggestion: "Want to compare these, check EMI, or book a site visit?"

## Calculations (use tools, not mental math)
- EMI: use calculate_emi tool
- Stamp duty: use calculate_stamp_duty tool  
- GST: use calculate_gst tool

## RERA
All new residential projects must be RERA registered. UP portal: up-rera.in
Always suggest verifying directly on the portal.

## Conversation Rules
1. One question per turn maximum
2. Location + any one signal → call search_properties immediately
3. Keep post-search notes under 100 words
4. Be direct and warm. No "Great question!" No unnecessary hedging.
5. Hindi/Hinglish: understand fully, respond in user's language
6. Never invent prices, possession dates, or amenities
7. For non-real-estate questions: answer helpfully from knowledge

## Stamp Duty Rates (2024)
- UP (Noida): 7% men, 6% women + 1% registration
- Delhi: 4% women, 6% men + 1% registration
- Haryana: 5-7% + 1% registration
- Maharashtra: 5% + 1% + LBT
- Karnataka: 3-5.6% + 1% registration
- Telangana: 4% + 0.5% + 1.5% transfer duty

## GST
- Under-construction: 5% (no ITC)
- Ready-to-move (OC): 0%
- Affordable (<45L + carpet <60sqm): 1%

## Home Loan Rates (2025)
SBI/HDFC/ICICI: 8.40–8.90%. Women co-borrower: 0.05% lower.`
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/lib/ai/prompts.ts
git commit -m "feat: add backend AI system prompts with Hinglish intent extraction rules"
```

---

## Task 8: Backend intent extractor

**Files:**
- Create: `backend/src/lib/ai/intent.ts`
- Create: `backend/src/lib/discovery.ts` (Intent type lives here)

- [ ] **Step 1: Create backend/src/lib/discovery.ts**

```typescript
// backend/src/lib/discovery.ts
import { prisma } from './db'

export interface Intent {
  bhk?: number[]
  budgetMin?: number
  budgetMax?: number
  possession?: 'immediate' | '1year' | '2year' | '3year+'
  sector?: string
  areaMin?: number
  areaMax?: number
  purpose?: 'endUse' | 'investment'
  builderName?: string
}

export type IntentState = 'COLD' | 'GATHERING' | 'READY_TO_SEARCH' | 'SHORTLISTED'

export function getIntentState(intent: Intent): IntentState {
  const hasBhk = (intent.bhk?.length ?? 0) > 0
  const hasBudget = !!intent.budgetMax
  if (!hasBhk && !hasBudget) return 'COLD'
  if (!hasBhk || !hasBudget) return 'GATHERING'
  return 'READY_TO_SEARCH'
}

export interface ScoredProject {
  id: string
  slug: string
  name: string
  builder: string
  thumbnailUrl: string
  bhkOptions: string
  priceRange: string
  carpetRange: string
  possessionLabel: string
  reraNumber: string
  reraUrl: string
  matchScore: number
  matchReason: string
  sector: string
  status: string
  city: string
}

export async function discoverProjects(intent: Intent): Promise<ScoredProject[]> {
  const projects = await prisma.project.findMany({
    where: intent.builderName
      ? { builder: { name: { contains: intent.builderName, mode: 'insensitive' } } }
      : undefined,
    include: {
      builder: { select: { name: true } },
      unit_types: true,
      images: { where: { type: 'hero' }, take: 1 },
    },
  })

  const threshold = intent.builderName && !intent.bhk?.length && !intent.budgetMax ? 0 : 30

  const scored = projects
    .map((p) => {
      const score = scoreProject(p, intent)
      if (score < threshold) return null

      const bhkSet = [...new Set(p.unit_types.map((u) => `${u.bhk}BHK`))].join(', ')
      const prices = p.unit_types.filter((u) => u.price_min_cr).map((u) => u.price_min_cr!)
      const maxPrices = p.unit_types.filter((u) => u.price_max_cr).map((u) => u.price_max_cr!)
      const minP = prices.length ? Math.min(...prices) : null
      const maxP = maxPrices.length ? Math.max(...maxPrices) : null
      const priceRange = minP != null
        ? maxP != null && maxP > minP
          ? `₹${minP.toFixed(2)}–${maxP.toFixed(2)}Cr`
          : `₹${minP.toFixed(2)}Cr+`
        : 'Price on request'

      const carpets = p.unit_types.filter((u) => u.carpet_area_sqft).map((u) => u.carpet_area_sqft!)
      const minC = carpets.length ? Math.min(...carpets) : null
      const maxC = carpets.length ? Math.max(...carpets) : null
      const carpetRange = minC != null
        ? maxC != null && maxC > minC ? `${minC}–${maxC} sqft` : `${minC} sqft`
        : ''

      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        builder: p.builder.name,
        thumbnailUrl: p.images[0]?.url ?? p.hero_image_url ?? '',
        bhkOptions: bhkSet,
        priceRange,
        carpetRange,
        possessionLabel: p.possession_label ?? '',
        reraNumber: p.rera_number ?? '',
        reraUrl: p.rera_url ?? '',
        matchScore: Math.round(score),
        matchReason: buildMatchReason(p, intent),
        sector: p.sector,
        status: p.status as string,
        city: p.city,
      } satisfies ScoredProject
    })
    .filter((p): p is ScoredProject => p !== null)

  scored.sort((a, b) => b.matchScore - a.matchScore)
  return scored.slice(0, 6)
}

function scoreProject(
  p: {
    unit_types: Array<{ bhk: number; price_min_cr: number | null; price_max_cr: number | null; carpet_area_sqft: number | null }>
    possession_date: Date | null
    sector: string
    hero_image_url: string | null
    rera_number: string | null
  },
  intent: Intent
): number {
  let score = 0

  // Budget (max 30)
  if (intent.budgetMax) {
    const minP = Math.min(...p.unit_types.filter((u) => u.price_min_cr).map((u) => u.price_min_cr!))
    if (isFinite(minP)) {
      const over = (minP - intent.budgetMax) / intent.budgetMax
      if (over <= 0) score += 30
      else if (over <= 0.05) score += 24
      else if (over <= 0.10) score += 18
      else if (over <= 0.20) score += 10
    }
  } else {
    score += 15
  }

  // BHK (max 25)
  if (intent.bhk?.length) {
    const bhks = p.unit_types.map((u) => u.bhk)
    score += intent.bhk.some((b) => bhks.includes(b)) ? 25 : 0
  } else {
    score += 12
  }

  // Possession (max 20)
  if (intent.possession && p.possession_date) {
    const months = (p.possession_date.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)
    if (intent.possession === 'immediate' && months <= 3) score += 20
    else if (intent.possession === '1year' && months <= 12) score += 20
    else if (intent.possession === '1year' && months <= 18) score += 14
    else if (intent.possession === '2year' && months <= 24) score += 20
    else if (intent.possession === '2year' && months <= 30) score += 14
    else if (intent.possession === '3year+') score += 20
    else score += 3
  } else if (!intent.possession) {
    score += 10
  } else {
    score += 5
  }

  // Sector (max 15)
  if (intent.sector) {
    const match = p.sector.toLowerCase().includes(intent.sector.toLowerCase())
      || intent.sector.toLowerCase().includes(p.sector.toLowerCase())
    score += match ? 15 : 3
  } else {
    score += 8
  }

  // Area (max 5)
  if (intent.areaMin || intent.areaMax) {
    const fits = p.unit_types.some((u) =>
      u.carpet_area_sqft &&
      (!intent.areaMin || u.carpet_area_sqft >= intent.areaMin) &&
      (!intent.areaMax || u.carpet_area_sqft <= intent.areaMax)
    )
    score += fits ? 5 : 0
  } else {
    score += 3
  }

  // Data quality (max 5)
  if (p.hero_image_url) score += 3
  if (p.rera_number) score += 2

  return score
}

function buildMatchReason(
  p: { unit_types: Array<{ bhk: number; price_min_cr: number | null }>; sector: string },
  intent: Intent
): string {
  const parts: string[] = []
  if (intent.bhk?.length) {
    const match = p.unit_types.find((u) => intent.bhk!.includes(u.bhk))
    if (match) parts.push(`${match.bhk}BHK available`)
  }
  if (intent.budgetMax) {
    const min = Math.min(...p.unit_types.filter((u) => u.price_min_cr).map((u) => u.price_min_cr!))
    if (isFinite(min) && min <= intent.budgetMax) parts.push('within budget')
  }
  if (intent.sector && p.sector.toLowerCase().includes(intent.sector.toLowerCase())) {
    parts.push(`in ${p.sector}`)
  }
  return parts.join(', ') || 'matches your search'
}
```

- [ ] **Step 2: Create backend/src/lib/ai/intent.ts**

```typescript
// backend/src/lib/ai/intent.ts
import Groq from 'groq-sdk'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { INTENT_EXTRACTION_PROMPT } from './prompts'
import type { Intent } from '../discovery'

const IntentSchema = z.object({
  bhk: z.array(z.number()).optional(),
  budgetMin: z.number().optional(),
  budgetMax: z.number().optional(),
  possession: z.enum(['immediate', '1year', '2year', '3year+']).optional(),
  sector: z.string().optional(),
  areaMin: z.number().optional(),
  areaMax: z.number().optional(),
  purpose: z.enum(['endUse', 'investment']).optional(),
  builderName: z.string().optional(),
})

function mergeIntent(previous: Intent, update: z.infer<typeof IntentSchema>): Intent {
  return {
    ...previous,
    ...Object.fromEntries(Object.entries(update).filter(([, v]) => v !== undefined)),
  } as Intent
}

function parseJson(raw: string, previous: Intent): Intent {
  const match = raw.match(/\{[\s\S]*\}/)
  const str = match ? match[0] : '{}'
  try {
    const result = IntentSchema.safeParse(JSON.parse(str))
    if (!result.success) {
      console.warn('[intent] schema mismatch:', result.error.message)
      return previous
    }
    return mergeIntent(previous, result.data)
  } catch {
    return previous
  }
}

async function extractWithGroq(msg: string, prev: Intent): Promise<Intent> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: INTENT_EXTRACTION_PROMPT },
      { role: 'user', content: `Previous intent: ${JSON.stringify(prev)}\n\nUser message: ${msg}` },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 256,
    temperature: 0.1,
  })
  return parseJson(completion.choices[0]?.message?.content ?? '{}', prev)
}

async function extractWithClaude(msg: string, prev: Intent): Promise<Intent> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    system: INTENT_EXTRACTION_PROMPT,
    messages: [{ role: 'user', content: `Previous intent: ${JSON.stringify(prev)}\n\nUser message: ${msg}` }],
  })
  const text = response.content[0]?.type === 'text' ? response.content[0].text : '{}'
  return parseJson(text, prev)
}

export async function extractIntent(message: string, previousIntent: Intent): Promise<Intent> {
  if (process.env.GROQ_API_KEY) {
    try {
      return await extractWithGroq(message, previousIntent)
    } catch (err) {
      console.warn('[intent] Groq failed, trying Claude:', (err as Error).message)
    }
  }
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return await extractWithClaude(message, previousIntent)
    } catch (err) {
      console.warn('[intent] Claude failed:', (err as Error).message)
    }
  }
  console.error('[intent] No AI keys set')
  return previousIntent
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/lib/discovery.ts backend/src/lib/ai/intent.ts
git commit -m "feat: add intent extractor (Groq + Claude fallback) and project discovery engine"
```

---

## Task 9: Backend memory and context builder

**Files:**
- Create: `backend/src/lib/ai/memory.ts`
- Create: `backend/src/lib/ai/context.ts`
- Create: `backend/src/lib/ai/compression.ts`

- [ ] **Step 1: Create backend/src/lib/ai/memory.ts**

```typescript
// backend/src/lib/ai/memory.ts
import { prisma } from '../db'
import type { Intent } from '../discovery'

export interface MemoryContext {
  bhk_preference?: number | null
  budget_max_cr?: number | null
  sector_preference?: string | null
  purpose?: string | null
  viewed_slugs: string[]
}

export async function getMemory(userId?: string, guestToken?: string): Promise<MemoryContext | null> {
  if (!userId && !guestToken) return null
  try {
    const mem = await prisma.userMemory.findFirst({
      where: userId ? { user_id: userId } : { guest_token: guestToken },
    })
    if (!mem) return null
    return {
      bhk_preference: mem.bhk_preference,
      budget_max_cr: mem.budget_max_cr,
      sector_preference: mem.sector_preference,
      purpose: mem.purpose,
      viewed_slugs: (mem.viewed_slugs as string[]) ?? [],
    }
  } catch {
    return null
  }
}

export async function upsertMemory(
  userId: string | undefined,
  guestToken: string | undefined,
  intent: Intent,
  viewedSlugs: string[]
): Promise<void> {
  if (!userId && !guestToken) return

  const where = userId ? { user_id: userId } : { guest_token: guestToken }
  const existing = await prisma.userMemory.findFirst({ where })
  const merged = [...new Set([...(existing?.viewed_slugs as string[] ?? []), ...viewedSlugs])]

  const data: Record<string, unknown> = { viewed_slugs: merged }
  if (intent.bhk?.length) data.bhk_preference = intent.bhk[0]
  if (intent.budgetMin) data.budget_min_cr = intent.budgetMin
  if (intent.budgetMax) data.budget_max_cr = intent.budgetMax
  if (intent.sector) data.sector_preference = intent.sector
  if (intent.purpose) data.purpose = intent.purpose

  const createData = {
    ...data,
    ...(userId ? { user_id: userId } : { guest_token: guestToken }),
  }

  try {
    if (existing) {
      await prisma.userMemory.update({ where: { id: existing.id }, data })
    } else {
      await prisma.userMemory.create({ data: createData as Parameters<typeof prisma.userMemory.create>[0]['data'] })
    }
  } catch (err) {
    console.warn('[memory] upsert failed:', (err as Error).message)
  }
}
```

- [ ] **Step 2: Create backend/src/lib/ai/compression.ts**

```typescript
// backend/src/lib/ai/compression.ts
import Groq from 'groq-sdk'

const COMPRESSION_THRESHOLD = 14   // messages before compressing
const KEEP_RECENT = 8               // always keep last N messages

const COMPRESSION_PROMPT = `Summarize this conversation in 3-4 sentences. Focus on:
1. What property criteria the user mentioned (BHK, budget, sector, timeline)
2. Any properties they reacted to positively or negatively
3. Any decisions or preferences expressed
Be factual, no filler. This summary replaces the full history for context efficiency.`

type Message = { role: 'user' | 'assistant'; content: string }

export async function maybeCompress(
  messages: Message[],
  existingSummary?: string | null
): Promise<{ messages: Message[]; newSummary: string | null }> {
  if (messages.length <= COMPRESSION_THRESHOLD) {
    return { messages, newSummary: null }
  }

  const toCompress = messages.slice(0, messages.length - KEEP_RECENT)
  const recent = messages.slice(messages.length - KEEP_RECENT)

  if (!process.env.GROQ_API_KEY) {
    // No key: just truncate, no summary
    return { messages: recent, newSummary: existingSummary ?? null }
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
    const context = toCompress.map((m) => `${m.role}: ${m.content}`).join('\n')
    const res = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: COMPRESSION_PROMPT },
        { role: 'user', content: context },
      ],
      max_tokens: 256,
      temperature: 0.1,
    })
    const summary = res.choices[0]?.message?.content?.trim() ?? ''
    const combined = existingSummary ? `${existingSummary}\n\n${summary}` : summary
    return { messages: recent, newSummary: combined }
  } catch {
    return { messages: recent, newSummary: existingSummary ?? null }
  }
}
```

- [ ] **Step 3: Create backend/src/lib/ai/context.ts**

```typescript
// backend/src/lib/ai/context.ts
import type { MemoryContext } from './memory'

type Message = { role: 'user' | 'assistant'; content: string }

export function buildContextMessages(
  currentMessage: string,
  chatHistory: Message[],
  summary?: string | null,
  memory?: MemoryContext | null
): { systemSuffix: string; messages: Array<{ role: 'user' | 'assistant'; content: string }> } {
  // Build system prompt suffix from memory + summary
  const parts: string[] = []

  if (summary) {
    parts.push(`## Conversation Summary\n${summary}`)
  }
  if (memory && hasMemoryContent(memory)) {
    parts.push(`## User Memory\n${formatMemory(memory)}`)
  }

  const systemSuffix = parts.length ? '\n\n' + parts.join('\n\n') : ''

  // Filter bad messages
  const clean = chatHistory.filter(
    (m) => m.content && m.content !== '[streamed]' && m.content.length > 0
  )

  // Normalize to alternating user/assistant (required by Claude)
  const normalized: Message[] = []
  let start = 0
  while (start < clean.length && clean[start].role === 'assistant') start++
  for (let i = start; i < clean.length; i++) {
    const msg = clean[i]
    const last = normalized[normalized.length - 1]
    if (last && last.role === msg.role) {
      last.content += '\n' + msg.content
    } else {
      normalized.push({ role: msg.role, content: msg.content })
    }
  }

  return {
    systemSuffix,
    messages: [...normalized, { role: 'user', content: currentMessage }],
  }
}

function hasMemoryContent(m: MemoryContext): boolean {
  return !!(m.bhk_preference || m.budget_max_cr || m.sector_preference || m.viewed_slugs?.length)
}

function formatMemory(m: MemoryContext): string {
  const parts: string[] = []
  if (m.bhk_preference) parts.push(`Prefers ${m.bhk_preference}BHK`)
  if (m.budget_max_cr) parts.push(`Budget up to ₹${m.budget_max_cr}Cr`)
  if (m.sector_preference) parts.push(`Interested in ${m.sector_preference}`)
  if (m.purpose) parts.push(`Purpose: ${m.purpose}`)
  if (m.viewed_slugs?.length) parts.push(`Seen: ${m.viewed_slugs.slice(0, 4).join(', ')}`)
  return parts.join(' · ') + '\nUse as defaults when not re-stated in this session.'
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/lib/ai/memory.ts backend/src/lib/ai/context.ts backend/src/lib/ai/compression.ts
git commit -m "feat: add user memory, context builder, and conversation compression"
```

---

## Task 10: Backend streaming (groq.ts + claude.ts)

**Files:**
- Create: `backend/src/lib/ai/groq.ts`
- Create: `backend/src/lib/ai/claude.ts`

- [ ] **Step 1: Create backend/src/lib/ai/groq.ts**

```typescript
// backend/src/lib/ai/groq.ts
import Groq from 'groq-sdk'

type Message = { role: 'system' | 'user' | 'assistant'; content: string }
type SendFn = (event: string, data: Record<string, unknown>) => void

export async function streamWithGroq(
  system: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  send: SendFn
): Promise<string> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })

  const msgs: Message[] = [
    { role: 'system', content: system },
    ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ]

  const stream = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: msgs,
    stream: true,
    max_tokens: 1024,
    temperature: 0.7,
  })

  let fullText = ''
  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content
    if (token) {
      fullText += token
      send('token', { token })
    }
  }
  return fullText
}
```

- [ ] **Step 2: Create backend/src/lib/ai/claude.ts**

```typescript
// backend/src/lib/ai/claude.ts
import Anthropic from '@anthropic-ai/sdk'

type Message = { role: 'user' | 'assistant'; content: string }
type SendFn = (event: string, data: Record<string, unknown>) => void

export async function streamWithClaude(
  system: string,
  messages: Message[],
  send: SendFn
): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  const stream = await client.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system,
    messages,
  })

  let fullText = ''
  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      fullText += chunk.delta.text
      send('token', { token: chunk.delta.text })
    }
  }
  return fullText
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/lib/ai/groq.ts backend/src/lib/ai/claude.ts
git commit -m "feat: add Groq and Claude streaming helpers"
```

---

## Task 11: Backend chat SSE route

**Files:**
- Create: `backend/src/routes/chat.ts`

- [ ] **Step 1: Create backend/src/routes/chat.ts**

```typescript
// backend/src/routes/chat.ts
import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/db'
import { checkRateLimit } from '../lib/redis'
import { extractIntent, getIntentState, discoverProjects } from '../lib/discovery'
import { getMemory, upsertMemory } from '../lib/ai/memory'
import { buildContextMessages } from '../lib/ai/context'
import { maybeCompress } from '../lib/ai/compression'
import { buildAdvisorSystemPrompt } from '../lib/ai/prompts'
import { streamWithGroq } from '../lib/ai/groq'
import { streamWithClaude } from '../lib/ai/claude'

const router = Router()

const BodySchema = z.object({
  message: z.string().min(1).max(2000).trim(),
  sessionId: z.string().uuid().optional(),
  guestToken: z.string().optional(),
  intent: z.record(z.unknown()).optional(),   // previous intent from client
})

function sseWrite(res: Response, event: string, data: Record<string, unknown>): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

router.post('/', async (req: Request, res: Response) => {
  const parsed = BodySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body' })
    return
  }

  const { message, sessionId, guestToken } = parsed.data
  const prevIntent = (parsed.data.intent ?? {}) as Record<string, unknown>
  const userId = req.headers['x-user-id'] as string | undefined

  // Require either userId or guestToken
  if (!userId && !guestToken) {
    res.status(400).json({ error: 'x-user-id header or guestToken body field required' })
    return
  }

  // Rate limit: 20 messages per 60s per user/guest
  const rlKey = userId ?? guestToken!
  const { allowed, remaining } = await checkRateLimit(rlKey)
  if (!allowed) {
    res.status(429).json({ error: 'Too many messages. Please wait a moment.' })
    return
  }

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.setHeader('X-RateLimit-Remaining', String(remaining))
  res.flushHeaders()

  const send = (event: string, data: Record<string, unknown>) => sseWrite(res, event, data)

  try {
    // 1. Extract intent (non-blocking — fires before we fetch history)
    const [intent, memory] = await Promise.all([
      extractIntent(message, prevIntent as Parameters<typeof extractIntent>[1]),
      getMemory(userId, guestToken),
    ])

    const intentState = getIntentState(intent)
    send('intent', { intent, intentState })

    // 2. Discover projects if intent is actionable
    let projects: Awaited<ReturnType<typeof discoverProjects>> = []
    if (intentState === 'READY_TO_SEARCH' || intentState === 'SHORTLISTED') {
      projects = await discoverProjects(intent)
      if (projects.length > 0) send('properties', { projects })
    }

    // 3. Load session history + apply compression
    let chatHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
    let existingSummary: string | null = null
    let currentSessionId = sessionId

    if (sessionId) {
      const session = await prisma.chatSession.findUnique({
        where: { id: sessionId },
        include: {
          messages: { orderBy: { created_at: 'asc' }, select: { role: true, content: true } },
        },
      })
      if (session) {
        existingSummary = session.summary ?? null
        chatHistory = session.messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }))
      }
    }

    // Compress if needed
    const { messages: compressedHistory, newSummary } = await maybeCompress(chatHistory, existingSummary)

    // 4. Build context and stream
    const { systemSuffix, messages } = buildContextMessages(message, compressedHistory, newSummary ?? existingSummary, memory)
    const systemPrompt = buildAdvisorSystemPrompt(intent, projects.length, memory) + systemSuffix

    let fullText = ''
    if (process.env.GROQ_API_KEY) {
      try {
        fullText = await streamWithGroq(systemPrompt, messages, send)
      } catch (err) {
        console.warn('[chat] Groq stream failed, falling back to Claude:', (err as Error).message)
        if (process.env.ANTHROPIC_API_KEY) {
          fullText = await streamWithClaude(systemPrompt, messages, send)
        } else {
          throw err
        }
      }
    } else if (process.env.ANTHROPIC_API_KEY) {
      fullText = await streamWithClaude(systemPrompt, messages, send)
    } else {
      throw new Error('No AI API keys configured')
    }

    // 5. Persist session + messages + memory (fire-and-forget after stream)
    const persistPromises: Promise<unknown>[] = []

    if (!currentSessionId) {
      const session = await prisma.chatSession.create({
        data: {
          ...(userId ? { user_id: userId } : { guest_token: guestToken }),
          title: message.slice(0, 60),
          chat_phase: intentState,
          message_count: 2,
          ...(newSummary ? { summary: newSummary } : {}),
        },
      })
      currentSessionId = session.id
    } else {
      persistPromises.push(
        prisma.chatSession.update({
          where: { id: currentSessionId },
          data: {
            chat_phase: intentState,
            message_count: { increment: 2 },
            ...(newSummary ? { summary: newSummary } : {}),
            ...(projects.length > 0 ? { last_projects: projects as unknown as Parameters<typeof prisma.chatSession.update>[0]['data']['last_projects'] } : {}),
          },
        })
      )
    }

    persistPromises.push(
      prisma.chatMessage.createMany({
        data: [
          {
            session_id: currentSessionId,
            role: 'user',
            content: message,
            intent_snapshot: intent as unknown as Parameters<typeof prisma.chatMessage.createMany>[0]['data'][number]['intent_snapshot'],
          },
          {
            session_id: currentSessionId,
            role: 'assistant',
            content: fullText || '[streamed]',
          },
        ],
      })
    )

    if (projects.length > 0) {
      persistPromises.push(
        upsertMemory(userId, guestToken, intent, projects.map((p) => p.slug))
      )
    }

    send('done', { sessionId: currentSessionId, intentState })

    await Promise.all(persistPromises).catch((e) => console.error('[chat] persist error:', e))
  } catch (err) {
    console.error('[chat] error:', err)
    send('error', { message: "I'm having trouble right now. Please try again in a moment." })
  } finally {
    res.end()
  }
})

export default router
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/routes/chat.ts
git commit -m "feat: add backend chat SSE route with intent extraction, memory, and compression"
```

---

## Task 12: Backend sessions, projects, saved, leads, admin routes

**Files:**
- Create: `backend/src/routes/sessions.ts`
- Create: `backend/src/routes/projects.ts`
- Create: `backend/src/routes/saved.ts`
- Create: `backend/src/routes/leads.ts`
- Create: `backend/src/routes/admin.ts`

- [ ] **Step 1: Create backend/src/routes/sessions.ts**

```typescript
// backend/src/routes/sessions.ts
import { Router, Request, Response } from 'express'
import { prisma } from '../lib/db'

const router = Router()

// GET /api/sessions — list sessions for user or guest
router.get('/', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string | undefined
  const guestToken = req.query.guestToken as string | undefined

  if (!userId && !guestToken) {
    res.status(400).json({ error: 'x-user-id or guestToken required' })
    return
  }

  const sessions = await prisma.chatSession.findMany({
    where: userId ? { user_id: userId } : { guest_token: guestToken },
    orderBy: { last_active: 'desc' },
    take: 20,
    select: {
      id: true,
      title: true,
      chat_phase: true,
      message_count: true,
      last_active: true,
      last_projects: true,
    },
  })

  res.json({ sessions })
})

// GET /api/sessions/:id — single session with messages
router.get('/:id', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string | undefined
  const guestToken = req.query.guestToken as string | undefined

  const session = await prisma.chatSession.findUnique({
    where: { id: req.params.id },
    include: {
      messages: {
        orderBy: { created_at: 'asc' },
        select: { id: true, role: true, content: true, created_at: true },
      },
    },
  })

  if (!session) { res.status(404).json({ error: 'Session not found' }); return }

  // Verify ownership
  const owned = (userId && session.user_id === userId) || (guestToken && session.guest_token === guestToken)
  if (!owned) { res.status(403).json({ error: 'Forbidden' }); return }

  res.json({ session })
})

// POST /api/sessions/migrate — link guest sessions to user on signup
router.post('/migrate', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string
  const { guestToken } = req.body as { guestToken: string }

  if (!userId || !guestToken) {
    res.status(400).json({ error: 'x-user-id header and guestToken body required' })
    return
  }

  const [sessions, memory] = await Promise.all([
    prisma.chatSession.updateMany({
      where: { guest_token: guestToken, user_id: null },
      data: { user_id: userId },
    }),
    prisma.userMemory.findFirst({ where: { guest_token: guestToken } }),
  ])

  if (memory) {
    await prisma.userMemory.upsert({
      where: { user_id: userId },
      create: { ...memory, id: undefined, user_id: userId, guest_token: null },
      update: {
        viewed_slugs: memory.viewed_slugs,
        saved_slugs: memory.saved_slugs,
        bhk_preference: memory.bhk_preference,
        budget_max_cr: memory.budget_max_cr,
        sector_preference: memory.sector_preference,
      },
    })
  }

  res.json({ migrated: sessions.count })
})

// GET /api/sessions/re-engagement — last active session for banner
router.get('/re-engagement/latest', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string | undefined
  const guestToken = req.query.guestToken as string | undefined

  if (!userId && !guestToken) { res.json({ session: null }); return }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const session = await prisma.chatSession.findFirst({
    where: {
      ...(userId ? { user_id: userId } : { guest_token: guestToken }),
      last_active: { gt: sevenDaysAgo },
      chat_phase: { in: ['GATHERING', 'READY_TO_SEARCH', 'SHORTLISTED', 'ADVISOR'] },
    },
    orderBy: { last_active: 'desc' },
    select: { id: true, title: true, chat_phase: true, last_active: true, last_projects: true },
  })

  res.json({ session })
})

export default router
```

- [ ] **Step 2: Create backend/src/routes/projects.ts**

```typescript
// backend/src/routes/projects.ts
import { Router, Request, Response } from 'express'
import { prisma } from '../lib/db'

const router = Router()

router.get('/', async (req: Request, res: Response) => {
  const { sector, bhk, budget_max_cr, status, city } = req.query as Record<string, string>

  const projects = await prisma.project.findMany({
    where: {
      ...(city && { city: { contains: city, mode: 'insensitive' } }),
      ...(sector && { sector: { contains: sector, mode: 'insensitive' } }),
      ...(status && { status: status as Parameters<typeof prisma.project.findMany>[0]['where']['status'] }),
      ...(bhk && {
        unit_types: { some: { bhk: parseInt(bhk) } },
      }),
      ...(budget_max_cr && {
        unit_types: { some: { price_min_cr: { lte: parseFloat(budget_max_cr) } } },
      }),
    },
    include: {
      builder: { select: { name: true, slug: true } },
      unit_types: { select: { bhk: true, price_min_cr: true, price_max_cr: true, carpet_area_sqft: true } },
      images: { where: { type: 'hero' }, take: 1, select: { url: true } },
    },
    take: 20,
  })

  res.json({ projects })
})

router.get('/:slug', async (req: Request, res: Response) => {
  const project = await prisma.project.findUnique({
    where: { slug: req.params.slug },
    include: {
      builder: true,
      unit_types: true,
      images: { orderBy: { sort_order: 'asc' } },
      amenities: true,
      connectivity: { orderBy: { distance_km: 'asc' } },
    },
  })

  if (!project) { res.status(404).json({ error: 'Not found' }); return }
  res.json({ project })
})

export default router
```

- [ ] **Step 3: Create backend/src/routes/saved.ts**

```typescript
// backend/src/routes/saved.ts
import { Router, Request, Response } from 'express'
import { prisma } from '../lib/db'

const router = Router()

router.get('/', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string
  if (!userId) { res.status(401).json({ error: 'Auth required' }); return }

  const saved = await prisma.savedProperty.findMany({
    where: { user_id: userId },
    include: {
      project: {
        include: {
          builder: { select: { name: true } },
          images: { where: { type: 'hero' }, take: 1 },
          unit_types: { select: { bhk: true, price_min_cr: true, price_max_cr: true } },
        },
      },
    },
    orderBy: { saved_at: 'desc' },
  })

  res.json({ saved })
})

router.post('/', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string
  const { projectId } = req.body as { projectId: string }
  if (!userId) { res.status(401).json({ error: 'Auth required' }); return }
  if (!projectId) { res.status(400).json({ error: 'projectId required' }); return }

  try {
    const saved = await prisma.savedProperty.create({ data: { user_id: userId, project_id: projectId } })
    res.status(201).json({ saved })
  } catch {
    // Unique constraint = already saved
    res.status(409).json({ error: 'Already saved' })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string
  if (!userId) { res.status(401).json({ error: 'Auth required' }); return }

  await prisma.savedProperty.deleteMany({ where: { id: req.params.id, user_id: userId } })
  res.json({ ok: true })
})

export default router
```

- [ ] **Step 4: Create backend/src/routes/leads.ts**

```typescript
// backend/src/routes/leads.ts
import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/db'

const router = Router()

const CallbackSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(10),
  projectName: z.string().optional(),
  projectSlug: z.string().optional(),
  guestToken: z.string().optional(),
})

const SiteVisitSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(10),
  projectSlug: z.string().min(1),
  projectName: z.string(),
  visitDate: z.string(),
  timeSlot: z.string(),
  guestToken: z.string().optional(),
})

router.post('/callback', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string | undefined
  const parsed = CallbackSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'Invalid request' }); return }

  const { name, phone, projectName, projectSlug, guestToken } = parsed.data
  const cb = await prisma.callbackRequest.create({
    data: { name, phone, project_name: projectName, project_slug: projectSlug, user_id: userId, guest_token: guestToken },
  })

  // Fire webhook (no await — don't block response)
  fireWebhook('callback_requested', { name, phone, projectName }).catch(() => {})

  res.status(201).json({ callback: cb })
})

router.post('/site-visit', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string | undefined
  const parsed = SiteVisitSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'Invalid request' }); return }

  const { name, phone, projectSlug, projectName, visitDate, timeSlot, guestToken } = parsed.data

  // Find project ID
  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true } })
  if (!project) { res.status(404).json({ error: 'Project not found' }); return }

  const sv = await prisma.siteVisitRequest.create({
    data: {
      project_id: project.id,
      project_slug: projectSlug,
      project_name: projectName,
      name, phone,
      visit_date: new Date(visitDate),
      time_slot: timeSlot,
      ...(userId ? {} : {}),   // No user_id column in current schema — just store contact
    },
  })

  fireWebhook('site_visit_requested', { name, phone, projectName, visitDate, timeSlot }).catch(() => {})

  res.status(201).json({ siteVisit: sv })
})

async function fireWebhook(event: string, data: Record<string, unknown>) {
  const url = process.env.WEBHOOK_URL
  if (!url) return
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, data, ts: Date.now() }),
  })
}

export default router
```

- [ ] **Step 5: Create backend/src/routes/admin.ts**

```typescript
// backend/src/routes/admin.ts
import { Router, Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/db'

const router = Router()

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const secret = req.headers['x-admin-secret'] as string
  if (secret !== process.env.ADMIN_SECRET) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }
  next()
}

router.use(requireAdmin)

router.get('/stats', async (_req, res) => {
  const [projects, sessions, leads, callbacks] = await Promise.all([
    prisma.project.count(),
    prisma.chatSession.count(),
    prisma.siteVisitRequest.count(),
    prisma.callbackRequest.count(),
  ])
  res.json({ projects, sessions, leads, callbacks })
})

router.get('/leads', async (_req, res) => {
  const [siteVisits, callbacks] = await Promise.all([
    prisma.siteVisitRequest.findMany({ orderBy: { created_at: 'desc' }, take: 50 }),
    prisma.callbackRequest.findMany({ orderBy: { created_at: 'desc' }, take: 50 }),
  ])
  res.json({ siteVisits, callbacks })
})

export default router
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/
git commit -m "feat: add backend routes (sessions, projects, saved, leads, admin)"
```

---

## Task 13: Generate Prisma client for backend and verify server starts

**Files:** none (verification task)

- [ ] **Step 1: Generate Prisma client for backend**

```bash
cd backend && npm run db:generate
```

Expected: `✓ Generated Prisma Client`

- [ ] **Step 2: Start backend dev server**

```bash
cd backend && npm run dev
```

Expected output:
```
[backend] listening on :3001
[backend] env check: { GROQ_API_KEY: true, ANTHROPIC_API_KEY: false, DATABASE_URL: true, UPSTASH_REDIS_REST_URL: false }
```

- [ ] **Step 3: Health check**

```bash
curl http://localhost:3001/api/health
```

Expected: `{"ok":true,"ts":...}`

- [ ] **Step 4: Test chat endpoint**

```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user-123" \
  -d '{"message":"3 BHK under 2 crore in Sector 150"}' \
  --no-buffer
```

Expected: SSE stream with `event: intent`, `event: properties`, `event: token`, `event: done`

- [ ] **Step 5: Commit**

```bash
git commit -m "chore: verify backend starts and chat SSE works"
```

---

## Task 14: Frontend backend-api.ts client

**Files:**
- Create: `frontend/lib/backend-api.ts`

- [ ] **Step 1: Create frontend/lib/backend-api.ts**

```typescript
// frontend/lib/backend-api.ts
// Client for the Express backend (http://localhost:3001)

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001'

export interface ScoredProject {
  id: string
  slug: string
  name: string
  builder: string
  thumbnailUrl: string
  bhkOptions: string
  priceRange: string
  carpetRange: string
  possessionLabel: string
  reraNumber: string
  matchScore: number
  matchReason: string
  sector: string
  status: string
  city: string
}

export interface IntentState {
  intent: Record<string, unknown>
  intentState: 'COLD' | 'GATHERING' | 'READY_TO_SEARCH' | 'SHORTLISTED'
}

export type SSEEvent =
  | { type: 'intent'; intent: Record<string, unknown>; intentState: string }
  | { type: 'properties'; projects: ScoredProject[] }
  | { type: 'token'; token: string }
  | { type: 'done'; sessionId: string; intentState: string }
  | { type: 'error'; message: string }

export function streamChat(
  message: string,
  options: {
    sessionId?: string
    userId?: string
    guestToken?: string
    intent?: Record<string, unknown>
    onEvent: (event: SSEEvent) => void
    onDone?: () => void
    signal?: AbortSignal
  }
): void {
  const controller = options.signal ? undefined : new AbortController()
  const signal = options.signal ?? controller?.signal

  fetch(`${BACKEND}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(options.userId ? { 'x-user-id': options.userId } : {}),
    },
    body: JSON.stringify({
      message,
      sessionId: options.sessionId,
      guestToken: options.guestToken,
      intent: options.intent,
    }),
    signal,
  }).then(async (res) => {
    if (!res.ok || !res.body) {
      options.onEvent({ type: 'error', message: 'Failed to connect to chat service' })
      options.onDone?.()
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split('\n\n')
      buffer = parts.pop() ?? ''

      for (const part of parts) {
        if (!part.trim()) continue
        const eventLine = part.match(/^event: (\w+)/m)
        const dataLine = part.match(/^data: (.+)/m)
        if (!eventLine || !dataLine) continue

        const eventType = eventLine[1]
        try {
          const data = JSON.parse(dataLine[1])
          options.onEvent({ type: eventType, ...data } as SSEEvent)
        } catch { /* ignore parse errors */ }
      }
    }
    options.onDone?.()
  }).catch((err) => {
    if ((err as Error).name !== 'AbortError') {
      options.onEvent({ type: 'error', message: 'Connection error. Please try again.' })
    }
    options.onDone?.()
  })
}

export async function getSessions(userId?: string, guestToken?: string) {
  const url = new URL(`${BACKEND}/api/sessions`)
  if (guestToken && !userId) url.searchParams.set('guestToken', guestToken)

  const res = await fetch(url.toString(), {
    headers: userId ? { 'x-user-id': userId } : {},
  })
  if (!res.ok) return { sessions: [] }
  return res.json() as Promise<{ sessions: Array<{
    id: string; title: string | null; chat_phase: string;
    message_count: number; last_active: string;
  }> }>
}

export async function getReEngagement(userId?: string, guestToken?: string) {
  const url = new URL(`${BACKEND}/api/sessions/re-engagement/latest`)
  if (guestToken && !userId) url.searchParams.set('guestToken', guestToken)

  const res = await fetch(url.toString(), {
    headers: userId ? { 'x-user-id': userId } : {},
  })
  if (!res.ok) return { session: null }
  return res.json() as Promise<{ session: {
    id: string; title: string | null; chat_phase: string; last_active: string;
  } | null }>
}

export async function migrateSessions(userId: string, guestToken: string) {
  await fetch(`${BACKEND}/api/sessions/migrate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
    body: JSON.stringify({ guestToken }),
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/lib/backend-api.ts
git commit -m "feat: add frontend backend API client with SSE stream parser"
```

---

## Task 15: Update discover page (remove auth gate, add guest token)

**Files:**
- Modify: `frontend/app/discover/page.tsx`

The current page redirects to `/auth` if no session. We want anonymous users to use the chat freely. Guest token from localStorage replaces the userId for anonymous sessions.

- [ ] **Step 1: Replace frontend/app/discover/page.tsx**

```typescript
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import DiscoveryContent from '@/components/DiscoveryContent';
import { createClient } from '@/lib/supabase';

function generateGuestToken(): string {
  return 'guest-' + crypto.randomUUID()
}

function getOrCreateGuestToken(): string {
  let token = localStorage.getItem('guest_token')
  if (!token) {
    token = generateGuestToken()
    localStorage.setItem('guest_token', token)
  }
  return token
}

export default function DiscoverPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    // Check for existing cached user
    const cachedId = localStorage.getItem('user_id');
    if (cachedId) {
      setUserId(cachedId);
      setReady(true);
    } else {
      // Set up as guest immediately — don't block on auth
      const token = getOrCreateGuestToken();
      setGuestToken(token);
      setReady(true);
    }

    // Validate/upgrade in background
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        const uid = data.session.user.id;
        localStorage.setItem('user_id', uid);
        setUserId(uid);
        setGuestToken(null);
      }
    }).catch(() => {
      // Keep guest token on auth failure — don't redirect
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        const uid = session.user.id;
        localStorage.setItem('user_id', uid);
        setUserId(uid);
        setGuestToken(null);
      } else {
        localStorage.removeItem('user_id');
        setUserId(null);
        const token = getOrCreateGuestToken();
        setGuestToken(token);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh] bg-[#E6E6E6]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] bg-[#E6E6E6] overflow-hidden no-overscroll">
      <Sidebar userId={userId} />
      <main className="flex-1 h-full flex flex-col min-h-0 overflow-hidden relative">
        <Suspense fallback={<div className="flex-1 flex items-center justify-center text-gray-500">Loading...</div>}>
          <DiscoveryContent userId={userId} guestToken={guestToken} />
        </Suspense>
      </main>
    </div>
  );
}
```

Note: `DiscoveryContent` will need a `guestToken` prop. This will cause a TypeScript error until Task 16 is complete.

- [ ] **Step 2: Commit**

```bash
git add frontend/app/discover/page.tsx
git commit -m "feat: remove auth gate from discover page, add guest token support"
```

---

## Task 16: ReEngagementBanner component

**Files:**
- Create: `frontend/components/chat/ReEngagementBanner.tsx`

- [ ] **Step 1: Create ReEngagementBanner.tsx**

```typescript
// frontend/components/chat/ReEngagementBanner.tsx
'use client';

import { useState, useEffect } from 'react';
import { getReEngagement } from '@/lib/backend-api';

interface Props {
  userId?: string | null;
  guestToken?: string | null;
  onResume: (sessionId: string) => void;
  onDismiss: () => void;
}

interface ReEngagementSession {
  id: string;
  title: string | null;
  chat_phase: string;
  last_active: string;
}

export default function ReEngagementBanner({ userId, guestToken, onResume, onDismiss }: Props) {
  const [session, setSession] = useState<ReEngagementSession | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!userId && !guestToken) return;
    getReEngagement(userId ?? undefined, guestToken ?? undefined).then(({ session }) => {
      if (session) {
        setSession(session);
        setVisible(true);
      }
    }).catch(() => {});
  }, [userId, guestToken]);

  if (!visible || !session) return null;

  const dismiss = () => {
    setVisible(false);
    onDismiss();
  };

  const timeAgo = (() => {
    const ms = Date.now() - new Date(session.last_active).getTime();
    const hours = Math.floor(ms / 3600000);
    if (hours < 1) return 'just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  })();

  return (
    <div className="mx-4 mt-3 mb-1 rounded-xl border border-blue-100 bg-blue-50/80 backdrop-blur-sm px-4 py-3 flex items-center gap-3 shadow-sm">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-blue-900 leading-tight truncate">
          Welcome back! {session.title ? `"${session.title}"` : 'Continue your search'}
        </p>
        <p className="text-xs text-blue-600 mt-0.5">{timeAgo}</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => { setVisible(false); onResume(session.id); }}
          className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-colors"
        >
          Continue
        </button>
        <button
          onClick={dismiss}
          className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1.5"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/chat/ReEngagementBanner.tsx
git commit -m "feat: add ReEngagementBanner component with session resume"
```

---

## Task 17: StatusSteps component

**Files:**
- Create: `frontend/components/chat/StatusSteps.tsx`

- [ ] **Step 1: Create StatusSteps.tsx**

```typescript
// frontend/components/chat/StatusSteps.tsx
'use client';

interface Props {
  phase: 'extracting' | 'searching' | 'generating' | null;
}

const STEPS = [
  { id: 'extracting', label: 'Extracting intent' },
  { id: 'searching', label: 'Searching properties' },
  { id: 'generating', label: 'Writing response' },
] as const;

export default function StatusSteps({ phase }: Props) {
  if (!phase) return null;

  const activeIndex = STEPS.findIndex((s) => s.id === phase);

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-xs text-gray-500">
      {STEPS.map((step, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        return (
          <div key={step.id} className="flex items-center gap-1.5">
            <span
              className={[
                'w-1.5 h-1.5 rounded-full transition-all',
                done ? 'bg-green-400' : active ? 'bg-blue-400 animate-pulse' : 'bg-gray-200',
              ].join(' ')}
            />
            <span className={active ? 'text-blue-600 font-medium' : done ? 'text-green-600' : 'text-gray-300'}>
              {step.label}
            </span>
            {i < STEPS.length - 1 && <span className="text-gray-200">›</span>}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/chat/StatusSteps.tsx
git commit -m "feat: add StatusSteps component (extracting intent → searching → generating)"
```

---

## Task 18: Wire DiscoveryContent to backend + add re-engagement + status steps

**Files:**
- Modify: `frontend/components/DiscoveryContent.tsx`

The current `DiscoveryContent` calls `/api/v1/chat` (Next.js API route). We need to update it to call the Express backend via `backend-api.ts`.

- [ ] **Step 1: Read current DiscoveryContent.tsx to understand the interface**

```bash
head -100 frontend/components/DiscoveryContent.tsx
```

- [ ] **Step 2: Add guestToken prop and wire to backend**

Find the top of `DiscoveryContent.tsx`. The component currently accepts `{ userId }`. Add `guestToken`:

```typescript
// Add to Props interface
interface Props {
  userId: string | null;
  guestToken?: string | null;  // ← ADD
}
```

Find the chat submission logic (usually a function like `sendMessage` or `handleSubmit`). The current code calls:
```typescript
fetch('/api/v1/chat', { ... headers: { 'x-user-id': userId } ... })
```

Replace this fetch call with `streamChat` from `backend-api.ts`:

```typescript
import { streamChat, getReEngagement } from '@/lib/backend-api';
import ReEngagementBanner from '@/components/chat/ReEngagementBanner';
import StatusSteps from '@/components/chat/StatusSteps';
```

In the send/submit function, replace the fetch with:

```typescript
streamChat(message, {
  sessionId: currentSessionId ?? undefined,
  userId: userId ?? undefined,
  guestToken: guestToken ?? undefined,
  intent: currentIntent,
  onEvent: (event) => {
    if (event.type === 'intent') {
      setCurrentIntent(event.intent);
      setStatusPhase('searching');
    } else if (event.type === 'properties') {
      setProjects(event.projects);
      setStatusPhase('generating');
    } else if (event.type === 'token') {
      setStreamingText((prev) => prev + event.token);
    } else if (event.type === 'done') {
      setCurrentSessionId(event.sessionId);
      setStatusPhase(null);
      finalizeMessage();
    } else if (event.type === 'error') {
      setStatusPhase(null);
      setError(event.message);
    }
  },
  onDone: () => setIsStreaming(false),
});
```

Add state for status phase:
```typescript
const [statusPhase, setStatusPhase] = useState<'extracting' | 'searching' | 'generating' | null>(null);
const [currentIntent, setCurrentIntent] = useState<Record<string, unknown>>({});
```

Set `statusPhase` to `'extracting'` when the user submits a message.

Add `<ReEngagementBanner>` and `<StatusSteps>` to the JSX:
```tsx
{/* After chat messages, before input */}
<StatusSteps phase={statusPhase} />
```

Add `<ReEngagementBanner>` at the top of the chat area:
```tsx
<ReEngagementBanner
  userId={userId}
  guestToken={guestToken}
  onResume={(id) => setCurrentSessionId(id)}
  onDismiss={() => {}}
/>
```

**Important**: The exact changes depend on the current shape of `DiscoveryContent.tsx`. Read the file first (it is 26KB per the file listing), then apply these changes surgically. Do NOT rewrite the whole component — only change the fetch call and add the new components.

- [ ] **Step 3: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Fix any type errors. Common issues: `guestToken` prop not in Sidebar's expected props, `intent` type mismatch.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/DiscoveryContent.tsx
git commit -m "feat: wire DiscoveryContent to Express backend, add re-engagement banner and status steps"
```

---

## Task 19: End-to-end smoke test

**Files:** none (verification task)

- [ ] **Step 1: Start both servers**

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

- [ ] **Step 2: Open http://localhost:3000/discover**

Expected: Page loads without redirect to /auth. Guest token created in localStorage.

- [ ] **Step 3: Test Hinglish query**

Type: `do BHK ek crore mein chahiye Sector 150 mein`

Expected:
- StatusSteps shows extracting → searching → generating
- Properties panel shows results (if data seeded)
- AI response in English

- [ ] **Step 4: Test session persistence**

Refresh page. Expected: ReEngagementBanner appears with previous search context.

- [ ] **Step 5: Test backend health**

```bash
curl http://localhost:3001/api/health
curl http://localhost:3001/api/projects?sector=Sector+150
```

Expected: `{ ok: true }` and project list.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete Phase 1 rebuild — Express backend, AI engine, guest tokens, re-engagement"
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ Express + Next.js split architecture
- ✅ User memory layer (persistent across sessions via DB)
- ✅ Conversation compression (maybeCompress with threshold=14, keep=8)
- ✅ Hindi/Hinglish intent extraction (INTENT_EXTRACTION_PROMPT with mappings)
- ✅ Intent state machine (COLD → GATHERING → READY_TO_SEARCH → SHORTLISTED)
- ✅ Guest token support (anonymous browsing without auth)
- ✅ Session migration (guest → user on signup)
- ✅ Re-engagement banner (7-day window, phase filter)
- ✅ StatusSteps UI (extracting → searching → generating)
- ✅ Elite seed data ported
- ✅ Env files from RealtyPals
- ✅ Groq primary + Claude fallback
- ✅ Rate limiting (Redis, falls back gracefully if no Redis)

**Gaps deferred to Phase 2:**
- Document Q&A (RAG) — `backend/src/routes/documents.ts`
- Builder reputation endpoint
- Sector heatmap component
- OnboardingTour component
- Full Sidebar re-wiring to backend sessions

**Type consistency:** `ScoredProject` defined in `discovery.ts` and re-exported in `backend-api.ts` — both match. `Intent` used in `intent.ts`, `memory.ts`, `context.ts`, `chat.ts` — all import from `../discovery`.
