'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface RaceResult {
  season_year: number
  round: number
  race_name: string
  race_slug: string
  driver_name: string
}

export default function RacesPage() {
  const [races, setRaces] = useState<RaceResult[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState('')

  useEffect(() => {
    document.title = 'All F1 Races — Grand Prix Results by Season | F1Rec'
  }, [])

  useEffect(() => {
    async function fetchRaces() {
      const { data, error } = await supabase
        .from('results')
        .select('season_year, round, race_name, race_slug, driver_name')
        .eq('position', 1)
        .eq('is_sprint', false)
        .order('season_year', { ascending: false })
        .order('round', { ascending: false })
      if (!error && data) {
        const seen = new Set<string>()
        const deduped: RaceResult[] = []
        for (const row of data) {
          const key = `${row.season_year}-${row.round}`
          if (!seen.has(key)) {
            seen.add(key)
            deduped.push(row)
          }
        }
        setRaces(deduped)
        if (deduped.length > 0) {
          setExpandedYears(new Set([deduped[0].season_year]))
        }
      }
      setLoading(false)
    }
    fetchRaces()
  }, [])

  const filtered = useMemo(() => {
    if (!search) return races
    const q = search.toLowerCase()
    return races.filter(r =>
      r.race_name.toLowerCase().includes(q) ||
      r.driver_name.toLowerCase().includes(q) ||
      String(r.season_year).includes(q)
    )
  }, [races, search])

  const grouped = useMemo(() => {
    const map = new Map<number, RaceResult[]>()
    for (const r of filtered) {
      const arr = map.get(r.season_year)
      if (arr) arr.push(r)
      else map.set(r.season_year, [r])
    }
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0])
  }, [filtered])

  function toggleYear(year: number) {
    setExpandedYears(prev => {
      const next = new Set(prev)
      if (next.has(year)) next.delete(year)
      else next.add(year)
      return next
    })
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <section style={{ padding: '5rem 1.5rem 3rem', textAlign: 'center', borderBottom: '1px solid var(--border)', background: 'linear-gradient(180deg, rgba(232,0,45,0.06) 0%, transparent 100%)' }}>
        <p style={{ fontFamily: 'var(--font-barlow-condensed, "Barlow Condensed", sans-serif)', textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '0.75rem', color: 'var(--accent, #e8002d)', marginBottom: '0.5rem' }}>F1 Database</p>
        <h1 className="hero-title" style={{ fontFamily: 'var(--font-barlow-condensed, "Barlow Condensed", sans-serif)', fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, margin: 0, lineHeight: 1.1 }}>
          Every Race.<br /><span style={{ color: 'var(--accent, #e8002d)' }}>Every Winner.</span>
        </h1>
        <p style={{ color: 'var(--muted, #889)', maxWidth: '500px', margin: '1rem auto 0', fontSize: '0.95rem' }}>
          {races.length > 0 ? `${races.length} grands prix` : '...'} from 1950 to today. Every race result at a glance.
        </p>
      </section>

      <section style={{ maxWidth: '1400px', margin: '0 auto', padding: '4rem 1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative', flex: '1 1 300px', minWidth: '200px' }}>
            <input type="text" placeholder="Search races, winners, or years..." value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '0.7rem 1rem 0.7rem 2.5rem', background: 'var(--bg2, #111118)', border: '1px solid var(--border, #2a2a3a)', borderRadius: '8px', color: 'var(--text)', fontSize: '0.9rem', outline: 'none' }}
            />
            <svg style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" strokeWidth="2" /><path d="M21 21l-4.35-4.35" strokeWidth="2" strokeLinecap="round" /></svg>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--muted)' }}>
            <div style={{ width: '24px', height: '24px', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
            Loading races...
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {grouped.map(([year, yearRaces]) => {
              const expanded = expandedYears.has(year)
              return (
                <div key={year} style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                  <button onClick={() => toggleYear(year)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', background: 'var(--bg2)', border: 'none', cursor: 'pointer', color: 'var(--text)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: '1.5rem', fontWeight: 800, color: expanded ? 'var(--accent)' : 'var(--text)' }}>{year}</span>
                      <span style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', fontWeight: 600 }}>{yearRaces.length} race{yearRaces.length !== 1 ? 's' : ''}</span>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--muted)', transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
                  </button>
                  {expanded && (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ background: 'var(--bg)' }}>
                            <th style={{ padding: '0.6rem 1rem', textAlign: 'center', fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 600, borderBottom: '1px solid var(--border)', width: '60px' }}>Round</th>
                            <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left', fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Race</th>
                            <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left', fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Winner</th>
                          </tr>
                        </thead>
                        <tbody>
                          {yearRaces.sort((a, b) => a.round - b.round).map(race => (
                            <tr key={`${race.season_year}-${race.round}`} style={{ borderBottom: '1px solid var(--border)' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                              <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontFamily: 'var(--font-jetbrains, monospace)', fontSize: '0.75rem', color: 'var(--muted)' }}>R{race.round}</td>
                              <td style={{ padding: '0.75rem 0.75rem' }}>
                                <Link href={`/races/${race.race_slug}`} style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 600 }}
                                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text)')}>
                                  {race.race_name}
                                </Link>
                              </td>
                              <td style={{ padding: '0.75rem 0.75rem', color: 'var(--text)', fontWeight: 500 }}>
                                <span style={{ color: 'var(--gold, #f5c842)', marginRight: '0.4rem', fontSize: '0.8rem' }}>P1</span>
                                {race.driver_name}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
