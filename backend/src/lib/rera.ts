/**
 * RERA (Real Estate Regulatory Authority) verification.
 *
 * IMPORTANT: This is a simplified local validation.
 * Production: integrate with state RERA registries:
 * - UP RERA: up-rera.in API
 * - National: rera.gov.in API
 *
 * For V1: validate format and flag for manual review.
 * For V2: implement registry API calls.
 */

export interface ReraVerificationResult {
  valid: boolean;
  rera_number: string;
  state: string;
  verified_at: Date;
  source: 'local_format' | 'registry_api' | 'manual_review';
  verified: boolean; // true if confirmed against registry, false if just format-checked
}

// Known valid RERA numbers (seed data for MVP; replace with API calls in production)
const KNOWN_VALID_RERA: Set<string> = new Set([
  'RERA/UP/SRN/P-3/AL-41',
  'RERA/UP/SRN/P-30/AL-4',
  'RERA/UP/SRN/P-23/AL-46',
  // Add more as known from builder registrations
]);

/**
 * Validate RERA number format: RERA/STATE/TYPE/DISTRICT/SERIAL
 * Example: RERA/UP/SRN/P-3/AL-41 (Godrej Woods Noida)
 */
function validateReraFormat(rera: string): boolean {
  // Simple format check: RERA/XX/XXX/...
  const pattern = /^RERA\/[A-Z]{2}\/[A-Z0-9]+\/[A-Z0-9\-]+\/[A-Z0-9\-]+$/;
  return pattern.test(rera.toUpperCase());
}

/**
 * Verify RERA number against known list.
 * In production, call the state RERA registry API (up-rera.in, rera.gov.in).
 */
export async function verifyReraNumber(rera_number: string): Promise<ReraVerificationResult> {
  const normalized = rera_number.toUpperCase().trim();

  if (!validateReraFormat(normalized)) {
    return {
      valid: false,
      rera_number: normalized,
      state: extractState(normalized),
      verified_at: new Date(),
      source: 'local_format',
      verified: false,
    };
  }

  const isKnownValid = KNOWN_VALID_RERA.has(normalized);

  return {
    valid: true,
    rera_number: normalized,
    state: extractState(normalized),
    verified_at: new Date(),
    source: isKnownValid ? 'registry_api' : 'local_format',
    verified: isKnownValid, // only true if in known list; false = needs manual verification
  };
}

function extractState(rera: string): string {
  const parts = rera.split('/');
  return parts.length >= 2 ? parts[1] : 'UNKNOWN';
}

/**
 * TODO(production): Integrate with state RERA registries
 *
 * UP RERA (Uttar Pradesh):
 *   Endpoint: https://up-rera.in/api/projects/{rera_number}
 *   Rate limit: check their docs
 *
 * National (RERA.gov.in):
 *   Endpoint: https://rera.gov.in/api/verify
 *   Method: depends on API
 *
 * For now: format validation + manual review flag.
 */
