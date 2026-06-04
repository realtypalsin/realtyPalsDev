# RealtyPals — Local Development Guide

## Repository Layout

```
RealtyPalsxElite/
├── frontend/        ← Next.js app (port 3000) — THE ONLY SERVER
│   ├── app/              # pages + API routes (/api/v1/chat, /session, /projects, etc.)
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
DATABASE_URL=<supabase-session-pooler-url>       # port 5432 via pooler
DIRECT_URL=<supabase-direct-url>                 # for prisma migrate only
NEXT_PUBLIC_SUPABASE_URL=<supabase-url>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
GROQ_API_KEY=<groq-key>
CEREBRAS_API_KEY=<cerebras-key>
UPSTASH_REDIS_URL=<upstash-url>
UPSTASH_REDIS_TOKEN=<upstash-token>
GOOGLE_MAPS_API_KEY=<google-maps-key>
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<same-key>
JINA_API_KEY=<jina-key>
COHERE_API_KEY=<cohere-key>
TAVILY_API_KEY=<tavily-key>
WAQI_TOKEN=<waqi-token>
CHAT_PROVIDER=groq
```

---

## Running Locally — Single Terminal

```bash
cd frontend
npm run dev
```

Expected:
```
▲ Next.js 14.2.5
- Local: http://localhost:3000
```

Open http://localhost:3000. That's it — one server.

---

## Database Commands

All run from `frontend/`:

```bash
# Push schema changes to Supabase (uses DATABASE_URL pooler)
# Temporarily comment out directUrl in schema.prisma if DIRECT_URL is unreachable
npx prisma db push

# Regenerate Prisma client after schema changes
npx prisma generate

# Seed property data
npm run db:seed

# Generate embeddings for vector search
npm run db:embeddings

# Add HNSW vector index (run once after seeding with embeddings)
npx tsx scripts/add-vector-index.ts
```

---

## Test the Chat Flow

1. Open http://localhost:3000 → log in
2. Ask: `3BHK in Sector 150 Noida under 2 crore`
3. Property cards appear (ADVISOR mode)
4. Hard-refresh (Ctrl+Shift+R) → cards still visible (session context restored from DB)
5. Click a recent chat in sidebar → same session with cards and AI phase resumes

---

## Architecture: Single-Pass Chat Streaming

Chat route (`/api/v1/chat`) uses a single streaming LLM call:
- **No tool needed** → tokens stream directly to client (fast, single pass)
- **Tool detected** → buffer tool call, execute tool, stream second pass

This means general knowledge answers (RERA, EMI questions, area overviews) get first-token in ~300ms instead of ~800ms.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `GROQ_API_KEY is not set` | Check `frontend/.env` |
| Empty chat history on refresh | DB connection issue — check `DATABASE_URL` in `frontend/.env` |
| No property cards | DB needs seed data: `npm run db:seed` |
| Port conflict | `npx kill-port 3000` |
| P1001 DB connection error | Use session-mode pooler URL (port 5432) in `DATABASE_URL` |
| `prisma db push` fails with P1001 | Comment out `directUrl` in `prisma/schema.prisma` temporarily, run push, restore it |
