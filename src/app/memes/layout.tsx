import type { Metadata } from 'next'

// Was head.tsx, which the app router ignores (every list page showed the site's default title).
export const metadata: Metadata = {
  title: 'F1 Memes — Tier Lists, Icebergs & More',
  description: 'Formula 1 meme gallery with tier lists, icebergs, starter packs, alignment charts, and sim racing humour.',
  alternates: { canonical: '/memes' },
  openGraph: { title: 'F1 Memes — Tier Lists, Icebergs & More | F1Rec', description: 'Formula 1 meme gallery with tier lists, icebergs, starter packs, alignment charts, and sim racing humour.', url: '/memes' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
