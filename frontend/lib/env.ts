function getApiBase(): string {
  const direct = process.env.NEXT_PUBLIC_API_URL
  if (direct) return direct.replace(/\/$/, '')
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL
  if (backend) return `${backend.replace(/\/$/, '')}/api/v1`
  throw new Error('Set NEXT_PUBLIC_API_URL or NEXT_PUBLIC_BACKEND_URL in .env.local')
}
export const API_BASE = getApiBase()
