import Link from 'next/link'

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: 'calc(100vh - 48px)',
        background: 'var(--bg)',
        color: 'var(--text)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '2rem 1.25rem',
      }}
    >
      <div style={{ maxWidth: '760px' }}>
        <h1
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 'clamp(4rem, 14vw, 8.5rem)',
            fontWeight: 900,
            lineHeight: 0.9,
            letterSpacing: '0.02em',
            color: 'var(--text)',
            margin: '0 0 0.85rem',
          }}
        >
          BWOAH.
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '1.08rem', margin: '0 0 1rem' }}>
          This page doesn&apos;t exist. Like Kimi&apos;s interest in media days.
        </p>
        <p style={{ color: 'var(--muted)', fontSize: '0.95rem', margin: '0 0 2rem' }}>
          Error 404 — The page you&apos;re looking for has retired, just like Kimi in Monaco 2006.
        </p>

        <Link
          href="/"
          style={{
            display: 'inline-block',
            padding: '0.85rem 2.2rem',
            background: 'var(--accent)',
            color: '#fff',
            textDecoration: 'none',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 800,
            fontSize: '0.92rem',
            textTransform: 'uppercase',
            letterSpacing: '0.11em',
            borderRadius: '4px',
          }}
        >
          Back to the Grid →
        </Link>

        <p style={{ color: 'var(--muted)', fontSize: '0.78rem', marginTop: '1.8rem', lineHeight: 1.5 }}>
          Kimi Raikkonen famously left the Monaco Grand Prix to go on his yacht. This page has done the same.
        </p>
      </div>
    </main>
  )
}
