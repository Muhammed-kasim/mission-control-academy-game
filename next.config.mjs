import os from 'node:os'

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: (() => {
    const addresses = []
    for (const details of Object.values(os.networkInterfaces())) {
      for (const entry of details ?? []) {
        if (entry.family === 'IPv4' && !entry.internal) addresses.push(`http://${entry.address}:3000`)
      }
    }
    return addresses
  })(),
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          ...(process.env.NODE_ENV === 'production'
            ? [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }]
            : []),
        ],
      },
    ]
  },
}

export default nextConfig
