'use client'

import Link from 'next/link'

export interface Season {
  id: string
  year: number
  slug: string
  rounds: number | null
  champion_driver_id: string | null
  champion_team_id: string | null
  champion_driver_name: string | null
  champion_team_name: string | null
}

// Data comes from the server (page.tsx), so the list is in the HTML for readers and search engines.
export default function SeasonsClient({ initialSeasons }: { initialSeasons: Season[] }) {
  const seasons = initialSeasons
  const loading = false

  const decades = (() => {
    const map = new Map<number, Season[]>()
    for (const s of seasons) {
      const decade = Math.floor(s.year / 10) * 10
      const arr = map.get(decade)
      if (arr) arr.push(s)
      else map.set(decade, [s])
    }
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0])
  })()

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <section style={{ padding: '4rem 1.5rem 2rem', textAlign: 'center', borderBottom: '1px solid var(--border)', background: 'linear-gradient(180deg, rgba(232,0,45,0.06) 0%, transparent 100%)' }}>
        <p style={{ fontFamily: 'var(--font-barlow-condensed, "Barlow Condensed", sans-serif)', textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '0.75rem', color: 'var(--accent, #e8002d)', marginBottom: '0.5rem' }}>F1 Database</p>
        <h1 className="hero-title" style={{ fontFamily: 'var(--font-barlow-condensed, "Barlow Condensed", sans-serif)', fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, margin: 0, lineHeight: 1.1 }}>
          Every Season.<br /><span style={{ color: 'var(--accent, #e8002d)' }}>Every Champion.</span>
        </h1>
        <p style={{ color: 'var(--muted, #889)', maxWidth: '500px', margin: '1rem auto 0', fontSize: '0.95rem' }}>
          {seasons.length > 0 ? `${seasons.length} seasons` : '...'} of Formula 1 World Championship history.
        </p>
      </section>

      <section style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--muted)' }}>
            <div style={{ width: '24px', height: '24px', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
            Loading seasons...
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {decades.map(([decade, decadeSeasons]) => (
              <div key={decade}>
                <h2 style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                  {decade}s
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
                  {decadeSeasons.map(s => (
                    <Link key={s.id} href={`/seasons/${s.slug}`}
                      style={{ textDecoration: 'none', color: 'inherit', display: 'block', padding: '1.25rem', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', transition: 'border-color 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <span style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: '2rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{s.year}</span>
                        {s.rounds && (
                          <span style={{ fontFamily: 'var(--font-jetbrains, monospace)', fontSize: '0.7rem', color: 'var(--muted)', padding: '0.2rem 0.5rem', background: 'var(--bg)', borderRadius: '4px', border: '1px solid var(--border)' }}>
                            {s.rounds} rounds
                          </span>
                        )}
                      </div>
                      {s.champion_driver_name ? (
                        <div style={{ marginBottom: '0.35rem' }}>
                          <span style={{ color: 'var(--gold, #f5c842)', fontSize: '0.75rem', marginRight: '0.4rem' }}>🏆</span>
                          <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.9rem' }}>{s.champion_driver_name}</span>
                        </div>
                      ) : (
                        <div style={{ marginBottom: '0.35rem', fontSize: '0.85rem', color: 'var(--muted)', fontStyle: 'italic' }}>
                          {s.year >= new Date().getFullYear() ? 'Season in progress' : 'Champion data unavailable'}
                        </div>
                      )}
                      {s.champion_team_name && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{s.champion_team_name}</div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
