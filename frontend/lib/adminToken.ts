// Web Crypto API — works in both Edge Runtime and Node.js (no Node built-in crypto needed)

if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_SECRET) { throw new Error('ADMIN_SECRET env var required in production') }

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function makeAdminToken(password: string): Promise<string> {
  const secret = process.env.ADMIN_SECRET ?? 'fallback_secret'
  return sha256Hex(password + secret)
}

export async function validateAdminToken(token: string | undefined): Promise<boolean> {
  if (!token) return false
  const expected = await makeAdminToken(process.env.ADMIN_PASSWORD ?? '')
  return token === expected
}
