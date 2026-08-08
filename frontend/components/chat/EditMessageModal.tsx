'use client'

import { useState, useRef, useEffect } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { X, Send } from 'lucide-react'

interface EditMessageModalProps {
  isOpen: boolean
  initialText: string
  onClose: () => void
  onSave: (newText: string) => void
  isLoading?: boolean
}

export function EditMessageModal({ isOpen, initialText, onClose, onSave, isLoading }: EditMessageModalProps) {
  const [text, setText] = useState(initialText)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setText(initialText)
  }, [initialText, isOpen])

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.setSelectionRange(text.length, text.length)
    }
  }, [isOpen, text])

  const handleSave = () => {
    const trimmed = text.trim()
    if (trimmed && trimmed !== initialText) {
      onSave(trimmed)
    } else {
      onClose()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave()
    }
    if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          />
          <m.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-2xl mx-auto z-50"
          >
            <div className="bg-white dark:bg-[#111] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Edit message</h2>
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  placeholder="Edit your message..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500 dark:focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 dark:focus:ring-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed resize-none min-h-[120px] font-[16px]"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Press <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 text-[11px] font-medium">Cmd+Enter</kbd> to save
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-800">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isLoading || !text.trim() || text.trim() === initialText}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Saving…</span>
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>Save & Regenerate</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  )
}
