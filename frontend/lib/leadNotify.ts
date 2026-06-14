import { prisma } from '@/lib/db'

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

const RETRY_DELAYS_MS = [0, 2000, 5000] // 3 attempts: immediate, 2s, 5s

async function fireWebhook(url: string, payload: LeadPayload): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const secret = process.env.LEAD_WEBHOOK_SECRET
  if (secret) headers['x-webhook-secret'] = secret  // only set for Render backend; not needed for Make.com
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) {
    throw new Error(`Webhook responded with status ${res.status}`)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function notifyLead(payload: LeadPayload): Promise<void> {
  const url = process.env.LEAD_WEBHOOK_URL
  if (!url) {
    console.warn('[lead] LEAD_WEBHOOK_URL not set — lead not forwarded:', JSON.stringify(payload))
    return
  }

  let lastError: unknown

  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_DELAYS_MS[attempt])
    }

    try {
      await fireWebhook(url, payload)
      if (attempt > 0) {
        console.log(`[lead] webhook succeeded on attempt ${attempt + 1}`)
      }
      return
    } catch (err) {
      lastError = err
      console.warn(`[lead] webhook attempt ${attempt + 1} failed:`, err instanceof Error ? err.message : err)
    }
  }

  // All retries exhausted — persist to DB so no lead is silently lost
  const errorMsg = lastError instanceof Error ? lastError.message : String(lastError)
  console.error('[lead] ❌ WEBHOOK FAILED ALL RETRIES', {
    type: payload.type,
    name: payload.name,
    phone: payload.phone,
    project_name: payload.project_name,
    error: errorMsg,
  })

  prisma.failedWebhook.create({
    data: {
      lead_type: payload.type,
      name: payload.name,
      phone: payload.phone,
      project_name: payload.project_name ?? null,
      payload: payload as object,
      error: errorMsg,
      retries: RETRY_DELAYS_MS.length,
    },
  }).catch((dbErr) => {
    console.error('[lead] ❌ Also failed to persist to DB:', dbErr instanceof Error ? dbErr.message : dbErr)
  })
}
