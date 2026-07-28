'use client'

import { AnimatePresence } from 'framer-motion'
import { SuggestionChip } from '@/components/chat/SuggestionChip'
import { CardSelectorChip } from '@/components/chat/CardSelectorChip'
import type { ChipAction, ChipPickerState } from '@/components/chat/types'
import type { ProjectCard } from '@/types/project'

interface ChipsSectionProps {
  chips: ChipAction[]
  chipPicker: ChipPickerState | null
  lastShortlist: ProjectCard[]
  onSetChipPicker: (picker: ChipPickerState | null) => void
  onAction: (action: ChipAction) => void
  disabled?: boolean
}

export function ChipsSection({
  chips,
  chipPicker,
  lastShortlist,
  onSetChipPicker,
  onAction,
  disabled,
}: ChipsSectionProps) {
  if (!chips.length) return null

  return (
    <AnimatePresence mode="wait">
      <div className="flex flex-wrap gap-2 mt-4">
        {chips.map((chip) => {
          const hasMultiProject = (chip.payload as any)?.projects?.length > 1
          return hasMultiProject ? (
            <CardSelectorChip
              key={chip.id}
              chip={chip}
              projects={lastShortlist}
              onSelect={(project, projectId) => {
                onSetChipPicker(null)
                onAction(chip)
              }}
            />
          ) : (
            <SuggestionChip
              key={chip.id}
              chip={chip}
              chipPicker={chipPicker}
              onSetChipPicker={onSetChipPicker}
              onAction={onAction}
              disabled={disabled}
            />
          )
        })}
      </div>
    </AnimatePresence>
  )
}
