import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'mezipswmplrcdbinwjwy.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  poweredByHeader: false,
  async redirects() {
    return [
      // Retired sections (Sunday Grid relaunch, Nov 2026).
      { source: '/blog', destination: '/', permanent: true },
      { source: '/blog/:path*', destination: '/', permanent: true },
      { source: '/memes', destination: '/', permanent: true },
      { source: '/memes/:path*', destination: '/', permanent: true },
      { source: '/paddock', destination: '/', permanent: true },
      { source: '/sim-racing', destination: '/sim', permanent: true },
      { source: '/sim-racing/:path*', destination: '/sim', permanent: true },
      // 2026 calendar rows replaced by the catch-up job's own.
      { source: '/races/2026-las-vegas-grand-prix', destination: '/races/2026-las-vegas-grand-prix-vegas', permanent: true },
      { source: '/races/2026-emilia-romagna-grand-prix', destination: '/seasons/2026', permanent: false },
    ]
  },
}

export default nextConfig