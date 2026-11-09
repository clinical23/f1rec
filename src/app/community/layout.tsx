import type { Metadata } from 'next'

// Was head.tsx, which the app router ignores (every list page showed the site's default title).
export const metadata: Metadata = {
  title: 'F1 & Sim Racing Community Hub',
  description: 'Discover the best F1 and sim racing creators, podcasts, social communities, and trending channels.',
  alternates: { canonical: '/community' },
  openGraph: { title: 'F1 & Sim Racing Community Hub | F1Rec', description: 'Discover the best F1 and sim racing creators, podcasts, social communities, and trending channels.', url: '/community' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
