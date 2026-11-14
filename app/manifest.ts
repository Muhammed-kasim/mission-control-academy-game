import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Mission Control Academy',
    short_name: 'Mission Control',
    description: 'Design, launch, and operate a space science mission.',
    start_url: '/',
    display: 'standalone',
    background_color: '#080d14',
    theme_color: '#080d14',
    icons: [
      { src: '/mission-control-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/mission-control-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/mission-control-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
