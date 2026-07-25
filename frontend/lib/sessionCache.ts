export interface CachedSession {
  session_id: string
  title?: string | null
  chat_phase?: 'DISCOVERY' | 'ADVISOR'
  last_intent?: Record<string, unknown> | null
  last_projects?: unknown[]
  ui_state?: unknown
  restored: unknown[]
}

const MAX_SESSIONS = 20

class LRUSessionCache {
  private map = new Map<string, CachedSession>()

  get(k: string) {
    const v = this.map.get(k)
    if (v) {
      this.map.delete(k)
      this.map.set(k, v)
    }
    return v
  }

  set(k: string, v: CachedSession) {
    if (this.map.has(k)) this.map.delete(k)
    this.map.set(k, v)
    if (this.map.size > MAX_SESSIONS) {
      const firstKey = this.map.keys().next().value
      if (firstKey !== undefined) this.map.delete(firstKey)
    }
  }

  delete(k: string) {
    this.map.delete(k)
  }
}

export const LOCAL_SESSION_CACHE = new LRUSessionCache()
