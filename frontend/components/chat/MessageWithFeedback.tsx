'use client'

import { memo } from 'react'
import { m } from 'framer-motion'
import type { ChatMessage } from '@/types/property'
import MessageBubble from '@/components/chat/MessageBubble'
import { PropertyFeedback } from './PropertyFeedback'

interface MessageWithFeedbackProps {
  message: ChatMessage
  index: number
  sessionId: string
  userId?: string | null
  guestToken?: string | null
  // Pass through all other MessageBubble props
  [key: string]: any
}

export const MessageWithFeedback = memo(function MessageWithFeedback({
  message,
  index,
  sessionId,
  userId,
  guestToken,
  ...messageBubbleProps
}: MessageWithFeedbackProps) {
  const showFeedback = message.type === 'ai' && message.properties?.length

  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="space-y-2"
    >
      <MessageBubble message={message} index={index} {...messageBubbleProps} />

      {showFeedback && message.properties?.[0] && (
        <div className="pl-12 pr-4">
          <PropertyFeedback
            sessionId={sessionId}
            projectId={message.properties[0].id}
            projectName={message.properties[0].name}
            onFeedbackSubmitted={() => {
              // Feedback submitted - can optionally show confirmation toast
            }}
          />
        </div>
      )}
    </m.div>
  )
})

MessageWithFeedback.displayName = 'MessageWithFeedback'
