import type { NextConfig } from 'next'
import { withPayload } from '@payloadcms/next/withPayload'

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://mc.yandex.ru",
  "img-src 'self' data: blob: https://mc.yandex.ru",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  'frame-src https://yandex.ru',
  "connect-src 'self' https://mc.yandex.ru wss://mc.yandex.ru",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const nextConfig: NextConfig = {
  output: 'standalone',
  images: { localPatterns: [{ pathname: '/api/**' }, { pathname: '/**' }] },
  async headers() {
    return [
      {
        // админка Payload исключена: ей нужны inline-скрипты и свои заголовки
        source: '/((?!admin).*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

export default withPayload(nextConfig)
