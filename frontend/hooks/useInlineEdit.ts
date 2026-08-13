import { useState } from 'react'

export function useInlineEdit(initialContent: string) {
  const [isEditing, setIsEditing] = useState(false)
  const [text, setText] = useState(initialContent)
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async (onSave: (newContent: string) => Promise<void>) => {
    const trimmed = text.trim()
    if (!trimmed || trimmed === initialContent) {
      setIsEditing(false)
      return
    }
    setIsLoading(true)
    try {
      await onSave(trimmed)
      setIsEditing(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setText(initialContent)
  }

  return {
    isEditing,
    setIsEditing,
    text,
    setText,
    isLoading,
    setIsLoading,
    handleSave,
    handleCancel,
  }
}
