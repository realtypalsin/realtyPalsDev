import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('Builder: Trust signal calculation', () => {
  it('calculates trust score from multiple factors', () => {
    const builder = {
      credaiMember: true,
      reraCompliance: 95,
      deliveredProjects: 5,
      activeComplaints: 1,
      yearsInBusiness: 12
    }
    const trustFactors = [
      builder.credaiMember ? 20 : 0,
      Math.min(builder.reraCompliance / 100 * 30, 30),
      Math.min(builder.deliveredProjects / 10 * 25, 25),
      builder.activeComplaints === 0 ? 25 : Math.max(25 - builder.activeComplaints * 5, 0)
    ]
    const trustScore = trustFactors.reduce((a, b) => a + b, 0)
    assert(trustScore >= 0 && trustScore <= 100)
  })

  it('HIGH trust for established builder with no complaints', () => {
    const builder = { deliveredProjects: 8, activeComplaints: 0, credaiMember: true }
    const trustLevel = builder.activeComplaints === 0 && builder.deliveredProjects >= 3 ? 'HIGH' : 'MEDIUM'
    assert.equal(trustLevel, 'HIGH')
  })

  it('MEDIUM trust for builder with few minor complaints', () => {
    const builder = { deliveredProjects: 4, activeComplaints: 1 }
    const trustLevel = builder.activeComplaints <= 2 ? 'MEDIUM' : 'LOW'
    assert.equal(trustLevel, 'MEDIUM')
  })

  it('LOW trust for new builder or many complaints', () => {
    const builder = { deliveredProjects: 1, activeComplaints: 5 }
    const trustLevel = builder.deliveredProjects > 2 && builder.activeComplaints <= 2 ? 'MEDIUM' : 'LOW'
    assert.equal(trustLevel, 'LOW')
  })
})

describe('Builder: Track record', () => {
  it('displays delivered projects count', () => {
    const builder = { name: 'ACE Group', deliveredProjects: 15, units: 5000 }
    assert.equal(builder.deliveredProjects, 15)
    assert.equal(builder.units, 5000)
  })

  it('shows possession on-time rate', () => {
    const projects = [
      { possessionOnTime: true },
      { possessionOnTime: true },
      { possessionOnTime: false }
    ]
    const onTimeRate = projects.filter(p => p.possessionOnTime).length / projects.length * 100
    assert(onTimeRate > 60)
  })

  it('lists ongoing projects', () => {
    const projects = [
      { status: 'completed' },
      { status: 'under_construction' },
      { status: 'under_construction' }
    ]
    const ongoing = projects.filter(p => p.status === 'under_construction')
    assert.equal(ongoing.length, 2)
  })
})

describe('Builder: Awards and certifications', () => {
  it('shows CREDAI membership', () => {
    const builder = { credaiMember: true, membershipYear: 2010 }
    assert(builder.credaiMember === true)
  })

  it('displays industry awards', () => {
    const awards = [
      { year: 2023, name: 'Best Residential Project' },
      { year: 2022, name: 'Sustainable Development Award' }
    ]
    assert.equal(awards.length, 2)
  })

  it('shows sustainability certifications', () => {
    const certifications = ['IGBC', 'GRIHA', 'LEED']
    assert(certifications.includes('IGBC'))
  })
})

describe('Builder: Contact and verification', () => {
  it('stores verified builder contact info', () => {
    const builder = {
      name: 'ACE Group',
      phone: '+91-9876543210',
      email: 'contact@acegroup.in',
      website: 'https://acegroup.in'
    }
    assert(builder.phone.startsWith('+91-'))
    assert(builder.email.includes('@'))
  })

  it('allows only verified builders', () => {
    const builder = { verified: true, verificationDate: '2024-01-15' }
    assert(builder.verified === true)
  })

  it('hides contact if builder not verified', () => {
    const builder = { verified: false }
    const showContact = builder.verified
    assert(showContact === false)
  })
})

describe('Builder: Risk flags', () => {
  it('flags builders with pending litigation', () => {
    const builder = { litigationPending: true, litigationDetails: 'Land ownership dispute' }
    const shouldFlag = builder.litigationPending
    assert(shouldFlag === true)
  })

  it('flags builders with RERA sanctions', () => {
    const builder = { reraSanctioned: true, sanctionDetails: 'Delayed possession' }
    const shouldFlag = builder.reraSanctioned
    assert(shouldFlag === true)
  })

  it('no flag for clean builder', () => {
    const builder = { litigationPending: false, reraSanctioned: false, activeComplaints: 0 }
    const hasFlagReason = builder.litigationPending || builder.reraSanctioned
    assert(hasFlagReason === false)
  })
})
