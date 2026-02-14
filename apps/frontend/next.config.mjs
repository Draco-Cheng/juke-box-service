import nextEnv from '@next/env'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
// Nx runs from monorepo root, so process.cwd() != this directory.
// Explicitly load .env from the frontend app directory.
nextEnv.loadEnvConfig(dirname(fileURLToPath(import.meta.url)))

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: { unoptimized: true },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
    ]
  },
}

// Serwist's webpack plugin conflicts with Turbopack (next dev --turbopack).
// Only load it for production builds. Set DISABLE_PWA=1 to skip entirely.
let finalConfig = nextConfig
if (process.env.NODE_ENV === 'production' && !process.env.DISABLE_PWA) {
  const withSerwistInit = (await import('@serwist/next')).default
  const withSerwist = withSerwistInit({
    swSrc: 'src/sw.ts',
    swDest: 'public/sw.js',
  })
  finalConfig = withSerwist(nextConfig)
}

export default finalConfig
