// backend/src/lib/ai/sanitizeOutput.ts

/** Emoji, pictographs, dingbats, and the variation selector that follows them. */
const EMOJI =
  /[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{2460}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{1F1E6}-\u{1F1FF}\u{200D}]/gu

/** Portals we neither cite nor name. */
const PLATFORMS =
  /\b(99acres|magicbricks|magic bricks|nobroker|no broker|housing\.com|proptiger|square ?yards|makaan|commonfloor|olx|quikr|zillow|realtor\.com)\b/gi

/** Attribution scaffolding left behind once the platform name is removed. */
const DANGLING_ATTRIBUTION = [
  /\((?:source|via|per|from)\s*[:\-—]?\s*\)/gi,
  /\bas (?:reported|listed) (?:on|by)\s*[,.]?/gi,
  /\baccording to\s*[,.]/gi,
  /\(\s*\)/g,
]

export interface SanitizeResult {
  text: string
  strippedEmoji: number
  strippedPlatforms: number
}

/** Strips emoji and third-party platform names. */
export function sanitizeOutput(input: string): SanitizeResult {
  if (!input) return { text: input, strippedEmoji: 0, strippedPlatforms: 0 }

  const strippedEmoji = (input.match(EMOJI) ?? []).length
  const strippedPlatforms = (input.match(PLATFORMS) ?? []).length
  if (strippedEmoji === 0 && strippedPlatforms === 0) {
    return { text: input, strippedEmoji: 0, strippedPlatforms: 0 }
  }

  let text = input.replace(EMOJI, '')
  // "market listings" rather than deletion: a sentence built around a source
  // becomes ungrammatical if the source simply vanishes.
  text = text.replace(PLATFORMS, 'market listings')
  for (const re of DANGLING_ATTRIBUTION) text = text.replace(re, '')

  text = text
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ +([,.;:])/g, '$1')
    .replace(/^[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')

  return { text, strippedEmoji, strippedPlatforms }
}

/** True when the text would survive sanitising unchanged. Used by tests. */
export function isClean(text: string): boolean {
  return !EMOJI.test(text) && !PLATFORMS.test(text)
}
