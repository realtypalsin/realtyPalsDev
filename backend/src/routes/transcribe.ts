// backend/src/routes/transcribe.ts
// POST /transcribe  (multipart/form-data, field: audio)
// No auth required.
import { Router, Request, Response } from 'express'
import multer from 'multer'
import { toFile } from 'groq-sdk'
import { getGroq } from '../lib/ai/groq'

const router = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
})

router.post('/', upload.single('audio'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'audio field required' })
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
