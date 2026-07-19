import { z } from 'zod'

const EnvSchema = z.object({
  PORT: z.string().default('8080'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  WEBHOOK_SECRET: z.string().optional().default(''),

  // WhatsApp (Meta Cloud API or Twilio — set WHATSAPP_PROVIDER)
  WHATSAPP_PROVIDER: z.enum(['meta', 'twilio', 'none']).default('none'),
  // Meta
  META_WHATSAPP_TOKEN: z.string().optional(),
  META_PHONE_NUMBER_ID: z.string().optional(),
  META_RECIPIENT_NUMBER: z.string().optional(),
  // Twilio
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_WHATSAPP_FROM: z.string().optional(),
  TWILIO_WHATSAPP_TO: z.string().optional(),

  // Email (Resend — easiest for Render)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  EMAIL_TO: z.string().optional(),

  // CORS — set to your Vercel frontend URL
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
})

let envParsed: z.infer<typeof EnvSchema>
try {
  envParsed = EnvSchema.parse(process.env)
} catch (error: any) {
  console.error('❌ Invalid environment variables:', error.errors || error)
  process.exit(1)
}

// Fail hard in production if webhook secret is missing
if (envParsed.NODE_ENV === 'production' && !envParsed.WEBHOOK_SECRET) {
  console.error('❌ WEBHOOK_SECRET is required in production')
  process.exit(1)
}

export const env = envParsed

