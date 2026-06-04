function getApiBase(): string {
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

export const API_BASE = getApiBase()
