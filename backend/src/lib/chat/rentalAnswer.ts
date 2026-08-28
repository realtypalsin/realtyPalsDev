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

  const [, low, high] = found
  return {
    sourced: true,
    text:
      `Indicative monthly rent for a ${config} in ${city} runs roughly ₹${low} to ₹${high}. ` +
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
