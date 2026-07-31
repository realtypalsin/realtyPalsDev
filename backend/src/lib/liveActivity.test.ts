import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { applyActivityThresholds } from './liveActivity'

describe('applyActivityThresholds', () => {
  it('hides viewing_now below the minimum of 2', () => {
    assert.equal(applyActivityThresholds(0, 0, 0).viewing_now, null)
    assert.equal(applyActivityThresholds(1, 0, 0).viewing_now, null)
    assert.equal(applyActivityThresholds(2, 0, 0).viewing_now, 2)
  })

  it('hides visits_booked_last_hour when 0', () => {
    assert.equal(applyActivityThresholds(0, 0, 0).visits_booked_last_hour, null)
    assert.equal(applyActivityThresholds(0, 1, 0).visits_booked_last_hour, 1)
  })

  it('hides units_left when 0 or null, shows otherwise', () => {
    assert.equal(applyActivityThresholds(0, 0, 0).units_left, null)
    assert.equal(applyActivityThresholds(0, 0, null).units_left, null)
    assert.equal(applyActivityThresholds(0, 0, 5).units_left, 5)
  })
})
