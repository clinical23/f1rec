'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Driver {
  id: string
  slug: string
  full_name: string
  code: string | null
  nationality: string | null
  career_wins: number
  career_podiums: number
  career_poles: number
  career_points: number
  career_starts: number
  championships: number
  is_active: boolean
  first_season: number | null
  last_season: number | null
}

type SortKey = 'full_name' | 'career_wins' | 'career_podiums' | 'career_poles' | 'career_points' | 'championships' | 'career_starts'
type SortDir = 'asc' | 'desc'
type FilterKey = 'all' | 'champions' | 'active'

export default function DriversClient({ initialDrivers }: { initialDrivers: Driver[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [sortKey, setSortKey] = useState<SortKey>('career_wins')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let rows = initialDrivers
    if (filter === 'champions') rows = rows.filter((d) => d.championships > 0)
    if (filter === 'active') rows = rows.filter((d) => d.is_active)
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter((d) => d.full_name.toLowerCase().includes(q) || (d.code ?? '').toLowerCase().includes(q))
    }
    return [...rows].sort((a, b) => {
      if (sortKey === 'full_name') {
        return sortDir === 'asc' ? a.full_name.localeCompare(b.full_name) : b.full_name.localeCompare(a.full_name)
      }
      const av = Number(a[sortKey] ?? 0)
      const bv = Number(b[sortKey] ?? 0)
      return sortDir === 'asc' ? av - bv : bv - av
    })
  }, [filter, initialDrivers, search, sortDir, sortKey])

  const maxima = useMemo(() => {
    const maxOf = (pick: (driver: Driver) => number) => filtered.reduce((max, driver) => Math.max(max, pick(driver)), 0)
    return {
      wins: maxOf((d) => d.career_wins ?? 0),
      podiums: maxOf((d) => d.career_podiums ?? 0),
      poles: maxOf((d) => d.career_poles ?? 0),
      points: maxOf((d) => d.career_points ?? 0),
      titles: maxOf((d) => d.championships ?? 0),
    }
  }, [filtered])

  const pillStyle = (active: boolean) => ({
    border: active ? '1px solid transparent' : '1px solid var(--border)',
    background: active ? 'var(--accent)' : 'var(--bg2)',
    color: '#fff',
    padding: '8px 16px',
    borderRadius: '999px',
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    cursor: 'pointer',
  })

  const rankColor = (rank: number) => {
    if (rank === 1) return 'var(--gold)'
    if (rank === 2) return '#c0c8d8'
    if (rank === 3) return '#cd7f32'
    return 'var(--muted)'
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px 64px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: '44px',
              fontWeight: 900,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: '#fff',
              margin: 0,
            }}
          >
            Drivers
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '16px', marginTop: '6px' }}>
            {initialDrivers.length.toLocaleString()} drivers across 77 seasons of Formula 1
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <input
            type="text"
            placeholder="Search drivers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: '1 1 360px',
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '12px 16px',
              color: 'var(--text)',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: '15px',
              outlineColor: 'var(--accent)',
            }}
          />
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => setFilter('all')} style={pillStyle(filter === 'all')}>
              All Drivers
            </button>
            <button type="button" onClick={() => setFilter('champions')} style={pillStyle(filter === 'champions')}>
              Champions Only
            </button>
            <button type="button" onClick={() => setFilter('active')} style={pillStyle(filter === 'active')}>
              Active
            </button>
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            overflow: 'hidden',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              padding: '10px 16px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg3)',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: '12px',
              fontWeight: 800,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#fff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>All Drivers</span>
            <span style={{ color: 'var(--muted)', fontSize: '11px' }}>{filtered.length.toLocaleString()} drivers</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1080px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['#', 'Driver', 'Team', 'Wins', 'Podiums', 'Poles', 'Points', 'Titles'].map((label) => (
                    <th
                      key={label}
                      style={{
                        textAlign: label === 'Driver' || label === 'Team' ? 'left' : 'right',
                        padding: '12px 16px',
                        color: 'var(--muted)',
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontSize: '11px',
                        fontWeight: 800,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((driver, index) => (
                  <tr
                    key={driver.id}
                    onClick={() => router.push(`/drivers/${driver.slug}`)}
                    onMouseEnter={() => setHoveredId(driver.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      background: hoveredId === driver.id ? 'rgba(255,255,255,0.03)' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          minWidth: '28px',
                          padding: '4px 8px',
                          borderRadius: '999px',
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: rankColor(index + 1),
                          background: 'rgba(255,255,255,0.02)',
                        }}
                      >
                        {index + 1}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '999px',
                            background: 'linear-gradient(135deg, var(--accent), #aa0020)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: '12px',
                            fontWeight: 700,
                          }}
                        >
                          {(driver.code ?? driver.full_name.slice(0, 3)).toUpperCase()}
                        </div>
                        <div>
                          <Link href={`/drivers/${driver.slug}`} style={{ color: '#fff', textDecoration: 'none', fontWeight: 700 }}>
                            {driver.full_name}
                          </Link>
                          <div style={{ color: 'var(--muted)', fontSize: '12px' }}>{driver.nationality ?? 'Unknown nationality'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>{driver.is_active ? 'Active' : '—'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: driver.career_wins === maxima.wins && maxima.wins > 0 ? 'var(--gold)' : 'var(--text)' }}>
                      {driver.career_wins}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: driver.career_podiums === maxima.podiums && maxima.podiums > 0 ? 'var(--gold)' : 'var(--text)' }}>
                      {driver.career_podiums}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: driver.career_poles === maxima.poles && maxima.poles > 0 ? 'var(--gold)' : 'var(--text)' }}>
                      {driver.career_poles}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: driver.career_points === maxima.points && maxima.points > 0 ? 'var(--gold)' : 'var(--text)' }}>
                      {Number(driver.career_points).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: driver.championships === maxima.titles && maxima.titles > 0 ? 'var(--gold)' : 'var(--text)' }}>
                      {driver.championships}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  )
}
