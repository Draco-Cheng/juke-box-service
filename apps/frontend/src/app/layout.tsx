import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import { Inter, Space_Mono } from 'next/font/google'
import { Providers } from '@/components/Providers'
import { OfflineBanner } from '@/components/OfflineBanner'
import { BottomNav } from '@/components/BottomNav'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-space-mono',
})

export const metadata: Metadata = {
  title: 'DropBeat - Request Songs from Live DJs',
  description: 'Request songs from live DJs. Your song, your moment.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'DropBeat',
  },
}

export const viewport: Viewport = {
  themeColor: '#0d0f14',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceMono.variable}`}>
      <head>
        <script src="/env-config.js" />
      </head>
      <body>
        <Providers>
          <OfflineBanner />
          {children}
          <Suspense><BottomNav /></Suspense>
        </Providers>
      </body>
    </html>
  )
}
