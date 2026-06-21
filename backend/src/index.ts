import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
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

const app = express()
const PORT = parseInt(process.env.PORT ?? '3001', 10)

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

app.get('/api/v1/health', (_req, res) => res.json({ ok: true, ts: Date.now() }))

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

app.listen(PORT, () => {
  console.log(`[backend] listening on :${PORT}`)
  const keys = {
    GROQ_API_KEY: !!process.env.GROQ_API_KEY,
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    // ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    DATABASE_URL: !!process.env.DATABASE_URL,
    UPSTASH_REDIS_REST_URL: !!process.env.UPSTASH_REDIS_REST_URL,
    GOOGLE_MAPS_API_KEY: !!process.env.GOOGLE_MAPS_API_KEY,
    TAVILY_API_KEY: !!process.env.TAVILY_API_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  }
  console.log('[backend] env check:', keys)
  if (!keys.GROQ_API_KEY && !keys.OPENAI_API_KEY) {
    console.error('[backend] WARNING: No AI keys. Chat will not work.')
  }
})
