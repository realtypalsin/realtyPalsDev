import { Wallet, Building2, Scale, MapPin, Trees, MessageSquare, ShieldCheck, FileText, TrendingUp, Store, LayoutGrid, Sparkles, Compass, Home } from 'lucide-react'
import type { ReactNode } from 'react'

export const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu

export const CHIP_ICON_PATTERNS = [
  { regex: /return|roi|yield|invest|appreciation|growth|gain/i, icon: TrendingUp },
  { regex: /commercial|retail|shop|mall|office/i, icon: Store },
  { regex: /cost|price|budget|emi|payment|crore|lakh|₹|financial|loan/i, icon: Wallet },
  { regex: /\b\d\s*bhk\b|penthouse|configuration|layout|floor plan/i, icon: LayoutGrid },
  { regex: /compare|vs|versus|difference|tradeoff|better/i, icon: Scale },
  { regex: /amenit|park|pool|gym|clubhouse|garden|luxury|lifestyle/i, icon: Sparkles },
  { regex: /green|trees|forest|golf/i, icon: Trees },
  { regex: /sector|metro|location|area|distance|near|expressway/i, icon: MapPin },
  { regex: /builder|developer|rera|legal|risk|track|verified/i, icon: ShieldCheck },
  { regex: /plan|document|review|cost sheet|breakdown/i, icon: FileText },
  { regex: /ready|resale|villa|independent|family/i, icon: Home },
  { regex: /project|society|apartment|flat|building/i, icon: Building2 },
] as const

export function renderChipIcon(label: string, isActive: boolean): ReactNode {
  const pattern = CHIP_ICON_PATTERNS.find(p => p.regex.test(label))
  const Icon = pattern?.icon || Compass

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
