/**
 * Document Q&A API
 *
 * POST /api/v1/documents          — upload a PDF/image, extract text, store
 * GET  /api/v1/documents?slug=... — list documents for a project
 * POST /api/v1/documents/ask      — ask a question about a stored document
 */
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { createClient } from '@/lib/supabase'
import { groq, GROQ_SMART } from '@/lib/ai/groq'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const project_id   = formData.get('project_id') as string | null
  const project_slug = formData.get('project_slug') as string | null
  const doc_type     = (formData.get('doc_type') as string | null) ?? 'brochure'

  if (!file || !project_id || !project_slug) {
    return Response.json({ error: 'file, project_id, project_slug required' }, { status: 400 })
  }

  if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return Response.json({ error: 'Only PDF and images (JPEG/PNG/WEBP) supported' }, { status: 400 })
  }

  if (file.size > 20 * 1024 * 1024) {
    return Response.json({ error: 'File too large (max 20MB)' }, { status: 400 })
  }

  // Upload to Supabase Storage
  const supabase = createClient()
  const ext = file.name.split('.').pop() ?? 'pdf'
  const storagePath = `documents/${project_slug}/${Date.now()}.${ext}`
  const bytes = await file.arrayBuffer()

  const { error: uploadError } = await supabase.storage
    .from('project-docs')
    .upload(storagePath, bytes, { contentType: file.type, upsert: false })

  if (uploadError) {
    return Response.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
  }

  const { data: urlData } = supabase.storage
    .from('project-docs')
    .getPublicUrl(storagePath)

  const publicUrl = urlData.publicUrl

  // Extract text using Groq (image) or raw text extraction (PDF)
  let content_text: string | null = null

  if (file.type.startsWith('image/')) {
    try {
      const base64 = Buffer.from(bytes).toString('base64')
      const resp = await groq.chat.completions.create({
        model: 'llama-3.2-11b-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: `data:${file.type};base64,${base64}` },
              },
              {
                type: 'text',
                text: 'Extract all text from this real estate document. Return only the extracted text, nothing else.',
              },
            ],
          },
        ],
        max_tokens: 2000,
      })
      content_text = resp.choices[0]?.message?.content ?? null
    } catch (e) {
      console.warn('[docs] vision extract failed:', e)
    }
  }

  let doc: { id: string }
  try {
    doc = await prisma.projectDocument.create({
      data: {
        project_id,
        project_slug,
        name:         file.name,
        storage_url:  publicUrl,
        content_text,
        doc_type,
      },
    })
  } catch (dbError) {
    console.error('[docs] prisma create failed — removing orphaned file:', dbError)
    await supabase.storage.from('project-docs').remove([storagePath])
    return Response.json({ error: 'Failed to save document record' }, { status: 500 })
  }

  return Response.json({ success: true, id: doc.id, url: publicUrl }, { status: 201 })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')
  if (!slug) return Response.json({ error: 'slug required' }, { status: 400 })

  const docs = await prisma.projectDocument.findMany({
    where: { project_slug: slug },
    orderBy: { created_at: 'desc' },
    select: { id: true, name: true, storage_url: true, doc_type: true, created_at: true },
  })

  return Response.json({ docs })
}
