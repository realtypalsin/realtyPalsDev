const { withSentryConfig } = require('@sentry/nextjs')

/** @type {import('next').NextConfig} */
const nextConfig = {
<<<<<<< HEAD
  experimental: { instrumentationHook: true },
=======
  experimental: {
    instrumentationHook: true,
    optimizePackageImports: ['lucide-react', '@phosphor-icons/react'],
    serverComponentsExternalPackages: ['@sentry/nextjs', '@sentry/node', '@apm-js-collab/tracing-hooks'],
  },
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
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
<<<<<<< HEAD
=======
      {
        protocol: 'https',
        hostname: 'storage.realtypals.com',
      },
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
    ],
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
        ],
      },
    ]
  },
}

module.exports = withSentryConfig(nextConfig, {
  org: 'realtypals',
  project: 'realtypals-sentry',
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
})
