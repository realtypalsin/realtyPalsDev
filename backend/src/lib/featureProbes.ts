/**
 * Named amenities a buyer commonly asks about by name.
 *
 * One table serves two jobs that used to be written out separately and could
 * drift apart:
 *   `pattern` — does the buyer's message ask about this feature?
 *   `matches` — does a stored amenity row satisfy it?
 *   `label`   — how to name it back when we cannot confirm it either way.
 *
 * Previously the two regex sets lived in one long if-chain and a *second*,
 * shorter chain produced a fabricated "**Yes**, … Olympic-Size Swimming Pool"
 * whenever the first found nothing — so the fallback fired exactly when the
 * database disagreed.
 */
export interface FeatureProbe {
  /** Matched against the buyer's message. */
  pattern: RegExp
  /** Matched against a stored amenity name. */
  matches: RegExp
  /** Buyer-facing name, used in the honest "not confirmed" reply. */
  label: string
}

export const FEATURE_PROBES: FeatureProbe[] = [
  { pattern: /snooker|billiard/i,              matches: /snooker|billiard/i,              label: 'a snooker or billiards room' },
  { pattern: /table tennis|\btt\b/i,           matches: /table tennis|\btt\b/i,           label: 'table tennis' },
  { pattern: /badminton/i,                     matches: /badminton/i,                     label: 'a badminton court' },
  { pattern: /squash/i,                        matches: /squash/i,                        label: 'a squash court' },
  { pattern: /cricket/i,                       matches: /cricket/i,                       label: 'cricket facilities' },
  { pattern: /tennis/i,                        matches: /tennis/i,                        label: 'a tennis court' },
  { pattern: /pool|swimming/i,                 matches: /pool|swimming/i,                 label: 'a swimming pool' },
  { pattern: /gym|fitness/i,                   matches: /gym|fitness/i,                   label: 'a gym' },
  { pattern: /clubhouse|club/i,                matches: /club/i,                          label: 'a clubhouse' },
  { pattern: /\bev\b|electric vehicle/i,       matches: /\bev\b|electric vehicle/i,       label: 'EV charging' },
  { pattern: /theatre|screening|movie/i,       matches: /theatre|screening|cinema/i,      label: 'a screening room' },
  { pattern: /library|coworking|study/i,       matches: /library|reading|co-?working/i,   label: 'a library or co-working space' },
  { pattern: /banquet|party/i,                 matches: /banquet|party/i,                 label: 'a banquet or party hall' },
  { pattern: /sauna|steam|spa|jacuzzi/i,       matches: /sauna|steam|spa|jacuzzi/i,       label: 'spa facilities' },
  { pattern: /creche|daycare/i,                matches: /creche|daycare/i,                label: 'a creche or daycare' },
  { pattern: /\bpet\b|pets/i,                  matches: /\bpet\b|pets/i,                  label: 'pet facilities' },
  { pattern: /play|kid/i,                      matches: /play|kid|adventure/i,            label: "a children's play area" },
  { pattern: /jogging|cycling|track/i,         matches: /jogging|cycling|track/i,         label: 'a jogging or cycling track' },
]
