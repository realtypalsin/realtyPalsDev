const { withSentryConfig } = require('@sentry/nextjs')

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true,
    optimizePackageImports: ['lucide-react', '@phosphor-icons/react'],
    serverComponentsExternalPackages: ['@sentry/nextjs', '@sentry/node', '@apm-js-collab/tracing-hooks'],
  },
  transpilePackages: ['leaflet', 'react-leaflet'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'maps.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'unpkg.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.in',
      },
      {
        protocol: 'https',
        hostname: 'storage.realtypals.com',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://realtypalsdev.onrender.com'}/api/:path*`
      },
    ]
  },
  async redirects() {
    return [
      {
        source: '/discovery',
        destination: '/discover',
        permanent: true,
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options',  value: 'nosniff' },
          { key: 'X-Frame-Options',          value: 'DENY' },
          { key: 'X-XSS-Protection',         value: '1; mode=block' },
          { key: 'Referrer-Policy',          value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',       value: 'camera=(), microphone=(self), geolocation=(self)' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: (() => {
              const isDev = process.env.NODE_ENV !== 'production'
              const connectSrc = isDev
                ? "'self' http://localhost:* wss://localhost:* https: ws: wss:"
                : "'self' https://realtypalsdev.onrender.com wss: https: ws:"
              return `default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.google-analytics.com https://maps.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src ${connectSrc}; frame-ancestors 'none';`
            })(),
          },
        ],
      },
    ]
  },
}

const isDev = process.env.NODE_ENV !== 'production'

module.exports = isDev ? nextConfig : withSentryConfig(nextConfig, {
  org: 'realtypals',
  project: 'realtypals-sentry',
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
})
