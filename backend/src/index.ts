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
const PORT = parseInt(process.env.PORT ?? '3001', 10)

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
