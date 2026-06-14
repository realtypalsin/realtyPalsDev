import { z } from 'zod'

const EnvSchema = z.object({
  PORT: z.string().default('8080'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  WEBHOOK_SECRET: z.string().min(16, 'WEBHOOK_SECRET must be at least 16 chars').optional().default(''),

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
  EMAIL_FROM: z.string().email().optional(),
  EMAIL_TO: z.string().email().optional(),

  // CORS — set to your Vercel frontend URL
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
})

const parsed = EnvSchema.safeParse(process.env)
if (!parsed.success) {
  console.error('❌ Invalid environment variables:')
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`)
  }
  process.exit(1)
}

export const env = parsed.data
