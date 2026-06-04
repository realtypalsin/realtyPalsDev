import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { groq, GROQ_SMART } from '@/lib/ai/groq'

const Schema = z.object({
  document_id: z.string().uuid(),
  question:    z.string().min(5).max(500),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try { body = await req.json() } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = Schema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const { document_id, question } = parsed.data

  const doc = await prisma.projectDocument.findUnique({ where: { id: document_id } })
  if (!doc) return Response.json({ error: 'Document not found' }, { status: 404 })

  if (!doc.content_text) {
    return Response.json({
      answer: "Sorry, text couldn't be extracted from this document. Try uploading a clearer image or a text-based PDF.",
    })
  }

  const maxContext = doc.content_text.slice(0, 8000)

  const resp = await groq.chat.completions.create({
    model: GROQ_SMART,
    messages: [
      {
        role: 'system',
        content: `You are a real estate document analyst. Answer questions strictly based on the document text provided. If the answer isn't in the document, say so clearly. Be concise and precise.`,
      },
      {
        role: 'user',
        content: `DOCUMENT:\n${maxContext}\n\nQUESTION: ${question}`,
      },
    ],
    max_tokens: 600,
    temperature: 0.1,
  })

  const answer = resp.choices[0]?.message?.content ?? 'Unable to generate answer.'
  return Response.json({ answer, document_name: doc.name })
}
