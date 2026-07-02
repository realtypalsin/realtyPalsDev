import 'dotenv/config'
import 'express-async-errors'
import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { prisma } from './lib/db'
import { pingRedis } from './lib/cache'
import chatRouter from './routes/chat'
import sessionsRouter from './routes/sessions'
import projectsRouter from './routes/projects'
import savedRouter from './routes/saved'
import leadsRouter from './routes/leads'
import adminRouter from './routes/admin'
import buildersRouter from './routes/builders'
import marketComparisonRouter from './routes/marketComparison'
import priceAlertsRouter from './routes/priceAlerts'
import aqiRouter from './routes/aqi'
import commuteRouter from './routes/commute'
import builderReputationRouter from './routes/builderReputation'
import transcribeRouter from './routes/transcribe'
import documentsRouter from './routes/documents'
import registryPricesRouter from './routes/registryPrices'

// Synchronous env assertions — must run before any async work or app setup.
for (const key of ['ADMIN_PASSWORD', 'DATABASE_URL'] as const) {
  if (!process.env[key]) {
    console.error(`[startup] FATAL: ${key} env var is not set. Refusing to start.`)
    process.exit(1)
  }
}

// Require at least one AI provider for the core chat functionality.
// This allows fallback to Groq if OpenAI is missing, or vice versa.
if (!process.env.OPENAI_API_KEY && !process.env.GROQ_API_KEY) {
  console.error('[startup] FATAL: Neither OPENAI_API_KEY nor GROQ_API_KEY is configured. At least one AI provider is required. Refusing to start.')
  process.exit(1)
}

const PORT = parseInt(process.env.PORT ?? '3001', 10)
const VERSION = process.env.npm_package_version ?? '1.0.0'
const startTime = Date.now()

const app = express()

// All deployments sit behind a proxy (Render, Railway, Fly, etc.).
// This makes req.ip trustworthy and fixes x-forwarded-for-based rate limiting.
app.set('trust proxy', 1)

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}))
app.use(cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  credentials: true,
}))
app.use(express.json())
app.use(cookieParser())

// Health endpoint — probes DB and Redis; only covers local infrastructure dependencies.
// Returns 200 when healthy, 503 when the database is unreachable.
app.get('/api/v1/health', async (_req, res) => {
  let db: 'ok' | 'error' = 'ok'
  let redis: 'ok' | 'degraded' = 'ok'

  try {
    await prisma.$queryRaw`SELECT 1`
  } catch {
    db = 'error'
  }

  if (!(await pingRedis())) redis = 'degraded'

  const status = db === 'error' ? 503 : 200
  res.status(status).json({
    ok: db === 'ok',
    version: VERSION,
    uptime: Math.floor(process.uptime()),
    db,
    redis,
  })
})

app.use('/api/v1/chat', chatRouter)
app.use('/api/v1/sessions', sessionsRouter)
app.use('/api/v1/projects', projectsRouter)
app.use('/api/v1/saved', savedRouter)
app.use('/api/v1/leads', leadsRouter)
app.use('/api/v1/admin', adminRouter)
app.use('/api/v1/builders', buildersRouter)
app.use('/api/v1/market-comparison', marketComparisonRouter)
app.use('/api/v1/price-alerts', priceAlertsRouter)
app.use('/api/v1/aqi', aqiRouter)
app.use('/api/v1/commute', commuteRouter)
app.use('/api/v1/builder-reputation', builderReputationRouter)
app.use('/api/v1/transcribe', transcribeRouter)
app.use('/api/v1/documents', documentsRouter)
app.use('/api/v1/registry-prices', registryPricesRouter)

// Global error handler — catches any error passed to next(err) or thrown in an
// async route (via express-async-errors). Must be registered after all routes.
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[internal]', err.message, err.stack)
  if (res.headersSent) return // SSE / streaming — cannot send a second response
  res.status((err as { status?: number }).status ?? 500).json({ error: 'Internal server error' })
})

async function startup() {
  // Probe the database before accepting traffic. A misconfigured DATABASE_URL
  // should fail at deploy time, not at the first user request.
  try {
    await prisma.$queryRaw`SELECT 1`
    console.log('[startup] database: ok')
  } catch (err) {
    console.error('[startup] FATAL: database unreachable:', (err as Error).message)
    process.exit(1)
  }

  // Probe Redis if configured. Redis is a soft dependency for most features
  // (rate limiting falls back to in-memory) but a hard dependency for admin sessions.
  const redisOk = await pingRedis()
  if (process.env.UPSTASH_REDIS_REST_URL && !redisOk) {
    console.error('[startup] WARNING: Redis configured but unreachable — admin sessions will fail at login')
  } else if (redisOk) {
    console.log('[startup] redis: ok')
  } else {
    console.log('[startup] redis: not configured (rate limiting uses in-memory fallback)')
  }

  const server = app.listen(PORT, () => {
    const elapsed = Date.now() - startTime
    console.log(`[startup] listening on :${PORT} — ready in ${elapsed}ms`)

    const keys = {
      GROQ_API_KEY:             !!process.env.GROQ_API_KEY,
      OPENAI_API_KEY:           !!process.env.OPENAI_API_KEY,
      GOOGLE_MAPS_API_KEY:      !!process.env.GOOGLE_MAPS_API_KEY,
      TAVILY_API_KEY:           !!process.env.TAVILY_API_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    }
    console.log('[startup] optional env:', keys)
  })

  async function shutdown(signal: string) {
    console.log(`[shutdown] ${signal} received — draining connections`)
    server.close(async () => {
      await prisma.$disconnect()
      console.log('[shutdown] clean exit')
      process.exit(0)
    })
    // Most platforms (Render, K8s) default to a 30s SIGTERM grace period.
    // We force-exit at 28s to ensure we cleanly log our own timeout before the platform sends SIGKILL.
    setTimeout(() => {
      console.error('[shutdown] forced exit after 28s timeout (aligned with standard 30s platform grace period)')
      process.exit(1)
    }, 28_000).unref()
  }

  process.on('SIGTERM', () => { void shutdown('SIGTERM') })
  process.on('SIGINT',  () => { void shutdown('SIGINT') })
}

startup().catch((err) => {
  console.error('[startup] unhandled error:', err)
  process.exit(1)
})
