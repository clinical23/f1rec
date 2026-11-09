import type { Metadata } from 'next'

// Was head.tsx, which the app router ignores (every list page showed the site's default title).
export const metadata: Metadata = {
  title: 'F1 All-Time Leaderboards & Records',
  description: 'All-time Formula 1 leaderboards for drivers and constructors, plus historical records and milestones.',
  alternates: { canonical: '/leaderboards' },
  openGraph: { title: 'F1 All-Time Leaderboards & Records | F1Rec', description: 'All-time Formula 1 leaderboards for drivers and constructors, plus historical records and milestones.', url: '/leaderboards' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
