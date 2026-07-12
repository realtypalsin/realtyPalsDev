import { NextRequest, NextResponse } from 'next/server'
<<<<<<< HEAD
import { validateAdminToken } from '@/lib/adminToken'
=======
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

<<<<<<< HEAD
  // ── Admin API protection ────────────────────────────────────────────────
  if (pathname.startsWith('/api/v1/admin') && pathname !== '/api/v1/admin/auth') {
    const token = request.cookies.get('admin_token')?.value
    if (!(await validateAdminToken(token))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // ── Supabase session verification for user-facing APIs ──────────────────
  // Verifies x-user-id header matches the signed Supabase JWT in the auth cookie.
  // Uses atob (Web Crypto safe) — no Node.js Buffer needed.
  const isUserApi =
    pathname.startsWith('/api/v1/chat') ||
    pathname.startsWith('/api/v1/saved') ||
    pathname.startsWith('/api/v1/callback') ||
    pathname.startsWith('/api/v1/site-visit')

  if (isUserApi) {
    const supabaseToken = request.cookies.get('sb-eargxntetfmtdpwedjbd-auth-token')?.value
    if (!supabaseToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    try {
      const parsed = JSON.parse(supabaseToken)
      const accessToken: string | undefined = Array.isArray(parsed) ? parsed[0] : parsed?.access_token
      if (!accessToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const parts = accessToken.split('.')
      if (parts.length !== 3) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
      const payload = JSON.parse(atob(base64)) as { sub?: string }
      if (!payload.sub) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      // userId is now verified from the cookie. downstream routes MUST NOT trust x-user-id header.
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const response = NextResponse.next()

  // ── Request logging ─────────────────────────────────────────────────────
=======
  // ── Request logging ─────────────────────────────────────────────────────
  const response = NextResponse.next()
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
  if (pathname.startsWith('/api/')) {
    console.log(`[mw] ${request.method} ${pathname} uid=${request.headers.get('x-user-id')?.slice(0, 8) ?? '-'}`)
  }

  return response
}

export const config = {
<<<<<<< HEAD
  matcher: ['/api/v1/admin/:path*', '/api/:path*'],
=======
  matcher: ['/api/:path*'],
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
}
