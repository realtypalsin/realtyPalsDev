'use client'

import { memo, useState, useCallback } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react'
import { track } from '@/lib/analytics'

interface PropertyFeedbackProps {
  sessionId: string
  projectId: string
  projectName: string
  onFeedbackSubmitted?: () => void
}

const FEEDBACK_REASONS = {
  good: [
    'Perfect budget fit',
    'Great location',
    'Attractive pricing',
    'Good amenities',
    'Builder reputation',
    'Possession timeline',
  ],
  bad: [
    'Too expensive',
    'Possession too far',
    'Wrong location',
    'Not enough amenities',
    'Builder concerns',
    'Limited parking',
    'Small carpet area',
    'High maintenance',
  ],
}

export const PropertyFeedback = memo(function PropertyFeedback({
  sessionId,
  projectId,
  projectName,
  onFeedbackSubmitted,
}: PropertyFeedbackProps) {
  const [sentiment, setSentiment] = useState<'good' | 'bad' | null>(null)
  const [selectedReasons, setSelectedReasons] = useState<string[]>([])
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = useCallback(async () => {
    if (!sentiment) return

    setLoading(true)
    try {
      const response = await fetch('/api/chat/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          projectId,
          sentiment,
          reasons: selectedReasons,
          comment: comment || undefined,
        }),
      })

      if (response.ok) {
        track('property_feedback_submitted', { sentiment, projectId })
        setSubmitted(true)
        onFeedbackSubmitted?.()
        setTimeout(() => setSentiment(null), 2000)
      }
    } catch (err) {
      console.error('Failed to submit feedback:', err)
    } finally {
      setLoading(false)
    }
  }, [sentiment, selectedReasons, comment, sessionId, projectId, onFeedbackSubmitted])

  if (submitted) {
    return (
      <m.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="text-center py-2 text-sm text-green-600 dark:text-green-400 font-medium"
      >
        ✓ Thank you for your feedback!
      </m.div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setSentiment('good')}
          disabled={loading}
          className={`flex items-center gap-1 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
            sentiment === 'good'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          } disabled:opacity-50`}
        >
          <ThumbsUp className="w-4 h-4" />
          Good fit
        </button>

        <button
          onClick={() => setSentiment('bad')}
          disabled={loading}
          className={`flex items-center gap-1 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
            sentiment === 'bad'
              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          } disabled:opacity-50`}
        >
          <ThumbsDown className="w-4 h-4" />
          Not for me
        </button>
      </div>

      <AnimatePresence>
        {sentiment && (
          <m.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <div>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Why?</p>
              <div className="flex flex-wrap gap-2">
                {FEEDBACK_REASONS[sentiment].map((reason) => (
                  <button
                    key={reason}
                    onClick={() =>
                      setSelectedReasons((prev) =>
                        prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason]
                      )
                    }
                    disabled={loading}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      selectedReasons.includes(reason)
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    } disabled:opacity-50`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <textarea
                placeholder="Add a comment (optional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={loading}
                maxLength={200}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                rows={2}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{comment.length}/200</p>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading || !sentiment}
              className="w-full px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Submit feedback
            </button>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
})

PropertyFeedback.displayName = 'PropertyFeedback'
