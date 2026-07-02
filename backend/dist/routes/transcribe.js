"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/transcribe.ts
// POST /transcribe  (multipart/form-data, field: audio)
// Guest access allowed; protected by IP rate limiting.
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const groq_sdk_1 = require("groq-sdk");
const groq_1 = require("../lib/ai/groq");
const cache_1 = require("../lib/cache");
const request_1 = require("../lib/request");
const router = (0, express_1.Router)();
const ALLOWED_AUDIO = new Set([
    'audio/webm', 'audio/ogg', 'audio/wav', 'audio/mpeg',
    'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/flac',
]);
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});
router.post('/', upload.single('audio'), async (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: 'audio field required' });
        return;
    }
    const ip = (0, request_1.clientIp)(req);
    const { allowed } = await (0, cache_1.checkRateLimit)(`transcribe:${ip}`, 15, 60);
    if (!allowed) {
        res.status(429).json({ error: 'Too many requests. Please try again later.' });
        return;
    }
    if (!ALLOWED_AUDIO.has(req.file.mimetype)) {
        res.status(400).json({ error: 'Unsupported audio format. Supported: webm, ogg, wav, mp3, mp4, m4a, aac, flac.' });
        return;
    }
    try {
        const file = await (0, groq_sdk_1.toFile)(req.file.buffer, req.file.originalname, { type: req.file.mimetype });
        const transcription = await (0, groq_1.getGroq)().audio.transcriptions.create({
            file,
            model: 'whisper-large-v3-turbo',
            language: 'hi',
            response_format: 'json',
        });
        res.json({ text: transcription.text ?? '' });
    }
    catch (err) {
        console.error('[transcribe]', err);
        res.status(500).json({ error: 'Transcription failed' });
    }
});
exports.default = router;
