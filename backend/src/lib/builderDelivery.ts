// On-time delivery % for a builder, computed only from real promised-vs-actual
// delivery dates. Never shown below a minimum sample size — a builder with
// one delivered project doesn't get a "100% on-time" badge.

export interface DeliveryRecord {
  promised_date: Date
  actual_date: Date | null
}

const MIN_RECORDS_TO_SHOW = 3

export function computeOnTimeDeliveryPct(records: DeliveryRecord[]): number | null {
  const delivered = records.filter((r) => r.actual_date != null)
  if (delivered.length < MIN_RECORDS_TO_SHOW) return null

  const onTime = delivered.filter((r) => r.actual_date! <= r.promised_date).length
  return Math.round((onTime / delivered.length) * 100)
}
