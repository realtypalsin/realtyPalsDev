# Codebase Structure

**Analysis Date:** 2026-06-14

## Directory Layout

```
RealtyPalsxElite/                   # Repo root
├── prisma/                         # Prisma schema (source of truth)
│   ├── schema.prisma               # All models — Builder, Project, UnitType, etc.
│   └── migrations/                 # SQL migration files
├── frontend/                       # Next.js application (entire product)
│   ├── app/                        # Next.js App Router pages + API routes
│   │   ├── page.tsx                # Landing page (auth check + redirect)
│   │   ├── layout.tsx              # Root layout (font, PostHog provider)
│   │   ├── globals.css             # Global Tailwind styles
│   │   ├── auth/                   # Auth pages (Supabase login/signup)
│   │   ├── discover/               # Main app page (chat + property results)
│   │   ├── property/               # Property detail pages ([id]/ and [slug]/)
│   │   ├── compare/                # Side-by-side property comparison
│   │   ├── saved/                  # User's saved properties
│   │   ├── admin/                  # Admin dashboard (builders, projects, leads)
│   │   │   ├── page.tsx            # Admin overview / lead list
│   │   │   ├── login/              # Admin authentication
│   │   │   ├── builders/           # Builder CRUD
│   │   │   └── projects/           # Project CRUD
│   │   ├── lead-snapshot/          # Lead detail view
│   │   ├── market-intelligence/    # Market data pages
│   │   └── api/v1/                 # All API route handlers
│   │       ├── chat/               # AI chat SSE endpoint
│   │       │   ├── route.ts        # Main chat handler (23.9K)
│   │       │   ├── intent/         # Intent extraction sub-route
│   │       │   └── session/        # Session management sub-route
│   │       ├── projects/           # Project detail API ([slug]/, [id]/)
│   │       ├── saved/              # Save/unsave property
│   │       ├── callback/           # Callback request leads
│   │       ├── site-visit/         # Site visit request leads
│   │       ├── leads/              # Lead listing API
│   │       ├── builder-reputation/ # Builder reputation API
│   │       ├── commute/            # Commute time calculation
│   │       ├── documents/          # Document Q&A
│   │       ├── market-comparison/  # Market comparison data
│   │       ├── price-alerts/       # Price alert management
│   │       ├── registry-prices/    # Registry price data
│   │       ├── transcribe/         # Audio transcription
│   │       └── admin/              # Admin CRUD API routes
│   │           ├── auth/           # Admin login
│   │           ├── projects/       # Project create/update
│   │           ├── builders/       # Builder create/update
│   │           └── upload-image/   # Image upload to Supabase Storage
│   ├── components/                 # Shared React components
│   │   ├── ui/                     # shadcn/ui primitives
│   │   ├── chat/                   # Chat-specific components
│   │   │   ├── MessageBubble.tsx   # Chat message rendering (26.2K)
│   │   │   └── types.ts            # Chat component types
│   │   ├── admin/                  # Admin-specific components
│   │   │   ├── ProjectForm.tsx     # Project create/edit form
│   │   │   ├── ProjectPreview.tsx  # Project preview card
│   │   │   └── ImageUpload.tsx     # Image upload UI
│   │   ├── DiscoveryContent.tsx    # Main chat + results panel (51.8K)
│   │   ├── Sidebar.tsx             # Saved/sessions sidebar (12K)
│   │   ├── ProjectDetailPanel.tsx  # Full property detail overlay (39.1K)
│   │   ├── ProjectCard.tsx         # Property card for results (16.4K)
│   │   ├── PropertyCard.tsx        # Alternative property card (19.5K)
│   │   ├── ComparisonTable.tsx     # Property comparison UI
│   │   ├── CalculatorPanel.tsx     # EMI/stamp duty calculator UI
│   │   ├── BuilderReputationCard.tsx # Builder info card
│   │   ├── SiteVisitScheduler.tsx  # Site visit booking form
│   │   └── Header.tsx              # Page header
│   ├── lib/                        # Shared utilities and service clients
│   │   ├── ai/                     # AI-specific modules
│   │   │   ├── prompts.ts          # System prompt builder
│   │   │   ├── intentManager.ts    # Intent state types + scoring
│   │   │   ├── groq.ts             # Groq client
│   │   │   ├── tavily.ts           # Web search client
│   │   │   ├── jina.ts             # URL reader (RERA pages)
│   │   │   ├── cohere.ts           # Cohere client (reranking)
│   │   │   ├── cerebras.ts         # Cerebras client
│   │   │   └── builderReputation.ts # Builder reputation analysis
│   │   ├── repositories/           # Data access layer
│   │   │   └── projectRepository.ts # Project search + scoring
│   │   ├── utils/                  # Utility helpers
│   │   ├── db.ts                   # Prisma singleton
│   │   ├── redis.ts                # Upstash Redis client + rate limiter
│   │   ├── supabase.ts             # Supabase JS client factory
│   │   ├── adminToken.ts           # Admin token validation
│   │   ├── analytics.ts            # PostHog event helpers
│   │   ├── calculators.ts          # EMI, stamp duty, GST calculations
│   │   ├── google-maps.ts          # Google Maps commute time
│   │   ├── leadNotify.ts           # Lead notification dispatcher
│   │   ├── whatsapp.ts             # WhatsApp message sender
│   │   ├── normalize.ts            # Query text normalization
│   │   ├── format.ts               # INR formatting helpers
│   │   ├── cache.ts                # Cache abstraction helpers
│   │   ├── env.ts                  # Environment variable validators
│   │   ├── waqi.ts                 # Air quality index client
│   │   ├── wikipedia.ts            # Wikipedia area info fetcher
│   │   └── utils.ts                # General utilities
│   ├── types/                      # TypeScript type definitions
│   │   ├── project.ts              # ProjectCard, ProjectDetail, UnitTypeSummary
│   │   └── property.ts             # Property-related types
│   ├── public/                     # Static assets
│   │   └── images/                 # Background, logos, property images
│   ├── prisma/                     # Frontend-local prisma seed/migration files
│   ├── scripts/                    # Dev/test scripts
│   ├── __tests__/                  # Test files
│   ├── middleware.ts               # Next.js middleware (auth + logging)
│   ├── next.config.js              # Next.js + Sentry config
│   ├── tailwind.config.ts          # Tailwind theme config
│   └── tsconfig.json               # TypeScript config
├── backend-infra-wsl/              # WSL-based infrastructure config (not the app)
├── docs/                           # Project documentation
├── postman/                        # Postman API collections
├── .planning/codebase/             # AI-generated codebase maps (this directory)
├── .claude/                        # Claude agent skills and completions
├── .agents/                        # Agent skills (supabase)
├── CLAUDE.md                       # Project context for AI assistants
├── prisma/                         # Root Prisma schema
└── package.json                    # Root package (workspace or scripts)
```

## Directory Purposes

**`frontend/app/`:**
- Purpose: Next.js App Router — pages, layouts, and API route handlers
- Contains: Page components (`page.tsx`), layout wrappers (`layout.tsx`), and `route.ts` API handlers
- Key files: `frontend/app/page.tsx` (landing), `frontend/app/discover/page.tsx` (main app), `frontend/app/api/v1/chat/route.ts` (AI endpoint)

**`frontend/components/`:**
- Purpose: All shared React components used across pages
- Contains: Feature components, UI primitives under `ui/`, admin-specific components under `admin/`, chat components under `chat/`
- Key files: `frontend/components/DiscoveryContent.tsx`, `frontend/components/ProjectDetailPanel.tsx`, `frontend/components/Sidebar.tsx`

**`frontend/lib/`:**
- Purpose: Server-side and isomorphic utility code — no React here
- Contains: Service clients, repository functions, calculators, formatters
- Key files: `frontend/lib/db.ts`, `frontend/lib/redis.ts`, `frontend/lib/ai/prompts.ts`, `frontend/lib/repositories/projectRepository.ts`

**`frontend/lib/ai/`:**
- Purpose: All AI-specific logic — prompts, tool definitions, external AI clients
- Contains: System prompt builder, intent state management, Groq/Tavily/Jina/Cohere clients

**`frontend/lib/repositories/`:**
- Purpose: Database query functions — the only place that should use Prisma directly
- Contains: `projectRepository.ts` with `searchProjects()` (Prisma query) and `scoreAndRankProjects()` (deterministic ranking)

**`frontend/types/`:**
- Purpose: Shared TypeScript interfaces used across API, repository, and UI layers
- Contains: `project.ts` (ProjectCard, ProjectDetail, UnitTypeSummary), `property.ts`

**`prisma/`** (repo root):
- Purpose: Database schema source of truth and migration history
- Contains: `schema.prisma` (all models), `migrations/` (SQL diffs)
- Note: Generator outputs to `../frontend/node_modules/.prisma/client` — run `prisma generate` from this directory

## Key File Locations

**Entry Points:**
- `frontend/app/page.tsx`: Landing page — auth redirect logic
- `frontend/app/discover/page.tsx`: Main app shell
- `frontend/app/api/v1/chat/route.ts`: Primary AI API endpoint

**Configuration:**
- `frontend/next.config.js`: Next.js build config + Sentry wrapping
- `frontend/tailwind.config.ts`: Design tokens and theme
- `frontend/tsconfig.json`: TypeScript compiler options
- `prisma/schema.prisma`: Database schema

**Core Logic:**
- `frontend/lib/ai/prompts.ts`: System prompt (defines AI behavior + tool descriptions)
- `frontend/lib/repositories/projectRepository.ts`: Property search and scoring
- `frontend/lib/redis.ts`: Rate limiting (15 req/60s per user)
- `frontend/middleware.ts`: Auth enforcement for all `/api/` routes

**Types:**
- `frontend/types/project.ts`: `ProjectCard`, `ProjectDetail`, `BuilderDetail`

## Naming Conventions

**Files:**
- React components: PascalCase — `ProjectDetailPanel.tsx`, `DiscoveryContent.tsx`
- API route handlers: always `route.ts` inside a named directory
- Library modules: camelCase — `projectRepository.ts`, `leadNotify.ts`, `googleMaps.ts`
- Page components: `page.tsx` (Next.js convention)
- Layout components: `layout.tsx` (Next.js convention)

**Directories:**
- API route segments: kebab-case — `builder-reputation/`, `site-visit/`, `market-comparison/`
- Page segments: kebab-case — `lead-snapshot/`, `market-intelligence/`
- Dynamic segments: Next.js bracket notation — `[id]/`, `[slug]/`

**Components:**
- Feature components: Noun-based PascalCase — `ProjectCard`, `Sidebar`, `Header`
- shadcn/ui primitives: live in `frontend/components/ui/`
- Admin components: live in `frontend/components/admin/`

**Types/Interfaces:**
- PascalCase — `ProjectCard`, `SearchFilters`, `UserMemoryContext`, `IntentState`

## Where to Add New Code

**New API endpoint:**
- Create directory: `frontend/app/api/v1/<endpoint-name>/`
- Add handler: `frontend/app/api/v1/<endpoint-name>/route.ts`
- Validate input with Zod at top of handler
- If user-facing (requires auth), add pathname to `isUserApi` check in `frontend/middleware.ts`

**New page:**
- Create directory: `frontend/app/<page-name>/`
- Add: `frontend/app/<page-name>/page.tsx`
- If auth-required, add Supabase session check pattern from `frontend/app/discover/page.tsx`

**New React component:**
- Shared: `frontend/components/<ComponentName>.tsx`
- Admin-only: `frontend/components/admin/<ComponentName>.tsx`
- Chat-specific: `frontend/components/chat/<ComponentName>.tsx`
- UI primitive (shadcn): `frontend/components/ui/<component-name>.tsx`

**New AI tool (chat):**
- Add tool definition inside `streamText({ tools: { ... } })` in `frontend/app/api/v1/chat/route.ts`
- Add helper/client module to `frontend/lib/ai/` if it calls an external service
- Document new tool name in `frontend/lib/ai/prompts.ts` "CRITICAL: Tools Available To You" section

**New service/external client:**
- Add module to `frontend/lib/<service-name>.ts`
- Export only typed functions — no raw fetch calls from API routes

**New database model:**
- Add to `prisma/schema.prisma`
- Run `npx prisma migrate dev` from the `prisma/` directory
- Add repository function in `frontend/lib/repositories/` if needed

**New shared types:**
- Add to `frontend/types/project.ts` (for property/project types) or create `frontend/types/<domain>.ts`

## Special Directories

**`prisma/` (repo root):**
- Purpose: Canonical schema and migrations
- Generated: `frontend/node_modules/.prisma/client` (gitignored)
- Committed: `schema.prisma` and `migrations/*.sql`

**`frontend/.next/`:**
- Purpose: Next.js build output
- Generated: Yes
- Committed: No (gitignored)

**`.planning/codebase/`:**
- Purpose: AI-generated codebase maps for agent context
- Generated: Yes (by GSD mapper agents)
- Committed: Yes

**`.claude/`:**
- Purpose: Claude agent session notes, completions, templates, skills
- Generated: Partially (completions auto-generated)
- Committed: Yes

**`frontend/public/images/`:**
- Purpose: Static image assets — backgrounds, logos, property photos
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-06-14*
