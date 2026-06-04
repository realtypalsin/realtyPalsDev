import { NextRequest } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req: NextRequest) {
  const formData = await req.formData().catch(() => null)
  if (!formData) {
    return Response.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const audioFile = formData.get('audio') as File | null
  if (!audioFile) {
    return Response.json({ error: 'audio field required' }, { status: 400 })
  }

  if (audioFile.size > 25 * 1024 * 1024) {
    return Response.json({ error: 'Audio too large (max 25 MB)' }, { status: 400 })
  }

  try {
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3-turbo',
      language: 'hi',
      response_format: 'json',
    })
    return Response.json({ text: transcription.text ?? '' })
  } catch (err) {
    console.error('[transcribe]', err)
    return Response.json({ error: 'Transcription failed' }, { status: 500 })
  }
}
