import Link from 'next/link'

export default function NotFound() {
  return (
    <main style={{
      minHeight: 'calc(100vh - 48px)', background: 'var(--bg)', color: 'var(--text)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
      padding: '2rem',
    }}>
      <div>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(8rem, 20vw, 14rem)',
          fontWeight: 900, lineHeight: 0.85, color: 'var(--bg3, #1a1a24)',
          textTransform: 'uppercase', userSelect: 'none',
        }}>
          404
        </div>
        <h1 style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
          fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent, #e8002d)',
          marginTop: '-1rem', marginBottom: '1rem',
        }}>
          Page Not Found
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '1rem', marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem' }}>
          Looks like this page retired from the grid.
        </p>
        <Link href="/" style={{
          display: 'inline-block', padding: '0.75rem 2rem',
          background: 'var(--accent)', color: '#fff', textDecoration: 'none',
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '14px',
          textTransform: 'uppercase', letterSpacing: '1.5px', borderRadius: '4px',
        }}>
          Back to Pit Lane
        </Link>
      </div>
    </main>
  )
}
