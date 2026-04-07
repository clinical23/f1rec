import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'F1Rec — Formula 1 Statistics & Records',
    template: '%s | F1Rec',
  },
  description:
    'The most complete Formula 1 statistics database. Driver records, race results, season standings and head-to-head comparisons from 1950 to today.',
  keywords: ['Formula 1', 'F1 statistics', 'F1 records', 'F1 drivers', 'F1 results'],
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
      <body>{children}</body>
    </html>
  )
}