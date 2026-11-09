import type { Metadata } from 'next'

// Was head.tsx, which the app router ignores (every list page showed the site's default title).
export const metadata: Metadata = {
  title: '77 F1 Seasons — 1950 to 2026',
  description: 'Explore every Formula 1 season with champions, standings, and year-by-year records from 1950 to 2026.',
  alternates: { canonical: '/seasons' },
  openGraph: { title: '77 F1 Seasons — 1950 to 2026 | F1Rec', description: 'Explore every Formula 1 season with champions, standings, and year-by-year records from 1950 to 2026.', url: '/seasons' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
