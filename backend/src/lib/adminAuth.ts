import { createHash } from 'crypto'

function makeAdminToken(password: string): string {
  const secret = process.env.ADMIN_SECRET ?? 'fallback_secret'
  return createHash('sha256').update(password + secret).digest('hex')
}

export function validateAdminToken(token: string | undefined): boolean {
  if (!token) return false
  const expected = makeAdminToken(process.env.ADMIN_PASSWORD ?? '')
  return token === expected
}
