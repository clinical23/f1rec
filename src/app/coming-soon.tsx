import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'F1Rec — Coming Soon',
  description: 'Leave me alone, I know what I am doing. F1Rec is preparing launch.',
}

export default function ComingSoonPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #0a0a0f 0%, #111118 50%, #0a0a0f 100%)',
        position: 'relative',
        overflow: 'hidden',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(232, 0, 45, 0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <h1
        style={{
          fontFamily: 'var(--font-barlow-condensed), sans-serif',
          fontSize: 'clamp(4rem, 11vw, 8rem)',
          fontWeight: 800,
          lineHeight: 1,
          marginBottom: '2rem',
        }}
      >
        <span style={{ color: '#e8e8f0' }}>F1</span>
        <span style={{ color: '#e8002d' }}>REC</span>
      </h1>

      <blockquote
        style={{
          fontFamily: 'var(--font-barlow-condensed), sans-serif',
          fontSize: 'clamp(1.5rem, 4vw, 3rem)',
          fontWeight: 600,
          color: '#e8e8f0',
          fontStyle: 'italic',
          maxWidth: '700px',
          lineHeight: 1.3,
          marginBottom: '1rem',
        }}
      >
        "Leave me alone, I know what I am doing."
      </blockquote>

      <p
        style={{
          fontFamily: 'var(--font-barlow), sans-serif',
          fontSize: '0.9rem',
          color: '#8888aa',
          marginBottom: '3rem',
        }}
      >
        — Kimi Raikkonen, Abu Dhabi 2012
      </p>

      <div
        style={{
          fontFamily: 'var(--font-barlow-condensed), sans-serif',
          fontSize: 'clamp(1rem, 2.5vw, 1.4rem)',
          fontWeight: 600,
          color: '#f5c842',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          marginBottom: '1.5rem',
        }}
      >
        Lights out soon
      </div>

      <p
        style={{
          fontFamily: 'var(--font-barlow), sans-serif',
          fontSize: '1.1rem',
          color: 'rgba(232, 232, 240, 0.7)',
          maxWidth: '500px',
          lineHeight: 1.6,
          marginBottom: '3rem',
        }}
      >
        Every stat. Every race. Every era.
        <br />
        77 seasons of Formula 1 data, sim racing hardware, and real-time race insights.
      </p>

      <div
        style={{
          display: 'flex',
          gap: '3rem',
          marginBottom: '3rem',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        {[
          { num: '818', label: 'Drivers' },
          { num: '25,883', label: 'Results' },
          { num: '77', label: 'Seasons' },
        ].map(({ num, label }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div
              style={{
                fontFamily: 'var(--font-jetbrains-mono), monospace',
                fontSize: '2rem',
                fontWeight: 700,
                color: '#e8e8f0',
              }}
            >
              {num}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-barlow-condensed), sans-serif',
                fontSize: '0.75rem',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#8888aa',
              }}
            >
              {label}
            </div>
          </div>
        ))}
      </div>

      <a
        href="https://x.com/F1RecStats"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontFamily: 'var(--font-barlow), sans-serif',
          fontSize: '1rem',
          color: '#e8002d',
          textDecoration: 'none',
          borderBottom: '1px solid rgba(232, 0, 45, 0.3)',
          paddingBottom: '2px',
          transition: 'border-color 0.2s',
        }}
      >
        Follow @F1RecStats for updates
      </a>

      <div
        style={{
          position: 'absolute',
          bottom: '2rem',
          fontFamily: 'var(--font-barlow), sans-serif',
          fontSize: '0.8rem',
          color: '#555',
        }}
      >
        © 2026 F1Rec. Not affiliated with Formula 1.
      </div>
    </div>
  )
}
