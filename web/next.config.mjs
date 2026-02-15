import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,

  images: {
    unoptimized: true,
  },
  // Security headers
  async headers() {
    const isDev = process.env.NODE_ENV === 'development'
    // In dev, allow connections to local Azure Functions; in prod, only allow Azure endpoints
    const connectSrc = isDev
      ? "connect-src 'self' http://localhost:7071 https://login.microsoftonline.com https://*.microsoftonline.com https://*.microsoft.com https://*.azurewebsites.net;"
      : "connect-src 'self' https://login.microsoftonline.com https://*.microsoftonline.com https://*.microsoft.com https://*.azurewebsites.net;"
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; frame-src 'self' data: blob:; worker-src 'self' blob:; ${connectSrc}`,
          },
        ],
      },
    ]
  },
  // For Azure App Service integration with Azure Functions API
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.API_URL
          ? `${process.env.API_URL}/api/:path*`
          : 'http://localhost:7071/api/:path*',
      },
    ]
  },
}

export default withNextIntl(nextConfig)
