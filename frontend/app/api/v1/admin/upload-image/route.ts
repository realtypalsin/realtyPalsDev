import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateAdminToken } from '@/lib/adminToken'

const BUCKET = 'property-images'

// Server-side Supabase client using service role key → bypasses RLS
function adminStorage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  return createClient(url, key)
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!await validateAdminToken(token)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const formData = await req.formData().catch(() => null)
  if (!formData) return Response.json({ error: 'Invalid form data' }, { status: 400 })

  const file = formData.get('file') as File | null
  const slug = (formData.get('slug') as string | null) ?? 'unnamed'

  if (!file) return Response.json({ error: 'No file provided' }, { status: 400 })
  if (file.size > 10 * 1024 * 1024) return Response.json({ error: 'File too large (max 10 MB)' }, { status: 400 })

  const ext       = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path      = `projects/${slug}-${Date.now()}.${ext}`
  const buffer    = Buffer.from(await file.arrayBuffer())
  const supabase  = adminStorage()

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (uploadErr) {
    return Response.json({ error: uploadErr.message }, { status: 500 })
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return Response.json({ url: data.publicUrl })
}
