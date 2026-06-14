import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { env } from './lib/env'
import healthRouter from './routes/health'
import leadsRouter from './routes/leads'

const app = express()

app.use(cors({
  origin: [env.FRONTEND_URL, 'http://localhost:3000'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'x-webhook-secret'],
}))

app.use(express.json({ limit: '50kb' }))

app.use(healthRouter)
app.use(leadsRouter)

// 404
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

app.listen(env.PORT, () => {
  console.log(`[server] RealtyPals backend running on port ${env.PORT} (${env.NODE_ENV})`)
})
