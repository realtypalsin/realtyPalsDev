// backend/src/lib/ai/inventoryEnvelope.ts
//
// What we actually have, in one sentence, from rows.
//
// When a buyer is told we do not cover their city, the useful next line is not
// "but we're experts in Noida" — it is what we can actually show them. Measured
// on the funnel run, "I might be interested in Noida properties" was answered
// with "Noida is a fantastic choice… robust infrastructure, excellent metro
// connectivity, world-class social amenities" and two stacked questions. Not one
// figure, and nothing a buyer could act on.
//
// This is the honest version: the real price floor and ceiling, the
// configurations we hold, how many sectors, how many ready to move. Every
// number is an aggregate over our own rows, so it cannot drift from the
// inventory the next turn will show.

import { prisma } from '../db'
import { getCached, setCached } from '../cache'

const CACHE_KEY = 'chat:inventoryEnvelope'
const TTL_SECONDS = 600

export interface InventoryEnvelope {
  projects: number
  sectors: number
  readyToMove: number
  priceMinCr: number | null
  priceMaxCr: number | null
  bhk: number[]
}

export async function inventoryEnvelope(): Promise<InventoryEnvelope | null> {
  const hit = await getCached<InventoryEnvelope>(CACHE_KEY)
  if (hit) return hit
  try {
    const [rows, units] = await Promise.all([
      prisma.project.findMany({ select: { sector: true, status: true, price_min_cr: true } }),
      prisma.unitType.findMany({ select: { bhk: true } }),
    ])
    if (rows.length === 0) return null

    const priced = rows.map(r => r.price_min_cr).filter((n): n is number => typeof n === 'number' && n > 0)
    const envelope: InventoryEnvelope = {
      projects: rows.length,
      sectors: new Set(rows.map(r => r.sector).filter(Boolean)).size,
      readyToMove: rows.filter(r => /ready/i.test(String(r.status ?? ''))).length,
      priceMinCr: priced.length ? Math.min(...priced) : null,
      priceMaxCr: priced.length ? Math.max(...priced) : null,
      bhk: [...new Set(units.map(u => u.bhk).filter((n): n is number => typeof n === 'number' && n > 0))].sort((a, b) => a - b),
    }
    await setCached(CACHE_KEY, envelope, TTL_SECONDS)
    return envelope
  } catch (e) {
    // A missing envelope means the sentence is simply omitted. Never fatal.
    console.warn('[INVENTORY_ENVELOPE:DB_ERROR]', (e as Error).message)
    return null
  }
}

/** A crore figure written the way buyers read it. */
function cr(n: number): string {
  return n >= 1 ? `₹${n % 1 === 0 ? n : n.toFixed(2).replace(/0$/, '')} Cr` : `₹${Math.round(n * 100)} L`
}

/**
 * One or two sentences naming the envelope. Empty when we hold nothing —
 * an absent claim beats a claim about zero rows.
 */
export function renderEnvelope(e: InventoryEnvelope | null): string {
  if (!e || e.projects === 0) return ''
  const parts: string[] = []
  if (e.priceMinCr != null && e.priceMaxCr != null) {
    parts.push(`${e.projects} projects across ${e.sectors} sectors, from ${cr(e.priceMinCr)} to ${cr(e.priceMaxCr)}`)
  } else {
    parts.push(`${e.projects} projects across ${e.sectors} sectors`)
  }
  if (e.bhk.length) {
    parts.push(`${e.bhk.join(', ')} BHK`)
  }
  if (e.readyToMove > 0) {
    parts.push(`${e.readyToMove} of them ready to move`)
  }
  return `We hold ${parts.join(' — ')}.`
}
