// backend/src/routes/builderRegistration.ts
import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/db'
import { supabaseAdmin } from '../lib/supabase'
import { checkRateLimit } from '../lib/cache'
import { validateUploadedFile } from '../lib/uploadValidator'

const router = Router()

const BuilderApplicationSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().regex(/^\+91\d{10}$/, 'Phone must be +91 followed by 10 digits'),
  cin: z.string().length(21, 'CIN must be exactly 21 characters').regex(/^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/, 'Invalid CIN format'),
  website: z.string().url().optional().or(z.literal('')),
  headquarters: z.string().optional(),
  description: z.string().optional(),
  logo_url: z.string().optional(), // base64 or URL
  legal_entities: z.array(z.object({
    name: z.string(),
    registration_number: z.string().optional()
  })).optional(),
  executives: z.array(z.object({
    name: z.string(),
    title: z.string().optional(),
    experience_years: z.number().optional()
  })).optional(),
  projects: z.array(z.string()).optional(),
  delivery_track: z.string().optional(),
})

async function uploadLogoToSupabase(
  base64orUrl: string | undefined,
  applicationId: string
): Promise<string | null> {
  if (!base64orUrl) return null

  // Check if it's a URL or base64
  if (base64orUrl.startsWith('http')) {
    return base64orUrl // Already a URL
  }

  // Assume base64-encoded image
  try {
    const matches = base64orUrl.match(/^data:image\/(\w+);base64,(.+)$/)
    if (!matches) {
      console.error('[builderRegistration] Invalid base64 format')
      return null
    }

    const [, ext, base64data] = matches

    // Validate extension allowlist
    const ALLOWED_EXTS = ['png', 'jpg', 'jpeg', 'svg', 'webp']
    const normalizedExt = ext.toLowerCase()
    if (!ALLOWED_EXTS.includes(normalizedExt)) {
      console.error(`[builderRegistration] File type .${ext} not allowed`)
      return null
    }

    // Decode and validate byte size
    const buffer = Buffer.from(base64data, 'base64')
    const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2MB
    if (buffer.length > MAX_SIZE_BYTES) {
      console.error(`[builderRegistration] File size ${buffer.length} exceeds 2MB limit`)
      return null
    }

    const { valid, error: validationError } = await validateUploadedFile(buffer)
    if (!valid) {
      console.error(`[builderRegistration] File type validation failed: ${validationError}`)
      return null
    }

    // Sanitize filename: remove special chars, use app ID + timestamp
    const sanitizedFilename = `logo-${applicationId}-${Date.now()}.${normalizedExt}`
    const path = `builder-logos/${sanitizedFilename}`
    const contentType = `image/${normalizedExt}`

    const { data, error } = await supabaseAdmin.storage
      .from('property-images')
      .upload(path, buffer, { contentType, upsert: true })

    if (error) {
      console.error('[builderRegistration] Upload failed:', error)
      return null
    }

    const { data: publicUrl } = supabaseAdmin.storage
      .from('property-images')
      .getPublicUrl(path)

    return publicUrl.publicUrl
  } catch (err) {
    console.error('[builderRegistration] Logo upload error:', err)
    return null
  }
}

router.post('/', async (req: Request, res: Response) => {
  try {
    // Rate limit: 5 registrations per IP per hour
    const ip = req.ip || 'unknown'
    const { allowed } = await checkRateLimit(`builder:register:${ip}`, 5, 3600)
    if (!allowed) {
      return res.status(429).json({ error: 'Too many registration attempts. Please try again in an hour.' })
    }
  } catch (err) {
    console.error('[builderRegistration] Rate limit check failed:', err)
    return res.status(500).json({ error: 'Service error' })
  }

  const parsed = BuilderApplicationSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.issues })
    return
  }

  const {
    name,
    email,
    phone,
    cin,
    website,
    headquarters,
    description,
    logo_url,
    legal_entities,
    executives,
    projects,
    delivery_track,
  } = parsed.data

  try {
    // Create application row
    const application = await prisma.builderApplicationForm.create({
      data: {
        name,
        email,
        phone,
        cin,
        website: website || null,
        headquarters: headquarters || null,
        description: description || null,
        logo_url: null, // Will be updated after upload
        legal_entities: legal_entities || [],
        executives: executives || [],
        projects: projects || [],
        delivery_track: delivery_track || null,
        status: 'new',
        submitted_at: new Date(),
        ip_address: req.ip || 'unknown',
        user_agent: req.get('user-agent') || 'unknown',
      },
    })

    // Upload logo if provided
    if (logo_url) {
      const logoUrl = await uploadLogoToSupabase(logo_url, application.id)
      if (logoUrl) {
        await prisma.builderApplicationForm.update({
          where: { id: application.id },
          data: { logo_url: logoUrl },
        })
      }
    }

    // Fire webhook to notify admin
    fireWebhook('builder_application_submitted', {
      application_id: application.id,
      company_name: name,
      email,
      phone,
      cin,
    }).catch((e) => console.error('[builderRegistration] webhook failed:', e))

    res.status(201).json({
      success: true,
      application_id: application.id,
      message: 'Application submitted successfully. Our team will review it shortly.',
    })
  } catch (err) {
    console.error('[builderRegistration] Creation failed:', err)
    res.status(500).json({ error: 'Failed to submit application' })
  }
})

async function fireWebhook(event: string, data: Record<string, unknown>) {
  const url = process.env.WEBHOOK_URL
  if (!url) return
  const body = JSON.stringify({ event, data, ts: Date.now() })

  const secret = process.env.WEBHOOK_SECRET
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (secret) {
    const { createHmac } = await import('crypto')
    headers['X-Signature'] = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex')
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { method: 'POST', body, headers })
      if (res.ok) return
    } catch (e) {
      if (attempt === 1) throw e
    }
  }
}

export default router
