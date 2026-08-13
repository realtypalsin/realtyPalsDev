import { renderChipIcon, stripEmojis, EMOJI_REGEX } from '@/lib/chipIconUtils'

describe('chipIconUtils', () => {
  describe('stripEmojis', () => {
    it('removes emoji from text', () => {
      expect(stripEmojis('What is the exact location? 📍')).toBe('What is the exact location?')
      expect(stripEmojis('💰 Budget options')).toBe('Budget options')
    })

    it('handles text without emoji', () => {
      expect(stripEmojis('No emojis here')).toBe('No emojis here')
    })

    it('trims whitespace after removing emojis', () => {
      expect(stripEmojis('Text 🎯  ')).toBe('Text')
    })
  })

  describe('EMOJI_REGEX', () => {
    it('matches emoji patterns', () => {
      expect('💰'.match(EMOJI_REGEX)).toBeTruthy()
      expect('🎯'.match(EMOJI_REGEX)).toBeTruthy()
      expect('📍'.match(EMOJI_REGEX)).toBeTruthy()
    })

    it('does not match regular text', () => {
      expect('abc'.match(EMOJI_REGEX)).toBeFalsy()
      expect('123'.match(EMOJI_REGEX)).toBeFalsy()
    })
  })

  describe('renderChipIcon', () => {
    it('matches cost-related keywords', () => {
      // Icon rendering is component-based, verify it doesn't throw
      expect(() => renderChipIcon('What is the cost?', false)).not.toThrow()
      expect(() => renderChipIcon('Budget under 2 crore', false)).not.toThrow()
    })

    it('matches location keywords', () => {
      expect(() => renderChipIcon('Sector 150', false)).not.toThrow()
      expect(() => renderChipIcon('Near metro', false)).not.toThrow()
    })

    it('returns icon for any label (fallback)', () => {
      expect(() => renderChipIcon('Random text', false)).not.toThrow()
      expect(() => renderChipIcon('', true)).not.toThrow()
    })
  })
})
