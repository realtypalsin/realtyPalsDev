import 'dotenv/config'
import 'express-async-errors'
import * as Sentry from '@sentry/node'
import express, { Request, Response, NextFunction } from 'express'
import logger from './lib/logger'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import { prisma } from './lib/db'
import { pingRedis, checkRateLimit } from './lib/cache'
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
import builderRegistrationRouter from './routes/builderRegistration'
import builderApplicationsRouter from './routes/builderApplications'
import analyticsRouter from './routes/analytics'

// Initialize Sentry for error tracking and monitoring
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    ignoreErrors: [/ECONNRESET/, /ETIMEDOUT/, /Too many requests/],
  })
}

// Synchronous env assertions — must run before any async work or app setup.
for (const key of ['ADMIN_PASSWORD', 'DATABASE_URL'] as const) {
  if (!process.env[key]) {
    logger.fatal({ key }, `${key} env var is not set. Refusing to start.`)
    process.exit(1)
  }
}

// Require at least one AI provider for the core chat functionality.
// This allows fallback to Groq if OpenAI is missing, or vice versa.
if (!process.env.OPENAI_API_KEY && !process.env.GROQ_API_KEY) {
  logger.fatal('Neither OPENAI_API_KEY nor GROQ_API_KEY is configured. At least one AI provider is required. Refusing to start.')
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
}))
app.use(cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  credentials: true,
}))
app.use(express.json({ limit: '100kb' }))
app.use(cookieParser())

// Structural Logging
app.use(morgan('combined'))

// Sentry Request Handler — captures request/response data for error context
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.requestHandler())
}

// Global Rate Limiting Middleware
app.use(async (req: Request, res: Response, next: NextFunction) => {
  // Exclude healthchecks and webhooks (webhooks have their own signature validation)
  if (req.path.startsWith('/api/v1/health') || req.path.startsWith('/api/v1/leads/webhook')) {
    return next()
  }
  
  const ip = req.ip || '127.0.0.1'
  // 100 requests per 60 seconds is a standard generous limit for public APIs
  const rateLimit = await checkRateLimit(`global:${ip}`, 100, 60)
  
  res.setHeader('X-RateLimit-Limit', 100)
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining)
  
  if (rateLimit.remaining <= 0) {
    res.status(429).json({ error: 'Too many requests, please try again later.' })
    return
  }
  next()
})

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
app.use('/api/v1/builder-registration', builderRegistrationRouter)
app.use('/api/v1/builder-applications', builderApplicationsRouter)
app.use('/api/v1/analytics', analyticsRouter)

// Sentry Error Handler — must come before custom error handler
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler())
}

// Global error handler — catches any error passed to next(err) or thrown in an
// async route (via express-async-errors). Must be registered after all routes.
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  const path = req.path
  const tags: Record<string, string> = {}

  // Route-specific error context
  if (path.includes('/chat')) tags.route = 'chat'
  if (path.includes('/leads')) tags.route = 'leads'
  if (path.includes('/admin')) tags.route = 'admin'
  if (err.message.includes('GUARDRAIL')) tags.guardrail = 'triggered'
  if (err.message.includes('AI') || err.message.includes('rate limit')) tags.ai = 'error'

  logger.error({ err: err.message, stack: err.stack, tags, path }, 'Internal error')

  // Capture error context to Sentry
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err, { tags })
  }

  if (res.headersSent) return // SSE / streaming — cannot send a second response
  res.status((err as { status?: number }).status ?? 500).json({ error: 'Internal server error' })
})

async function startup() {
  // Probe the database before accepting traffic. A misconfigured DATABASE_URL
  // should fail at deploy time, not at the first user request.
  try {
    await prisma.$queryRaw`SELECT 1`
    logger.info('database: ok')
  } catch (err) {
    logger.fatal({ err: (err as Error).message }, 'database unreachable')
    process.exit(1)
  }

  // Probe Redis if configured. Redis is a soft dependency for most features
  // (rate limiting falls back to in-memory) but a hard dependency for admin sessions.
  const redisOk = await pingRedis()
  if (process.env.UPSTASH_REDIS_REST_URL && !redisOk) {
    logger.warn('Redis configured but unreachable — admin sessions will fail at login')
  } else if (redisOk) {
    logger.info('redis: ok')
  } else {
    logger.info('redis: not configured (rate limiting uses in-memory fallback)')
  }

  const server = app.listen(PORT, () => {
    const elapsed = Date.now() - startTime
    logger.info({ port: PORT, elapsed }, `listening — ready`)

    const keys = {
      GROQ_API_KEY:             !!process.env.GROQ_API_KEY,
      OPENAI_API_KEY:           !!process.env.OPENAI_API_KEY,
      GOOGLE_MAPS_API_KEY:      !!process.env.GOOGLE_MAPS_API_KEY,
      TAVILY_API_KEY:           !!process.env.TAVILY_API_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    }
    logger.info({ keys }, 'optional env configured')
  })

  async function shutdown(signal: string) {
    logger.info({ signal }, 'draining connections')
    server.close(async () => {
      await prisma.$disconnect()
      logger.info('clean exit')
      process.exit(0)
    })
    // Most platforms (Render, K8s) default to a 30s SIGTERM grace period.
    // We force-exit at 28s to ensure we cleanly log our own timeout before the platform sends SIGKILL.
    setTimeout(() => {
      logger.error('forced exit after 28s timeout (aligned with standard 30s platform grace period)')
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
