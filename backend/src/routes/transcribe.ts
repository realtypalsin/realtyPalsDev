// backend/src/routes/transcribe.ts
// POST /transcribe  (multipart/form-data, field: audio)
// Guest access allowed; protected by IP rate limiting.
import { Router, Request, Response } from 'express'
import multer from 'multer'
import { toFile } from 'groq-sdk'
import { getGroq } from '../lib/ai/groq'
import { checkRateLimit } from '../lib/cache'
import { clientIp } from '../lib/request'

const router = Router()

const ALLOWED_AUDIO = new Set([
  'audio/webm', 'audio/ogg', 'audio/wav', 'audio/mpeg',
  'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/flac',
])

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
})

router.post('/', upload.single('audio'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'audio field required' })
    return
  }

  const ip = clientIp(req)
  const { allowed } = await checkRateLimit(`transcribe:${ip}`, 15, 60)
  if (!allowed) {
    res.status(429).json({ error: 'Too many requests. Please try again later.' })
    return
  }

  if (!ALLOWED_AUDIO.has(req.file.mimetype)) {
    res.status(400).json({ error: 'Unsupported audio format. Supported: webm, ogg, wav, mp3, mp4, m4a, aac, flac.' })
    return
  }

  try {
    const file = await toFile(
      req.file.buffer,
      req.file.originalname,
      { type: req.file.mimetype },
    )

    const transcription = await getGroq().audio.transcriptions.create({
      file,
      model: 'whisper-large-v3-turbo',
      language: 'hi',
      response_format: 'json',
    })

    res.json({ text: transcription.text ?? '' })
  } catch (err) {
    console.error('[transcribe]', err)
    res.status(500).json({ error: 'Transcription failed' })
  }
})

export default router
