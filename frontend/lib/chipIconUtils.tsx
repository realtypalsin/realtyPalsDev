import { Wallet, Building2, Scale, MapPin, Trees, MessageSquare, ShieldCheck, FileText } from 'lucide-react'
import type { ReactNode } from 'react'

export const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu

export const CHIP_ICON_PATTERNS = [
  { regex: /cost|price|budget|emi|payment|crore|lakh|₹|financial|loan/i, icon: Wallet },
  { regex: /bhk|project|apartment|house|home|villa|society|building|flat/i, icon: Building2 },
  { regex: /compare|vs|difference|tradeoff/i, icon: Scale },
  { regex: /amenit|park|pool|gym|clubhouse|garden|green/i, icon: Trees },
  { regex: /sector|metro|location|area|distance|near/i, icon: MapPin },
  { regex: /builder|developer|rera|legal|risk|track/i, icon: ShieldCheck },
  { regex: /plan|document|review/i, icon: FileText },
] as const

export function renderChipIcon(label: string, isActive: boolean): ReactNode {
  const pattern = CHIP_ICON_PATTERNS.find(p => p.regex.test(label))
  const Icon = pattern?.icon || MessageSquare

  const iconClass = `flex-shrink-0 transition-colors ${
    isActive
      ? 'text-blue-200'
      : 'text-blue-500/80 dark:text-blue-400/80 group-hover:text-blue-600 dark:group-hover:text-blue-300'
  }`

  return <Icon size={13.5} className={iconClass} />
}

export function stripEmojis(text: string): string {
  return text.replace(EMOJI_REGEX, '').trim()
}
