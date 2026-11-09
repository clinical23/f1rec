import type { Metadata } from 'next'

// Was head.tsx, which the app router ignores (every list page showed the site's default title).
export const metadata: Metadata = {
  title: 'F1 Driver Comparison Tool',
  description: 'Compare any two Formula 1 drivers head-to-head across wins, podiums, poles, points, and career performance.',
  alternates: { canonical: '/compare' },
  openGraph: { title: 'F1 Driver Comparison Tool | F1Rec', description: 'Compare any two Formula 1 drivers head-to-head across wins, podiums, poles, points, and career performance.', url: '/compare' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
