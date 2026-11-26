import type { Metadata } from 'next'
import Script from 'next/script'
import { GoogleAnalytics } from '@next/third-parties/google'
import './globals.css'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import Ticker from '@/components/Ticker'
import JsonLd from '@/components/JsonLd'
import CookieConsent from '@/components/CookieConsent'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://f1rec.com'),
  title: {
    default: 'Sunday Grid: F1 results, stats and records since 1950',
    template: '%s | Sunday Grid',
  },
  description:
    'The most complete Formula 1 statistics database. Driver records, race results, season standings and head-to-head comparisons from 1950 to today.',
  keywords: ['Formula 1', 'F1 statistics', 'F1 records', 'F1 drivers', 'F1 results'],
  openGraph: {
    type: 'website',
    siteName: 'Sunday Grid',
    url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://f1rec.com',
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
    <html lang="en-GB" suppressHydrationWarning>
      <head>
        {/* Applies the saved Night/Day theme before the first paint. */}
        <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('f1rec-theme');if(['day','timing','tower','ghost'].indexOf(t)>-1)document.documentElement.dataset.theme=t;var a=localStorage.getItem('f1rec-accent');if(['yellow','purple','orange','blue','green'].indexOf(a)>-1)document.documentElement.dataset.accent=a}catch(e){}" }} />
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5181795059219175"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body>
        <Script
          id="consent-defaults"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('consent', 'default', {
        'analytics_storage': 'denied',
        'ad_storage': 'denied',
        'ad_user_data': 'denied',
        'ad_personalization': 'denied',
      });
    `,
          }}
        />
          <Ticker />
          <Nav />
          {children}
          <Footer />
        <CookieConsent />
        <JsonLd data={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'Sunday Grid',
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
