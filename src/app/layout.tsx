import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

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

const navLinks = [
  { label: 'Drivers', href: '/drivers' },
  { label: 'Teams', href: '/teams' },
  { label: 'Races', href: '/races' },
  { label: 'Seasons', href: '/seasons' },
  { label: 'Compare', href: '/compare' },
  { label: 'Leaderboards', href: '/leaderboards' },
  { label: 'Sim Racing', href: '/sim-racing' },
]

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <nav style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          height: '48px',
          background: 'rgba(10,10,15,0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border)',
        }}>
          <Link href="/" style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: '18px',
            color: 'var(--text)',
            textDecoration: 'none',
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}>
            F1<span style={{ color: 'var(--accent)' }}>Rec</span>
          </Link>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: '12px',
                  color: link.href === '/sim-racing' ? 'var(--accent)' : 'var(--muted)',
                  textDecoration: 'none',
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px',
                  transition: 'color 0.2s',
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
        {children}
      </body>
    </html>
  )
}
