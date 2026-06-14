import { NextRequest } from 'next/server'
import { makeAdminToken, validateAdminToken } from '@/lib/adminToken'

export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({ password: '' }))
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword || password !== adminPassword) {
    return Response.json({ error: 'Invalid password' }, { status: 401 })
  }
  const token = await makeAdminToken(password)
  const isProduction = process.env.NODE_ENV === 'production'
  const res = Response.json({ ok: true })
  res.headers.set(
    'Set-Cookie',
    `admin_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${60 * 60 * 24 * 7}${isProduction ? '; Secure' : ''}`,
  )
  return res
}

export async function DELETE() {
  const isProduction = process.env.NODE_ENV === 'production'
  const res = Response.json({ ok: true })
  res.headers.set('Set-Cookie', `admin_token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${isProduction ? '; Secure' : ''}`)
  return res
}
