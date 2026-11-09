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
  // Serve the favicon as image/x-icon (Vercel's default for .ico is image/vnd.microsoft.icon, which some tools,
  // the Vercel dashboard among them, don't show).
  async headers() {
    return [{ source: '/favicon.ico', headers: [{ key: 'Content-Type', value: 'image/x-icon' }] }]
  },
}

export default nextConfig