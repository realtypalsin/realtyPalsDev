// backend/src/lib/uploadValidator.ts
// Validates uploaded files by inspecting their magic bytes (actual file header),
// not just the Content-Type header from the client, which can be spoofed.

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
])

export async function validateUploadedFile(buffer: Buffer): Promise<{
  valid: boolean
  mime: string | null
  error: string | null
}> {
  const fileType = await import('file-type')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fileTypeFromBuffer = (fileType as any).fromBuffer || (fileType as any).default?.fromBuffer || (fileType as any).fileTypeFromBuffer;
  const detected = await fileTypeFromBuffer(buffer)

  if (!detected) {
    return { valid: false, mime: null, error: 'File type could not be determined.' }
  }

  if (!ALLOWED_MIME_TYPES.has(detected.mime)) {
    return { 
      valid: false, 
      mime: detected.mime, 
      error: `File type '${detected.mime}' is not allowed. Only images and PDFs are permitted.`
    }
  }

  return { valid: true, mime: detected.mime, error: null }
}
