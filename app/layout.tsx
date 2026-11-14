import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Mission Control Academy | Space Mission Design Game',
  description: 'Design a NASA-inspired space mission through four Concept Maturity Levels. Compare alternatives, balance science, cost, and risk, then verify and launch.',
  applicationName: 'Mission Control Academy',
  generator: 'v0.app',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/mission-control-icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/mission-control-icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/mission-control-apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#080d14',
  width: 'device-width',
  initialScale: 1,
  userScalable: true,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className="dark"><body className="antialiased">{children}{process.env.NODE_ENV === 'production' && <Analytics />}</body></html>
}
