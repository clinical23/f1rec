import type { Metadata } from 'next'

// Was head.tsx, which the app router ignores (every list page showed the site's default title).
export const metadata: Metadata = {
  title: '206 F1 Constructors — Complete Database',
  description: 'Complete Formula 1 constructor database with team championships, race wins, and historical records.',
  alternates: { canonical: '/teams' },
  openGraph: { title: '206 F1 Constructors — Complete Database | F1Rec', description: 'Complete Formula 1 constructor database with team championships, race wins, and historical records.', url: '/teams' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
