import nextEnv from '@next/env'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
// Nx runs from monorepo root, so process.cwd() != this directory.
// Explicitly load .env from the frontend app directory.
nextEnv.loadEnvConfig(dirname(fileURLToPath(import.meta.url)))

// next dev sets NODE_ENV *after* loading config, so also check process.argv
const isDev =
  process.env.NODE_ENV === 'development' ||
  process.argv.includes('dev')

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

// Skip Serwist in dev (conflicts with Turbopack) or when explicitly disabled
let finalConfig = nextConfig
if (!isDev && !process.env.DISABLE_PWA) {
  const withSerwistInit = (await import('@serwist/next')).default
  const withSerwist = withSerwistInit({
    swSrc: 'src/sw.ts',
    swDest: 'public/sw.js',
  })
  finalConfig = withSerwist(nextConfig)
}

export default finalConfig
