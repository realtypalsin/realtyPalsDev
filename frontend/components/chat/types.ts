export type ChipPickerMode = 'single' | 'multi'

export interface Chip {
  emoji: string
  label: string
  msg?: string
  picker?: ChipPickerMode
  pickerAction?: string
  pickerModal?: boolean
  special?: string
}

export interface ChipPickerState {
  mode: ChipPickerMode
  action: string
  label: string
  isModal: boolean
  selected: string[]
}
