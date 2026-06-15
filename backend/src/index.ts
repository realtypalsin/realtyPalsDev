import 'dotenv/config'
import express from 'express'
import cors from 'cors'

const app = express()
const PORT = Number(process.env.PORT ?? 3001)

app.use(cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  credentials: true,
}))
app.use(express.json())

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }))

// Routes will be added in later tasks
// app.use('/api/chat', chatRouter)
// app.use('/api/sessions', sessionsRouter)
// etc.

app.listen(PORT, () => {
  console.log(`[backend] listening on :${PORT}`)
  const keys = {
    GROQ_API_KEY: !!process.env.GROQ_API_KEY,
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    DATABASE_URL: !!process.env.DATABASE_URL,
  }
  console.log('[backend] env check:', keys)
})
