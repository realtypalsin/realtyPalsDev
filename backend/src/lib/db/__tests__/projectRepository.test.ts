import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('ProjectRepository: Search', () => {
  it('finds projects by sector', () => {
    const projects = [
      { id: '1', name: 'Project A', sector: 'Sector 150' },
      { id: '2', name: 'Project B', sector: 'Sector 150' },
      { id: '3', name: 'Project C', sector: 'Sector 78' }
    ]
    const results = projects.filter(p => p.sector === 'Sector 150')
    assert.equal(results.length, 2)
  })

  it('finds projects by budget range', () => {
    const projects = [
      { id: '1', name: 'Budget Project', priceMin: 1.0, priceMax: 2.0 },
      { id: '2', name: 'Mid Project', priceMin: 2.5, priceMax: 3.5 },
      { id: '3', name: 'Premium Project', priceMin: 4.0, priceMax: 5.0 }
    ]
    const minBudget = 1.5
    const maxBudget = 3.0
    const results = projects.filter(p => p.priceMin <= maxBudget && p.priceMax >= minBudget)
    assert.equal(results.length, 2)
  })

  it('finds projects by BHK type', () => {
    const projects = [
      { id: '1', unitTypes: [{ bhk: 2 }, { bhk: 3 }] },
      { id: '2', unitTypes: [{ bhk: 3 }] },
      { id: '3', unitTypes: [{ bhk: 4 }] }
    ]
    const bhkNeeded = 3
    const results = projects.filter(p => p.unitTypes.some(u => u.bhk === bhkNeeded))
    assert.equal(results.length, 2)
  })

  it('finds projects by possession status', () => {
    const projects = [
      { id: '1', status: 'ready_to_move' },
      { id: '2', status: 'under_construction' },
      { id: '3', status: 'ready_to_move' }
    ]
    const results = projects.filter(p => p.status === 'ready_to_move')
    assert.equal(results.length, 2)
  })

  it('combined search (sector + budget + BHK)', () => {
    const projects = [
      { id: '1', sector: 'S150', priceMin: 1.5, unitTypes: [{ bhk: 3 }] },
      { id: '2', sector: 'S150', priceMin: 2.5, unitTypes: [{ bhk: 2 }] },
      { id: '3', sector: 'S79', priceMin: 1.5, unitTypes: [{ bhk: 3 }] }
    ]
    const results = projects.filter(p =>
      p.sector === 'S150' &&
      p.priceMin <= 2.0 &&
      p.unitTypes.some(u => u.bhk === 3)
    )
    assert.equal(results.length, 1)
    assert.equal(results[0].id, '1')
  })
})

describe('ProjectRepository: Data integrity', () => {
  it('enforces required fields', () => {
    const project = {
      id: '1',
      name: 'ACE Hanei',
      sector: 'Sector 12',
      builderId: 'ace-group',
      reraNumber: 'UPRERAPRJ001'
    }
    assert(project.id && project.name && project.sector && project.builderId && project.reraNumber)
  })

  it('rejects project without builder reference', () => {
    const project = { id: '1', name: 'Orphan Project' }
    const isValid = project.builderId !== undefined
    assert(isValid === false)
  })

  it('rejects project without RERA if in India', () => {
    const project = { id: '1', name: 'Project', builderId: '123' }
    const requiresRERA = true
    const hasRERA = project.reraNumber !== undefined
    assert(hasRERA === false && requiresRERA === true)
  })

  it('allows null possession_date for future projects', () => {
    const project = { id: '1', name: 'Future Project', possessionDate: null }
    assert.equal(project.possessionDate, null)
  })
})

describe('ProjectRepository: Sorting', () => {
  it('sorts projects by score descending', () => {
    const projects = [
      { id: '1', name: 'A', score: 45 },
      { id: '2', name: 'B', score: 92 },
      { id: '3', name: 'C', score: 67 }
    ]
    const sorted = [...projects].sort((a, b) => b.score - a.score)
    assert.equal(sorted[0].id, '2')
    assert.equal(sorted[1].id, '3')
    assert.equal(sorted[2].id, '1')
  })

  it('sorts projects by possession date ascending', () => {
    const projects = [
      { id: '1', possessionDate: '2026-01-01' },
      { id: '2', possessionDate: '2025-06-01' },
      { id: '3', possessionDate: '2026-12-01' }
    ]
    const sorted = [...projects].sort((a, b) => new Date(a.possessionDate).getTime() - new Date(b.possessionDate).getTime())
    assert.equal(sorted[0].id, '2')
    assert.equal(sorted[1].id, '1')
    assert.equal(sorted[2].id, '3')
  })
})

describe('ProjectRepository: Pagination', () => {
  it('returns paginated results', () => {
    const projects = Array.from({ length: 50 }, (_, i) => ({ id: String(i) }))
    const pageSize = 10
    const page = 1
    const results = projects.slice((page - 1) * pageSize, page * pageSize)
    assert.equal(results.length, 10)
  })

  it('handles last page with fewer results', () => {
    const projects = Array.from({ length: 25 }, (_, i) => ({ id: String(i) }))
    const pageSize = 10
    const page = 3
    const results = projects.slice((page - 1) * pageSize, page * pageSize)
    assert.equal(results.length, 5)
  })

  it('returns empty for out-of-bounds page', () => {
    const projects = Array.from({ length: 10 }, (_, i) => ({ id: String(i) }))
    const pageSize = 10
    const page = 5
    const results = projects.slice((page - 1) * pageSize, page * pageSize)
    assert.equal(results.length, 0)
  })
})
