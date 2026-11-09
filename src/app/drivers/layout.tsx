import type { Metadata } from 'next'

// Was head.tsx, which the app router ignores (every list page showed the site's default title).
export const metadata: Metadata = {
  title: '818 F1 Drivers — Complete Database',
  description: 'Complete Formula 1 driver database with career stats, wins, podiums, poles, points, and season records.',
  alternates: { canonical: '/drivers' },
  openGraph: { title: '818 F1 Drivers — Complete Database | F1Rec', description: 'Complete Formula 1 driver database with career stats, wins, podiums, poles, points, and season records.', url: '/drivers' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
