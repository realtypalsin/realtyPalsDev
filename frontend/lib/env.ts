function getApiBase(): string {
  const direct = process.env.NEXT_PUBLIC_API_URL
  if (direct) return direct.replace(/\/$/, '')
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL
  if (backend) return `${backend.replace(/\/$/, '')}/api/v1`
  return '/api/v1'
}

export const API_BASE = getApiBase()
