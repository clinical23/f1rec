import type { Metadata } from 'next'
import { GoogleAnalytics } from '@next/third-parties/google'
import './globals.css'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { SoundProvider } from '@/components/SoundProvider'
import JsonLd from '@/components/JsonLd'

export const metadata: Metadata = {
  title: {
    default: 'F1Rec — Formula 1 Statistics & Records',
    template: '%s | F1Rec',
  },
  description:
    'The most complete Formula 1 statistics database. Driver records, race results, season standings and head-to-head comparisons from 1950 to today.',
  keywords: ['Formula 1', 'F1 statistics', 'F1 records', 'F1 drivers', 'F1 results', 'sim racing'],
  openGraph: {
    type: 'website',
    siteName: 'F1Rec',
    url: process.env.NEXT_PUBLIC_SITE_URL,
  },
  twitter: {
    card: 'summary_large_image',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <SoundProvider>
          <Nav />
          {children}
          <Footer />
        </SoundProvider>
        <JsonLd data={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'F1Rec',
          description: 'The most complete Formula 1 statistics platform. Every stat. Every race. Every era.',
          url: 'https://f1rec.com',
          potentialAction: {
            '@type': 'SearchAction',
            target: {
              '@type': 'EntryPoint',
              urlTemplate: 'https://f1rec.com/drivers?q={search_term_string}',
            },
            'query-input': 'required name=search_term_string',
          },
        }} />
        <GoogleAnalytics gaId="G-6DN8XV2PBS" />
      </body>
    </html>
  )
}
