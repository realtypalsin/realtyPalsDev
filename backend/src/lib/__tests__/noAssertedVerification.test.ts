import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Repo-wide guard against claiming a verification we do not hold.
 *
 * The pattern kept reappearing in unrelated files, always as a fallback for a
 * field that was absent:
 *
 *   backend  builder with no rera_compliance_score        -> 'Verified'
 *   backend  builder with no construction_quality_score   -> 'A-Grade'
 *   backend  project with no rera_number                  -> 'Registered'
 *   frontend channel partner with no rera_registration    -> 'Verified RERA Agent'
 *   frontend channel partner with no type                 -> 'RERA Registered Partner'
 *   frontend builder award with no organisation           -> 'Verified Industry Recognition'
 *   frontend project page description, no builder         -> 'a verified builder'
 *
 * Every one asserts a regulatory or quality standing about a real third party,
 * on the exact question a buyer opened the page to check. This test fails if a
 * verification word is used as the right-hand side of a `||` or `??` fallback.
 */

const ROOT = join(__dirname, '../../../..')

const SCAN_DIRS = [
  'backend/src/routes',
  'backend/src/lib',
  'frontend/components',
  'frontend/app',
  'frontend/lib',
]

const SKIP = /node_modules|\.next|__tests__|\.test\.|\.spec\.|prisma[\\/]data|scripts/

/** Words that assert a standing rather than describe one. */
const CLAIM = /verified|rera[- ]?(registered|authorized|authorised|approved)|a[- ]grade|registered\b|certified|accredited|authorized partner|authorised partner/i

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return out
  }
  for (const name of entries) {
    const full = join(dir, name)
    if (SKIP.test(full)) continue
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.tsx?$/.test(name)) out.push(full)
  }
  return out
}

describe('no asserted verification in a fallback', () => {
  it('never uses a verification claim as the default for a missing field', () => {
    const offenders: string[] = []

    for (const dir of SCAN_DIRS) {
      for (const file of walk(join(ROOT, dir))) {
        const rel = file.slice(ROOT.length + 1).replace(/\\/g, '/')
        const lines = readFileSync(file, 'utf8').split(/\r?\n/)
        lines.forEach((line, i) => {
          if (line.trim().startsWith('//') || line.trim().startsWith('*')) return
          // `?? 'X'` or `|| 'X'` where X asserts a standing
          const match = line.match(/(?:\?\?|\|\|)\s*['"`]([^'"`]{4,60})['"`]/)
          if (!match) return
          const value = match[1]
          // Defaulting to the *absence* of a standing is the correct behaviour —
          // `verification_level ?? 'unverified'` is exactly what we want.
          if (/^(un|not[- ]|no[- ])/i.test(value)) return
          if (!CLAIM.test(value)) return
          offenders.push(`${rel}:${i + 1}  → "${value}"`)
        })
      }
    }

    assert.deepEqual(
      offenders,
      [],
      'A verification claim is being used as a fallback for a field we do not hold:\n' +
        offenders.join('\n') +
        '\n\nUse null and omit the line. Never assert RERA registration, a grade, ' +
        'or "verified" status about a third party we have no record for.',
    )
  })
})
