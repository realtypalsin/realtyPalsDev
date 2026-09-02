// backend/src/lib/chat/rentalAnswer.ts

import { webSearch } from '../web'

const RENT_RANGE = /₹\s?([\d,]{4,})\s*(?:-|–|—|to)\s*₹?\s?([\d,]{4,})/

export interface RentalAnswer {
  text: string
  sourced: boolean
}

const BRIDGE =
  'If you are weighing renting against buying, I can show you what the monthly outgo looks like on a purchase in the same area.'

/** A one-line indicative rent range, or an honest gap. */
export async function rentalAnswer(message: string, city = 'Noida'): Promise<RentalAnswer> {
  const bhk = message.match(/(\d)\s*bhk/i)?.[1]
  const config = bhk ? `${bhk} BHK` : '2-3 BHK'

  let context = ''
  try {
    context = await webSearch(`average monthly rent ${config} ${city} 2026`, 3)
  } catch {
    context = ''
  }

  const found = context.match(RENT_RANGE)
  if (!found) {
    return {
      sourced: false,
      text:
        `We track new-construction sales rather than rentals, so I do not hold a verified rent ` +
        `figure for a ${config} in ${city}. ${BRIDGE}`,
    }
  }

  /**
   * The captured strings are scraped text, so they are validated before they
   * are printed rather than interpolated raw.
   *
   * `[\d,]{4,}` matches a comma as a character, so a truncated figure in the
   * source came through as its own "number". Measured: "I want to rent a 2BHK
   * in Noida for 25k a month" was answered "runs roughly ₹10000 to ₹70,0" —
   * a malformed upper bound, and an unformatted lower one, both printed as
   * though they were figures we stood behind.
   *
   * A monthly rent outside ₹3,000 to ₹10,00,000 is a mis-parse, not a rent.
   */
  const parse = (raw: string): number | null => {
    const n = Number(raw.replace(/,/g, ''))
    return Number.isFinite(n) && n >= 3_000 && n <= 1_000_000 ? n : null
  }
  const lowN = parse(found[1])
  const highN = parse(found[2])
  if (lowN === null || highN === null || highN < lowN) {
    return {
      sourced: false,
      text:
        `We track new-construction sales rather than rentals, so I do not hold a verified rent ` +
        `figure for a ${config} in ${city}. ${BRIDGE}`,
    }
  }

  const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`
  return {
    sourced: true,
    text:
      `Indicative monthly rent for a ${config} in ${city} runs roughly ${inr(lowN)} to ${inr(highN)}. ` +
      `That is a market range from public listings data, not a RealtyPals figure — we track ` +
      `new-construction sales, not rentals, so treat it as a ballpark rather than a quote. ${BRIDGE}`,
  }
}

/** True when the question is about renting a home rather than rental yield. */
export function isRentalQuestion(message: string): boolean {
  const m = (message || '').toLowerCase()
  if (/\byield\b/.test(m)) return false
  return /\brent(al|als|ing)?\b|\bfor rent\b|\bto let\b|\btenant\b/.test(m)
}
