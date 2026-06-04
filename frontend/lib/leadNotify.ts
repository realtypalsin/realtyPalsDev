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

export async function notifyLead(payload: LeadPayload): Promise<void> {
  const url = process.env.LEAD_WEBHOOK_URL
  if (!url) return

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    })
  } catch (err) {
    // never let notification failure break the lead save
    console.warn('[lead] webhook failed:', err instanceof Error ? err.message : err)
  }
}
