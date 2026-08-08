import { describe, it, expect } from 'vitest'
import { detectDatabaseIntent } from '../intentTypeDetector'

describe('Intent Type Detector', () => {
  it('should detect payment plans intent', () => {
    const tests = [
      'What are the payment plans?',
      'How much EMI will I pay?',
      'Tell me about construction linked payment',
      'What are the installment options?'
    ]
    tests.forEach(msg => {
      expect(detectDatabaseIntent(msg)).toBe('PAYMENT_PLANS')
    })
  })

  it('should detect costs intent', () => {
    const tests = [
      'What is the total price?',
      'How much does it cost?',
      'Tell me about stamp duty',
      'What about GST and registration?',
      'Calculate the total expense'
    ]
    tests.forEach(msg => {
      expect(detectDatabaseIntent(msg)).toBe('COSTS')
    })
  })

  it('should detect builder history intent', () => {
    const tests = [
      'What is the builder track record?',
      'How many projects have they delivered?',
      'Have there been any delays?',
      'Tell me about builder complaints',
      'RERA information about this builder'
    ]
    tests.forEach(msg => {
      expect(detectDatabaseIntent(msg)).toBe('BUILDER_HISTORY')
    })
  })

  it('should detect location intent', () => {
    const tests = [
      'Where is this located?',
      'How far from metro?',
      'What amenities are nearby?',
      'Tell me about commute times',
      'Area connectivity and infrastructure'
    ]
    tests.forEach(msg => {
      expect(detectDatabaseIntent(msg)).toBe('LOCATION')
    })
  })

  it('should detect possession timeline intent', () => {
    const tests = [
      'When can I move in?',
      'What is the possession date?',
      'When will OC be obtained?',
      'Expected delivery timeline',
      'When is it expected to be ready?'
    ]
    tests.forEach(msg => {
      expect(detectDatabaseIntent(msg)).toBe('POSSESSION_TIMELINE')
    })
  })

  it('should default to GENERAL for unmatched queries', () => {
    const tests = [
      'Tell me about this project',
      'Show me more details',
      'Anything else?'
    ]
    tests.forEach(msg => {
      expect(detectDatabaseIntent(msg)).toBe('GENERAL')
    })
  })
})
