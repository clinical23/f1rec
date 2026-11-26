import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sunday Grid',
    short_name: 'Sunday Grid',
    description: 'This weekend’s F1 race in UK time, every result since 1950, and Sim Race Week.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0E0D14',
    theme_color: '#0E0D14',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
