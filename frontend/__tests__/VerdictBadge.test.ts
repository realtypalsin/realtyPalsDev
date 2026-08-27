import { parseSingleProjectHeader } from '@/lib/responseParser'

/**
 * A verdict must come from the advisor, never from a default.
 *
 * The badge used to be keyed on a coloured emoji the model was asked to prefix
 * the header with, read as `headerLine[0]`, and defaulted to CONSIDER when that
 * character was anything else. The verdict word was already present in bold, so
 * the pictograph added nothing — but the styling depended on it.
 *
 * That made the whole feature one prompt change away from lying. The editorial
 * no-emoji rule would have stopped the glyph arriving, every header would have
 * fallen through to CONSIDER, and every project in a response would have shown
 * a verdict the advisor never gave.
 */

describe('single project verdict header', () => {
  it('reads the verdict from the bold text, with no emoji present', () => {
    const { label, name } = parseSingleProjectHeader('**STRONG BUY** **Ace Divino**')
    expect(label).toBe('STRONG BUY')
    expect(name).toBe('Ace Divino')
  })

  it('still reads a header that carries a legacy emoji prefix', () => {
    // Cached responses and stored transcripts predate the rule.
    const { label, name } = parseSingleProjectHeader('🔵 **STRONG BUY** **Ace Divino**')
    expect(label).toBe('STRONG BUY')
    expect(name).toBe('Ace Divino')
  })

  it.each(['STRONG BUY', 'BUY', 'CONSIDER', 'WATCH', 'AVOID'])(
    'recognises %s',
    verdict => {
      expect(parseSingleProjectHeader(`**${verdict}** **Project X**`).label).toBe(verdict)
    },
  )

  it('does not invent a verdict when the header carries none', () => {
    // The regression this file exists for: the old parser returned CONSIDER
    // here, and the renderer showed an amber CONSIDER chip.
    const { label, name } = parseSingleProjectHeader('**Ace Divino**')
    expect(label).toBe('')
    expect(name).toBe('Ace Divino')
  })

  it('does not invent a verdict for an unrecognised word', () => {
    expect(parseSingleProjectHeader('**MAYBE** **Ace Divino**').label).toBe('')
  })

  it('survives an empty header without throwing', () => {
    expect(parseSingleProjectHeader('')).toEqual({ label: '', name: '' })
  })

  it('is case-insensitive about the verdict', () => {
    expect(parseSingleProjectHeader('**Strong Buy** **Ace Divino**').label).toBe('STRONG BUY')
  })
})
