# Technology Stack

**Analysis Date:** 2026-06-14

## Languages

**Primary:**
- TypeScript 5.5.x - All frontend application code, API routes, scripts
- strict mode enabled; no `any` types; `noEmit: true`

**Secondary:**
- JavaScript - Config files only (`next.config.js`, `jest.config.js`, `postcss.config.js`)

## Runtime

**Environment:**
- Node.js (version not pinned; no `.nvmrc` or `.node-version` detected)

**Package Manager:**
- npm
- Lockfile: `frontend/package-lock.json` present

## Frameworks

**Core:**
- Next.js 14.2.5 - App Router, React Server Components, Route Handlers
- React 18.3.x - UI rendering
- Tailwind CSS 3.4.x - Utility-first styling

**UI Components:**
- lucide-react 0.563.x - Icon set
- @phosphor-icons/react 2.1.x - Secondary icon set
- framer-motion 12.35.x - Animations
- tailwindcss-animate 1.0.x - CSS animation utilities
- react-markdown 10.1.x + remark-gfm 4.0.x - Chat message rendering
- @fontsource/outfit 5.2.x - Self-hosted Outfit font

**Maps:**
- leaflet 1.9.x + react-leaflet 5.0.x - Interactive maps (client-side)
- Google Maps API via `@types/google.maps` (REST API calls in `frontend/lib/google-maps.ts`)

**AI / LLM SDK:**
- ai (Vercel AI SDK) 6.0.x - Streaming text, tool calls (`streamText`, `tool`, `stepCountIs`)
- @ai-sdk/groq 3.0.x - Groq provider adapter
- @ai-sdk/anthropic 3.0.x - Anthropic/Claude provider adapter
- @ai-sdk/amazon-bedrock 4.0.x - AWS Bedrock provider adapter
- @ai-sdk/openai 3.0.x - OpenAI-compatible provider adapter
- @ai-sdk/react 3.0.x - React hooks for streaming

**Testing:**
- jest 30.2.x - Test runner
- jest-environment-jsdom 30.2.x - DOM environment
- @testing-library/react 16.3.x - Component testing
- @testing-library/user-event 14.6.x - User interaction simulation
- @testing-library/jest-dom 6.9.x - Custom matchers
- Config: `frontend/jest.config.js`

**Build/Dev:**
- tsx 4.19.x - TypeScript execution for scripts (`prisma/seed.ts`, `scripts/*.ts`)
- autoprefixer 10.4.x + postcss 8.4.x - CSS processing
- eslint 8.57.x + eslint-config-next 14.2.5 + @typescript-eslint 8.60.x - Linting
- Config: `frontend/.eslintrc.json`

## Key Dependencies

**Critical:**
- `@prisma/client` 5.20.x - Database ORM client; schema at `prisma/schema.prisma`
- `prisma` 5.20.x (devDep) - Migration and codegen CLI
- `@supabase/supabase-js` 2.46.x - Auth + storage client
- `@supabase/ssr` 0.5.x - Server-side Supabase session handling
- `zod` 3.23.x - Runtime validation for all external inputs (API bodies, forms, AI responses)

**Infrastructure:**
- `@upstash/redis` 1.38.x - HTTP-based Redis client for rate limiting and caching (`frontend/lib/redis.ts`)
- `groq-sdk` 0.7.x - Direct Groq SDK (also reused for Cerebras via custom base URL)
- `cohere-ai` 7.14.x - Reranking multilingual model
- `posthog-js` 1.379.x - Analytics event tracking (`frontend/lib/analytics.ts`)
- `@sentry/nextjs` 10.56.x - Error tracking and session replay

## Configuration

**TypeScript:**
- `frontend/tsconfig.json` - `strict: true`, target `ES2017`, path alias `@/*` → `./`
- `moduleResolution: bundler` (Next.js 14 compatible)

**Build:**
- `frontend/next.config.js` - Sentry integration via `withSentryConfig`, remote image patterns (Google Maps, Supabase), security headers
- `frontend/tailwind.config.ts` - Dark mode via `class`, custom font var, custom animations (blob, border-beam, aurora)
- `frontend/postcss.config.js` - Standard autoprefixer setup
- `frontend/instrumentation.ts` - OpenTelemetry instrumentation hook

**Environment:**
- Env vars loaded via `process.env.*` (Next.js built-in)
- `frontend/.env` present (do not read)
- `frontend/lib/env.ts` exports `API_BASE` — throws at startup if `NEXT_PUBLIC_API_URL` is missing

**Sentry:**
- `frontend/sentry.client.config.ts` - Session replay, 20% trace sample in prod
- `frontend/sentry.server.config.ts` - Server-side init
- `frontend/sentry.edge.config.ts` - Edge runtime init
- Org: `realtypals`, Project: `realtypals-sentry`

## Platform Requirements

**Development:**
- Node.js (version unspecified)
- PostgreSQL database accessible via `DATABASE_URL` and `DIRECT_URL`
- Upstash Redis (HTTP-based, no local Redis needed)

**Production:**
- Vercel (implied by `eslint-config-next`, Sentry Vercel integration, and `RUNNING_LOCALLY.md`)
- Prisma schema at `../prisma/schema.prisma` relative to `frontend/`; client output to `frontend/node_modules/.prisma/client`

---

*Stack analysis: 2026-06-14*
