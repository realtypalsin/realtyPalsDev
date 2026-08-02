// Publication gate for human-curated intelligence.
//
// DecisionProfile and RecommendationProfile both default to status DRAFT and are
// only verified once an admin publishes them. Anything a buyer can see — the chat
// prompt, the discovery payload, the public project API — must therefore go
// through this gate. Admin routes deliberately do not.
//
// The gate also strips `status` itself: it is an internal workflow field and has
// no business reaching a buyer or the model's context.

const PUBLISHED = 'PUBLISHED'

/**
 * Return the profile only when it is published, with `status` removed.
 * A DRAFT profile becomes null so every downstream `?.field` read yields null and
 * the caller's existing "not yet verified" path runs unchanged.
 */
export function gatePublished<T extends Record<string, unknown>>(
  profile: (T & { status?: string | null }) | null | undefined
): Omit<T, 'status'> | null {
  if (!profile) return null
  // Absent status means the select did not ask for it. Fail closed rather than
  // silently publishing — a missing gate is exactly the bug this file exists for.
  if (profile.status !== PUBLISHED) return null
  const { status: _status, ...rest } = profile
  return rest as Omit<T, 'status'>
}
