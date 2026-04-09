'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface Driver {
  id: string
  slug: string
  full_name: string
  first_name: string
  last_name: string
  code: string | null
  nationality: string | null
  career_wins: number
  career_podiums: number
  career_poles: number
  career_points: number
  career_starts: number
  career_fastest_laps: number
  championships: number
  is_active: boolean
  first_season: number | null
  last_season: number | null
}

type SortKey = 'full_name' | 'career_wins' | 'career_podiums' | 'career_poles' | 'career_points' | 'championships' | 'career_starts'
type SortDir = 'asc' | 'desc'

const STAT_LABELS: Record<SortKey, string> = {
  full_name: 'Name',
  career_wins: 'Wins',
  career_podiums: 'Podiums',
  career_poles: 'Poles',
  career_points: 'Points',
  championships: 'Titles',
  career_starts: 'Starts',
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [eraFilter, setEraFilter] = useState<string>('all')
  const [champOnly, setChampOnly] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('career_wins')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [visibleCount, setVisibleCount] = useState(60)

  useEffect(() => {
    async function fetchDrivers() {
      const { data, error } = await supabase
        .from('drivers')
        .select('id, slug, full_name, first_name, last_name, code, nationality, career_wins, career_podiums, career_poles, career_points, career_starts, career_fastest_laps, championships, is_active, first_season, last_season')
        .order('career_wins', { ascending: false })
      if (!error && data) setDrivers(data)
      setLoading(false)
    }
    fetchDrivers()
  }, [])

  const filtered = useMemo(() => {
    let result = drivers
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(d =>
        d.full_name.toLowerCase().includes(q) ||
        (d.code && d.code.toLowerCase().includes(q)) ||
        (d.nationality && d.nationality.toLowerCase().includes(q))
      )
    }
    if (eraFilter !== 'all') {
      const [start, end] = eraFilter.split('-').map(Number)
      result = result.filter(d => {
        if (!d.first_season) return false
        const lastSeason = d.last_season || 2025
        return lastSeason >= start && d.first_season <= end
      })
    }
    if (champOnly) result = result.filter(d => d.championships > 0)
    result = [...result].sort((a, b) => {
      let aVal: string | number = a[sortKey] ?? 0
      let bVal: string | number = b[sortKey] ?? 0
      if (sortKey === 'full_name') {
        aVal = (a.last_name || a.full_name).toLowerCase()
        bVal = (b.last_name || b.full_name).toLowerCase()
        return sortDir === 'asc' ? (aVal as string).localeCompare(bVal as string) : (bVal as string).localeCompare(aVal as string)
      }
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
    })
    return result
  }, [drivers, search, eraFilter, champOnly, sortKey, sortDir])

  const visible = filtered.slice(0, visibleCount)

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir(key === 'full_name' ? 'asc' : 'desc') }
  }

  const eras = [
    { label: 'All Eras', value: 'all' },
    { label: '2022-Now', value: '2022-2025' },
    { label: '2014-21', value: '2014-2021' },
    { label: '2006-13', value: '2006-2013' },
    { label: '1998-05', value: '1998-2005' },
    { label: '1980-97', value: '1980-1997' },
    { label: '1950-79', value: '1950-1979' },
  ]

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <section style={{ padding: '4rem 1.5rem 2rem', textAlign: 'center', borderBottom: '1px solid var(--border)', background: 'linear-gradient(180deg, rgba(232,0,45,0.06) 0%, transparent 100%)' }}>
        <p style={{ fontFamily: 'var(--font-barlow-condensed, "Barlow Condensed", sans-serif)', textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '0.75rem', color: 'var(--accent, #e8002d)', marginBottom: '0.5rem' }}>F1 Database</p>
        <h1 style={{ fontFamily: 'var(--font-barlow-condensed, "Barlow Condensed", sans-serif)', fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, textTransform: 'uppercase', margin: 0, lineHeight: 1.1 }}>
          Every Driver.<br /><span style={{ color: 'var(--accent, #e8002d)' }}>Every Season.</span>
        </h1>
        <p style={{ color: 'var(--muted, #889)', maxWidth: '500px', margin: '1rem auto 0', fontSize: '0.95rem' }}>
          {drivers.length > 0 ? `${drivers.length} drivers` : '...'} from 1950 to today. Search, filter, and explore every career.
        </p>
      </section>

      <section style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative', flex: '1 1 300px', minWidth: '200px' }}>
            <input type="text" placeholder="Search drivers..." value={search}
              onChange={e => { setSearch(e.target.value); setVisibleCount(60) }}
              style={{ width: '100%', padding: '0.7rem 1rem 0.7rem 2.5rem', background: 'var(--bg2, #111118)', border: '1px solid var(--border, #2a2a3a)', borderRadius: '8px', color: 'var(--text)', fontSize: '0.9rem', outline: 'none' }}
            />
            <svg style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" strokeWidth="2" /><path d="M21 21l-4.35-4.35" strokeWidth="2" strokeLinecap="round" /></svg>
          </div>
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {eras.map(era => (
              <button key={era.value} onClick={() => { setEraFilter(era.value); setVisibleCount(60) }}
                style={{ padding: '0.45rem 0.8rem', fontSize: '0.75rem', fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, border: '1px solid', borderColor: eraFilter === era.value ? 'var(--accent)' : 'var(--border)', background: eraFilter === era.value ? 'rgba(232,0,45,0.15)' : 'transparent', color: eraFilter === era.value ? 'var(--accent)' : 'var(--muted)', borderRadius: '4px', cursor: 'pointer' }}>
                {era.label}
              </button>
            ))}
          </div>
          <button onClick={() => { setChampOnly(c => !c); setVisibleCount(60) }}
            style={{ padding: '0.45rem 0.8rem', fontSize: '0.75rem', fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, border: '1px solid', borderColor: champOnly ? 'var(--gold, #f5c842)' : 'var(--border)', background: champOnly ? 'rgba(245,200,66,0.12)' : 'transparent', color: champOnly ? 'var(--gold, #f5c842)' : 'var(--muted)', borderRadius: '4px', cursor: 'pointer' }}>
            🏆 Champions
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <p style={{ color: 'var(--muted)', fontSize: '0.8rem', margin: 0 }}>
            {filtered.length} driver{filtered.length !== 1 ? 's' : ''}{search && ` matching "${search}"`}
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--muted)' }}>
            <div style={{ width: '24px', height: '24px', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
            Loading drivers...
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg2)' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 600, borderBottom: '1px solid var(--border)', width: '40px' }}>#</th>
                  {(['full_name', 'championships', 'career_wins', 'career_podiums', 'career_poles', 'career_points', 'career_starts'] as SortKey[]).map(key => (
                    <th key={key} onClick={() => toggleSort(key)}
                      style={{ padding: '0.75rem 0.75rem', textAlign: key === 'full_name' ? 'left' : 'right', fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem', color: sortKey === key ? 'var(--accent)' : 'var(--muted)', fontWeight: 600, cursor: 'pointer', borderBottom: '1px solid var(--border)', userSelect: 'none', whiteSpace: 'nowrap' }}>
                      {STAT_LABELS[key]}{sortKey === key && <span style={{ marginLeft: '0.3rem', fontSize: '0.6rem' }}>{sortDir === 'desc' ? '▼' : '▲'}</span>}
                    </th>
                  ))}
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Seasons</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((d, i) => (
                  <tr key={d.id} style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '0.6rem 1rem', color: 'var(--muted)', fontSize: '0.75rem', fontFamily: 'var(--font-jetbrains, monospace)' }}>{i + 1}</td>
                    <td style={{ padding: '0.6rem 0.75rem' }}>
                      <Link href={`/drivers/${d.slug}`} style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 600 }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text)')}>
                        {d.full_name}
                      </Link>
                      {d.nationality && <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--muted)', marginTop: '1px' }}>{d.nationality}</span>}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>
                      {d.championships > 0 ? <span style={{ color: 'var(--gold, #f5c842)', fontWeight: 700, fontFamily: 'var(--font-barlow-condensed)' }}>{d.championships}×🏆</span> : <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>—</span>}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)', fontWeight: d.career_wins > 0 ? 600 : 400, color: d.career_wins > 0 ? 'var(--text)' : 'var(--muted)' }}>{d.career_wins}</td>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)', color: d.career_podiums > 0 ? 'var(--text)' : 'var(--muted)' }}>{d.career_podiums}</td>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)', color: d.career_poles > 0 ? 'var(--text)' : 'var(--muted)' }}>{d.career_poles}</td>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)', color: 'var(--muted)' }}>{Number(d.career_points).toLocaleString()}</td>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)', color: 'var(--muted)' }}>{d.career_starts}</td>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--muted)' }}>
                      {d.first_season && d.last_season ? `${d.first_season}–${d.last_season}` : d.first_season || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {visibleCount < filtered.length && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <button onClick={() => setVisibleCount(c => c + 60)}
              style={{ padding: '0.7rem 2rem', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '6px', cursor: 'pointer', fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.8rem', fontWeight: 600 }}>
              Load More ({filtered.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </section>
    </main>
  )
}
