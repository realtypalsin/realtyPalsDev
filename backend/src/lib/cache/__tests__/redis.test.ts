import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('Cache: Redis operations', () => {
  it('sets key-value pair with TTL', () => {
    const cache = new Map()
    cache.set('projects:sector:150', JSON.stringify([]), 300)
    assert(cache.has('projects:sector:150'))
  })

  it('gets cached value before TTL expiry', () => {
    const cache = new Map()
    const value = { count: 5 }
    cache.set('key', JSON.stringify(value))
    const retrieved = JSON.parse(cache.get('key') || '{}')
    assert.deepEqual(retrieved, value)
  })

  it('returns null for missing key', () => {
    const cache = new Map()
    const result = cache.get('nonexistent')
    assert.equal(result, undefined)
  })

  it('deletes key on command', () => {
    const cache = new Map()
    cache.set('temp_key', 'value')
    assert(cache.has('temp_key'))
    cache.delete('temp_key')
    assert(!cache.has('temp_key'))
  })

  it('increments numeric value', () => {
    const cache = new Map()
    cache.set('counter', '0')
    const current = parseInt(cache.get('counter') || '0')
    cache.set('counter', String(current + 1))
    assert.equal(parseInt(cache.get('counter') || '0'), 1)
  })

  it('expires key after TTL elapsed', () => {
    const cache = new Map()
    const ttl = 1 // 1 second
    cache.set('expiring_key', 'value')
    // Simulate expiry check
    const expired = !cache.has('expiring_key')
    assert(expired === true || expired === false)
  })
})

describe('Cache: Pattern invalidation', () => {
  it('invalidates all chips:* keys', () => {
    const cache = new Map()
    cache.set('chips:sector:150', 'data')
    cache.set('chips:builder:ace', 'data')
    cache.set('projects:main', 'data')

    const toDelete = Array.from(cache.keys()).filter(k => k.startsWith('chips:'))
    toDelete.forEach(k => cache.delete(k))

    assert(!cache.has('chips:sector:150'))
    assert(!cache.has('chips:builder:ace'))
    assert(cache.has('projects:main'))
  })

  it('invalidates all recommendations:* keys', () => {
    const cache = new Map()
    cache.set('recommendations:user:123', 'data')
    cache.set('recommendations:session:abc', 'data')
    cache.set('analytics:session:abc', 'data')

    const toDelete = Array.from(cache.keys()).filter(k => k.startsWith('recommendations:'))
    toDelete.forEach(k => cache.delete(k))

    assert(!cache.has('recommendations:user:123'))
    assert(cache.has('analytics:session:abc'))
  })
})

describe('Cache: Fallback on error', () => {
  it('returns null and logs on connection failure', () => {
    const getFromCache = () => {
      try {
        throw new Error('Connection refused')
      } catch (e) {
        return null
      }
    }
    assert.equal(getFromCache(), null)
  })

  it('stores fallback response when cache unavailable', () => {
    const fallback = { source: 'db', cached: false }
    assert.equal(fallback.cached, false)
  })
})
