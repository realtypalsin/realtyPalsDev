'use client'

import { memo, useState, useEffect } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { MessageCircle, Trash2, ChevronRight, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { track } from '@/lib/analytics'

interface Session {
  id: string
  title: string
  messageCount: number
  created_at: string
}

interface SessionsListProps {
  userId?: string | null
  guestToken?: string | null
  onSessionSelect: (sessionId: string) => void
  isLoading?: boolean
}

export const SessionsList = memo(function SessionsList({
  userId,
  guestToken,
  onSessionSelect,
  isLoading = false,
}: SessionsListProps) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSessions()
  }, [userId, guestToken])

  const fetchSessions = async () => {
    if (!userId && !guestToken) return

    setLoading(true)
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (userId) {
        const supabaseToken = localStorage.getItem('supabase_token')
        if (supabaseToken) headers.Authorization = `Bearer ${supabaseToken}`
      } else if (guestToken) {
        headers['X-Guest-Token'] = guestToken
      }

      const response = await fetch('/api/chat/sessions/list', { headers })
      if (!response.ok) throw new Error('Failed to fetch sessions')

      const data = await response.json()
      setSessions(data.sessions || [])
      setError(null)
    } catch (err) {
      console.error('Failed to load session history:', err)
      setError('Could not load chat history')
    } finally {
      setLoading(false)
    }
  }

  const handleSessionSelect = (sessionId: string) => {
    track('session_resumed', { sessionId })
    onSessionSelect(sessionId)
  }

  if (!userId && !guestToken) return null

  if (loading) {
    return (
      <div className="px-3 py-2 flex items-center justify-center">
        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
      </div>
    )
  }

  if (sessions.length === 0) return null

  return (
    <div className="px-3 py-3 border-t border-slate-200 dark:border-slate-700">
      <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Recent Chats</h3>
      <AnimatePresence>
        <div className="space-y-1">
          {sessions.map((session, idx) => (
            <m.button
              key={session.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => handleSessionSelect(session.id)}
              disabled={isLoading}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group disabled:opacity-50"
            >
              <div className="flex items-start gap-2">
                <MessageCircle className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate group-hover:text-slate-900 dark:group-hover:text-slate-100">
                    {session.title || 'Untitled Chat'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })} • {session.messageCount} messages
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </m.button>
          ))}
        </div>
      </AnimatePresence>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-2">{error}</p>
      )}
    </div>
  )
})

SessionsList.displayName = 'SessionsList'
