function getApiBase(): string {
<<<<<<< HEAD
  const base = process.env.NEXT_PUBLIC_API_URL
  if (!base) {
    throw new Error(
      'NEXT_PUBLIC_API_URL is required. Set it in .env.local\n' +
      'Example: NEXT_PUBLIC_API_URL=/api/v1'
    )
  }
  // Accept both relative paths (/api/v1) and absolute URLs (http://...)
  return base.replace(/\/$/, '')
}

=======
  const direct = process.env.NEXT_PUBLIC_API_URL
  if (direct) return direct.replace(/\/$/, '')
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL
  if (backend) return `${backend.replace(/\/$/, '')}/api/v1`
  throw new Error('Set NEXT_PUBLIC_API_URL or NEXT_PUBLIC_BACKEND_URL in .env.local')
}
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
export const API_BASE = getApiBase()
