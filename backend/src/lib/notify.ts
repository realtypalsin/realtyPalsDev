import { env } from './env'

interface LeadPayload {
  type: 'callback' | 'site_visit'
  name: string
  phone: string
  project_name?: string
  project_slug?: string
  visit_date?: string
  time_slot?: string
  message?: string
  timestamp: string
}

function buildMessage(payload: LeadPayload): string {
  const lines: string[] = []
  lines.push(`🏠 *New ${payload.type === 'callback' ? 'Callback Request' : 'Site Visit Request'}*`)
  lines.push(`👤 *Name:* ${payload.name}`)
  lines.push(`📞 *Phone:* ${payload.phone}`)
  if (payload.project_name) lines.push(`🏗️ *Project:* ${payload.project_name}`)
  if (payload.visit_date) lines.push(`📅 *Date:* ${payload.visit_date}`)
  if (payload.time_slot) lines.push(`🕐 *Time:* ${payload.time_slot}`)
  if (payload.message) lines.push(`💬 *Message:* ${payload.message}`)
  lines.push(`\n⏰ ${new Date(payload.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`)
  return lines.join('\n')
}

async function sendWhatsAppMeta(message: string): Promise<void> {
  if (!env.META_WHATSAPP_TOKEN || !env.META_PHONE_NUMBER_ID || !env.META_RECIPIENT_NUMBER) {
    throw new Error('Meta WhatsApp env vars not set')
  }
  const res = await fetch(
    `https://graph.facebook.com/v18.0/${env.META_PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.META_WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: env.META_RECIPIENT_NUMBER,
        type: 'text',
        text: { body: message },
      }),
    }
  )
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Meta WhatsApp API error ${res.status}: ${body}`)
  }
}

async function sendWhatsAppTwilio(message: string): Promise<void> {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_WHATSAPP_FROM || !env.TWILIO_WHATSAPP_TO) {
    throw new Error('Twilio env vars not set')
  }
  const credentials = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64')
  const params = new URLSearchParams({
    From: `whatsapp:${env.TWILIO_WHATSAPP_FROM}`,
    To: `whatsapp:${env.TWILIO_WHATSAPP_TO}`,
    Body: message,
  })
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    }
  )
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Twilio API error ${res.status}: ${body}`)
  }
}

async function sendEmail(payload: LeadPayload): Promise<void> {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM || !env.EMAIL_TO) {
    return // email optional
  }
  const subject = payload.type === 'callback'
    ? `New callback request — ${payload.name}`
    : `New site visit request — ${payload.name} (${payload.project_name ?? 'unknown'})`

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [env.EMAIL_TO],
      subject,
      text: buildMessage(payload),
    }),
  })
}

export async function notifyLead(payload: LeadPayload): Promise<{ whatsapp: boolean; email: boolean }> {
  const message = buildMessage(payload)
  let whatsapp = false
  let email = false

  if (env.WHATSAPP_PROVIDER === 'meta') {
    try {
      await sendWhatsAppMeta(message)
      whatsapp = true
    } catch (err) {
      console.error('[notify] WhatsApp Meta failed:', err instanceof Error ? err.message : err)
    }
  } else if (env.WHATSAPP_PROVIDER === 'twilio') {
    try {
      await sendWhatsAppTwilio(message)
      whatsapp = true
    } catch (err) {
      console.error('[notify] WhatsApp Twilio failed:', err instanceof Error ? err.message : err)
    }
  }

  try {
    await sendEmail(payload)
    email = true
  } catch (err) {
    console.error('[notify] Email failed:', err instanceof Error ? err.message : err)
  }

  return { whatsapp, email }
}
