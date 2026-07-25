import { adminAuthHeaders } from './authedFetch'
import { API_BASE } from './env'

export async function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...(init.headers as object), ...adminAuthHeaders() },
  })
  if (res.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('admin_token')
    window.location.href = '/admin/login'
  }
  return res
}
