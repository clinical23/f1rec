import type { Metadata } from 'next'

// Was head.tsx, which the app router ignores (every list page showed the site's default title).
export const metadata: Metadata = {
  title: 'F1 Race Results 1950–2026',
  description: 'Browse Formula 1 race winners and results from every season, from 1950 to 2026.',
  alternates: { canonical: '/races' },
  openGraph: { title: 'F1 Race Results 1950–2026 | F1Rec', description: 'Browse Formula 1 race winners and results from every season, from 1950 to 2026.', url: '/races' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
