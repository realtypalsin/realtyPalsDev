import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const requestHeaders = new Headers(request.headers)
  
  // Strip x-user-id to prevent spoofing
  requestHeaders.delete('x-user-id')

  // Derive access token from the Supabase auth cookie
  const supabaseToken = request.cookies.get('sb-eargxntetfmtdpwedjbd-auth-token')?.value
  if (supabaseToken) {
    try {
      const parsed = JSON.parse(supabaseToken)
      const accessToken: string | undefined = Array.isArray(parsed) ? parsed[0] : parsed?.access_token
      if (accessToken) {
        requestHeaders.set('Authorization', `Bearer ${accessToken}`)
      }
    } catch {
      // Ignore parse errors, the backend will just see no Authorization header
    }
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  if (pathname.startsWith('/api/')) {
    const hasAuth = requestHeaders.has('Authorization')
    console.log(`[mw] ${request.method} ${pathname} auth=${hasAuth ? 'yes' : 'no'}`)
  }

  return response
}

export const config = {
  matcher: ['/api/:path*'],
}

