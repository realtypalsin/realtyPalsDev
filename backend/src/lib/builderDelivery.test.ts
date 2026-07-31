import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { computeOnTimeDeliveryPct } from './builderDelivery'

describe('computeOnTimeDeliveryPct', () => {
  it('returns null when there are no delivered records', () => {
    assert.equal(computeOnTimeDeliveryPct([]), null)
  })

  it('returns null when fewer than 3 records exist (not enough basis)', () => {
    const records = [
      { promised_date: new Date('2020-01-01'), actual_date: new Date('2020-01-01') },
      { promised_date: new Date('2021-01-01'), actual_date: new Date('2021-01-01') },
    ]
    assert.equal(computeOnTimeDeliveryPct(records), null)
  })

  it('computes the on-time percentage from actual vs promised dates', () => {
    const records = [
      { promised_date: new Date('2020-01-01'), actual_date: new Date('2020-01-01') }, // on time
      { promised_date: new Date('2021-01-01'), actual_date: new Date('2020-12-15') }, // early = on time
      { promised_date: new Date('2022-01-01'), actual_date: new Date('2022-06-01') }, // late
      { promised_date: new Date('2023-01-01'), actual_date: null },                   // still undelivered, excluded
    ]
    assert.equal(computeOnTimeDeliveryPct(records), 67) // 2 of 3 delivered records were on time
  })
})
