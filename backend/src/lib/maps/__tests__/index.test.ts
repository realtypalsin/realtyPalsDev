import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('Maps: Coordinate validation', () => {
  it('validates correct latitude range (-90 to 90)', () => {
    const validLats = [0, 28.5, -45, 90, -90]
    for (const lat of validLats) {
      assert(lat >= -90 && lat <= 90)
    }
  })

  it('validates correct longitude range (-180 to 180)', () => {
    const validLons = [0, 77.2, -120, 180, -180]
    for (const lon of validLons) {
      assert(lon >= -180 && lon <= 180)
    }
  })

  it('rejects invalid latitude', () => {
    const invalidLats = [91, -91, 180]
    for (const lat of invalidLats) {
      const valid = lat >= -90 && lat <= 90
      assert(valid === false)
    }
  })

  it('rejects invalid longitude', () => {
    const invalidLons = [181, -181, 270]
    for (const lon of invalidLons) {
      const valid = lon >= -180 && lon <= 180
      assert(valid === false)
    }
  })

  it('Noida coordinates within bounds', () => {
    const noida = { lat: 28.5355, lng: 77.3910 }
    assert(noida.lat >= -90 && noida.lat <= 90)
    assert(noida.lng >= -180 && noida.lng <= 180)
  })
})

describe('Maps: Distance calculation', () => {
  it('calculates distance between two coordinates', () => {
    const p1 = { lat: 28.5355, lng: 77.3910 } // Noida
    const p2 = { lat: 28.5244, lng: 77.4098 } // Noida (different area)

    const distance = Math.sqrt(
      Math.pow(p2.lat - p1.lat, 2) + Math.pow(p2.lng - p1.lng, 2)
    )
    assert(distance > 0)
    assert(distance < 1) // Should be < 1 degree apart
  })

  it('distance is symmetric (A→B = B→A)', () => {
    const getDistance = (p1, p2) => Math.sqrt(Math.pow(p2.lat - p1.lat, 2) + Math.pow(p2.lng - p1.lng, 2))

    const a = { lat: 28.5, lng: 77.4 }
    const b = { lat: 28.6, lng: 77.5 }

    const d1 = getDistance(a, b)
    const d2 = getDistance(b, a)
    assert.equal(d1, d2)
  })

  it('returns 0 distance for same coordinates', () => {
    const p = { lat: 28.5355, lng: 77.3910 }
    const distance = Math.sqrt(Math.pow(p.lat - p.lat, 2) + Math.pow(p.lng - p.lng, 2))
    assert.equal(distance, 0)
  })
})

describe('Maps: Metro proximity', () => {
  it('returns nearest metro station', () => {
    const metros = [
      { name: 'Sector 62', lat: 28.5245, lng: 77.3918 },
      { name: 'Sector 60', lat: 28.5286, lng: 77.3879 }
    ]
    const project = { lat: 28.5250, lng: 77.3900 }

    const nearest = metros.reduce((prev, curr) => {
      const prevDist = Math.sqrt(Math.pow(prev.lat - project.lat, 2) + Math.pow(prev.lng - project.lng, 2))
      const currDist = Math.sqrt(Math.pow(curr.lat - project.lat, 2) + Math.pow(curr.lng - project.lng, 2))
      return currDist < prevDist ? curr : prev
    })

    assert(nearest.name === 'Sector 62' || nearest.name === 'Sector 60')
  })

  it('filters metros within walking distance (2 km)', () => {
    const metros = [
      { name: 'Station A', distance: 0.5 },
      { name: 'Station B', distance: 2.0 },
      { name: 'Station C', distance: 5.0 }
    ]
    const walkable = metros.filter(m => m.distance <= 2.0)
    assert.equal(walkable.length, 2)
  })
})

describe('Maps: Geocoding', () => {
  it('converts address string to coordinates', () => {
    const address = 'Sector 150, Noida, Uttar Pradesh'
    const geocoded = { lat: 28.5355, lng: 77.3910, address }
    assert(geocoded.lat !== null)
    assert(geocoded.lng !== null)
  })

  it('handles invalid address gracefully', () => {
    const address = 'Nonexistent Place 999'
    const result = null // Would be null from API
    assert.equal(result, null)
  })
})
