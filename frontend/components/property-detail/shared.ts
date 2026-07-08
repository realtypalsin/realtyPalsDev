import {
  Layout, Maximize2, Shield, Car, Columns, Award, Sparkles, Wind, Home, Compass, Droplet, Cpu, User
} from 'lucide-react'
import type { UnitTypeSummary } from '@/types/project'

export const tierLabel: Record<string, string> = { 
  STRONG_BUY: 'Strong Buy', 
  BUY: 'Buy', 
  HOLD: 'Hold', 
  WATCH: 'Watch', 
  AVOID: 'Avoid' 
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ICON_MAP: Record<string, any> = {
  layout: Layout,
  height: Maximize2,
  mivan: Shield,
  shield: Shield,
  parking: Car,
  utility: Columns,
  briefcase: Award,
  sun: Sparkles,
  lock: Shield,
  ac: Wind,
  kitchen: Home,
  columns: Columns,
  door: Compass,
  droplet: Droplet,
  cpu: Cpu,
  car: Car,
  user: User
}

export function priceLabel(u: UnitTypeSummary): string {
  if (u.price_label) return u.price_label
  if (u.price_min_cr == null) return 'Price on Request'
  if (u.price_max_cr == null || u.price_min_cr === u.price_max_cr) return `₹${Number(u.price_min_cr).toFixed(2)} Cr`
  return `₹${Number(u.price_min_cr).toFixed(2)} – ${Number(u.price_max_cr).toFixed(2)} Cr`
}

export function areaSqft(u: UnitTypeSummary): number | null {
  return u.super_area_sqft ?? u.carpet_area_sqft ?? null
}
