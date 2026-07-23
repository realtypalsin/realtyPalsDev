import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { trimPropertyForPrompt, trimPropertiesForPrompt } from '../propertyTrim'

describe('PropertyTrim: payload reduction', () => {
  it('trims full property keeping required fields', () => {
    const fullProperty = {
      id: 'proj-123',
      name: 'ACE Hanei',
      price_range_label: '₹3.11–5.70 Cr',
      sector: { name: 'Sector 150', id: 'sec-150' },
      possession_status: 'under_construction',
      possession_label: 'Q4 2027',
      concerns: ['Long possession timeline'],
      bhk: 3,
      builder: { name: 'ACE Group', id: 'ace-1', founded: 2000 },
      // These should be dropped:
      images: ['img1.jpg', 'img2.jpg'],
      amenities: ['Gym', 'Pool', 'Park'],
      floorPlans: ['2d.pdf', '3d.pdf'],
      documents: ['rera.pdf'],
    }

    const trimmed = trimPropertyForPrompt(fullProperty)

    // Verify required fields present
    assert.equal(trimmed.id, 'proj-123')
    assert.equal(trimmed.name, 'ACE Hanei')
    assert.equal(trimmed.price_range_label, '₹3.11–5.70 Cr')
    assert.equal(trimmed.sector?.name, 'Sector 150')
    assert.equal(trimmed.possession_status, 'under_construction')
    assert.equal(trimmed.possession_label, 'Q4 2027')
    assert.deepEqual(trimmed.concerns, ['Long possession timeline'])
    assert.equal(trimmed.bhk, 3)
    assert.equal(trimmed.builder?.name, 'ACE Group')

    // Verify dropped fields are not in trimmed result
    assert(!('images' in trimmed))
    assert(!('amenities' in trimmed))
    assert(!('floorPlans' in trimmed))
    assert(!('documents' in trimmed))
  })

  it('handles missing optional fields gracefully', () => {
    const minimalProperty = {
      id: 'proj-456',
      name: 'Unknown Project',
      // All others missing
    }

    const trimmed = trimPropertyForPrompt(minimalProperty)

    assert.equal(trimmed.id, 'proj-456')
    assert.equal(trimmed.name, 'Unknown Project')
    assert.equal(trimmed.price_range_label, undefined)
    assert.equal(trimmed.sector, null)
    assert.equal(trimmed.possession_status, undefined)
    assert.equal(trimmed.concerns, undefined)
    assert.equal(trimmed.builder, null)
  })

  it('sector nesting preserved (only name kept)', () => {
    const property = {
      id: '1',
      name: 'Test',
      sector: { name: 'Sector 10', regionId: 'r1', coordinates: { lat: 28.5, lng: 77.3 } },
    }

    const trimmed = trimPropertyForPrompt(property)

    assert.deepEqual(trimmed.sector, { name: 'Sector 10' })
    assert(!('regionId' in (trimmed.sector || {})))
    assert(!('coordinates' in (trimmed.sector || {})))
  })

  it('builder nesting preserved (only name kept)', () => {
    const property = {
      id: '1',
      name: 'Test',
      builder: { name: 'Godrej', id: 'g1', founded: 1897, complaints: 42 },
    }

    const trimmed = trimPropertyForPrompt(property)

    assert.deepEqual(trimmed.builder, { name: 'Godrej' })
    assert(!('id' in (trimmed.builder || {})))
    assert(!('founded' in (trimmed.builder || {})))
    assert(!('complaints' in (trimmed.builder || {})))
  })

  it('batch trimming preserves order', () => {
    const properties = [
      { id: '1', name: 'Project A' },
      { id: '2', name: 'Project B' },
      { id: '3', name: 'Project C' },
    ]

    const trimmed = trimPropertiesForPrompt(properties)

    assert.equal(trimmed.length, 3)
    assert.equal(trimmed[0].name, 'Project A')
    assert.equal(trimmed[1].name, 'Project B')
    assert.equal(trimmed[2].name, 'Project C')
  })

  it('null sector/builder handled (no crash)', () => {
    const property = {
      id: '1',
      name: 'Test',
      sector: null,
      builder: null,
    }

    const trimmed = trimPropertyForPrompt(property)

    assert.equal(trimmed.sector, null)
    assert.equal(trimmed.builder, null)
  })

  it('empty concerns array preserved', () => {
    const property = {
      id: '1',
      name: 'Test',
      concerns: [],
    }

    const trimmed = trimPropertyForPrompt(property)

    assert.deepEqual(trimmed.concerns, [])
  })

  it('reduces payload size (no large nested objects)', () => {
    const fullProperty = {
      id: '1',
      name: 'Test',
      sector: { name: 'S1', extra: 'a'.repeat(1000) },
      builder: { name: 'B1', extra: 'b'.repeat(1000) },
      images: Array(100).fill({ url: 'x', thumb: 'y', size: 9999 }),
      amenities: Array(50).fill('Amenity'),
    }

    const trimmed = trimPropertyForPrompt(fullProperty)
    const trimmedJson = JSON.stringify(trimmed)
    const fullJson = JSON.stringify(fullProperty)

    assert(trimmedJson.length < fullJson.length, 'Trimmed should be smaller')
  })
})
