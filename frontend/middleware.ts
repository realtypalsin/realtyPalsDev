import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Request logging ─────────────────────────────────────────────────────
  const response = NextResponse.next()
  if (pathname.startsWith('/api/')) {
    console.log(`[mw] ${request.method} ${pathname} uid=${request.headers.get('x-user-id')?.slice(0, 8) ?? '-'}`)
  }

  return response
}

export const config = {
  matcher: ['/api/:path*'],
}
