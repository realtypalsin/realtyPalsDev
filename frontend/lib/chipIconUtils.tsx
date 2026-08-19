import {
  TrendUp,
  Storefront,
  Wallet,
  SquaresFour,
  Scales,
  Sparkle,
  Tree,
  MapPin,
  ShieldCheck,
  FileText,
  House,
  Buildings,
  Compass
} from '@phosphor-icons/react'
import type { ReactNode } from 'react'

export const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu

export const CHIP_ICON_PATTERNS = [
  { regex: /return|roi|yield|invest|appreciation|growth|gain/i, icon: TrendUp },
  { regex: /commercial|retail|shop|mall|office/i, icon: Storefront },
  { regex: /cost|price|budget|emi|payment|crore|lakh|₹|financial|loan/i, icon: Wallet },
  { regex: /\b\d\s*bhk\b|penthouse|configuration|layout|floor plan/i, icon: SquaresFour },
  { regex: /compare|vs|versus|difference|tradeoff|better/i, icon: Scales },
  { regex: /amenit|park|pool|gym|clubhouse|garden|luxury|lifestyle/i, icon: Sparkle },
  { regex: /green|trees|forest|golf/i, icon: Tree },
  { regex: /sector|metro|location|area|distance|near|expressway/i, icon: MapPin },
  { regex: /builder|developer|rera|legal|risk|track|verified/i, icon: ShieldCheck },
  { regex: /plan|document|review|cost sheet|breakdown/i, icon: FileText },
  { regex: /ready|resale|villa|independent|family/i, icon: House },
  { regex: /project|society|apartment|flat|building/i, icon: Buildings },
] as const

export function renderChipIcon(label: string, isActive: boolean): ReactNode {
  const pattern = CHIP_ICON_PATTERNS.find(p => p.regex.test(label))
  const Icon = pattern?.icon || Compass

  const iconClass = `flex-shrink-0 transition-colors ${
    isActive
      ? 'text-blue-200'
      : 'text-blue-500/80 dark:text-blue-400/80 group-hover:text-blue-600 dark:group-hover:text-blue-300'
  }`

  return <Icon size={14} weight="duotone" className={iconClass} />
}

export function stripEmojis(text: string): string {
  return text.replace(EMOJI_REGEX, '').trim()
}
