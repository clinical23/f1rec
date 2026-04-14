'use client'

import Link from 'next/link'

const exploreLinks = [
  { label: 'Drivers', href: '/drivers' },
  { label: 'Teams', href: '/teams' },
  { label: 'Races', href: '/races' },
  { label: 'Calendar', href: '/calendar' },
  { label: 'Seasons', href: '/seasons' },
  { label: 'Compare', href: '/compare' },
  { label: 'Leaderboards', href: '/leaderboards' },
]

const moreLinks = [
  { label: 'Live', href: '/live' },
  { label: 'Paddock', href: '/paddock' },
  { label: 'Sim Racing', href: '/sim-racing' },
  { label: 'Sim Resources', href: '/sim-racing/resources' },
  { label: 'Random Stats', href: '/random' },
  { label: 'Community', href: '/community' },
  { label: 'Blog', href: '/blog' },
  { label: 'Privacy Policy', href: '/privacy' },
]

export default function Footer() {
  return (
    <footer style={{ background: 'var(--bg2)', borderTop: '1px solid var(--border)', padding: '48px 24px 24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '40px', marginBottom: '32px' }}>
        {/* Brand */}
        <div>
          <Link href="/" style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '24px',
            color: 'var(--text)', textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '1px',
          }}>
            F1<span style={{ color: 'var(--accent)' }}>Rec</span>
          </Link>
          <p style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: 1.6, marginTop: '12px', maxWidth: '280px' }}>
            The most complete Formula 1 statistics platform.
          </p>
        </div>

        {/* Explore */}
        <div>
          <h4 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text)', marginBottom: '16px' }}>Explore</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {exploreLinks.map(link => (
              <Link key={link.href} href={link.href} style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '13px', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* More */}
        <div>
          <h4 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text)', marginBottom: '16px' }}>More</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {moreLinks.map(link => (
              <Link key={link.href} href={link.href} style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '13px', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h4 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text)', marginBottom: '16px' }}>Follow us</h4>
          <p style={{ color: 'var(--muted)', fontSize: '13px' }}>@F1RecStats on X/Twitter coming soon</p>
        </div>
      </div>

      {/* Divider + copyright */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', textAlign: 'center' }}>
        <p style={{ color: 'var(--muted)', fontSize: '12px' }}>
          &copy; 2026 F1Rec. Not affiliated with Formula 1.
        </p>
      </div>
    </footer>
  )
}
