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

export default nextConfig
