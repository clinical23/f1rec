'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import PageHead from '@/components/page/PageHead'

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

type SortKey = 'full_name' | 'career_starts' | 'career_wins' | 'career_podiums' | 'career_poles' | 'career_points' | 'championships'
type FilterKey = 'all' | 'champions' | 'active' | 'winners'

const COLS: { key: SortKey; label: string; hideSm?: boolean }[] = [
  { key: 'championships', label: 'Titles' },
  { key: 'career_wins', label: 'Wins' },
  { key: 'career_podiums', label: 'Podiums', hideSm: true },
  { key: 'career_poles', label: 'Poles', hideSm: true },
  { key: 'career_starts', label: 'Starts', hideSm: true },
  { key: 'career_points', label: 'Points', hideSm: true },
]

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'On the grid now' },
  { key: 'champions', label: 'Champions' },
  { key: 'winners', label: 'Race winners' },
]

export default function DriversClient({ initialDrivers }: { initialDrivers: Driver[] }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [sortKey, setSortKey] = useState<SortKey>('career_wins')
  const [asc, setAsc] = useState(false)
  const [limit, setLimit] = useState(100)

  const filtered = useMemo(() => {
    let rows = initialDrivers
    if (filter === 'champions') rows = rows.filter((d) => d.championships > 0)
    if (filter === 'active') rows = rows.filter((d) => d.is_active)
    if (filter === 'winners') rows = rows.filter((d) => d.career_wins > 0)
    const q = search.trim().toLowerCase()
    if (q) rows = rows.filter((d) => d.full_name.toLowerCase().includes(q) || (d.code ?? '').toLowerCase() === q || (d.nationality ?? '').toLowerCase().includes(q))
    return [...rows].sort((a, b) => {
      if (sortKey === 'full_name') return asc ? a.full_name.localeCompare(b.full_name) : b.full_name.localeCompare(a.full_name)
      const d = Number(a[sortKey] ?? 0) - Number(b[sortKey] ?? 0)
      return asc ? d : -d
    })
  }, [filter, initialDrivers, search, sortKey, asc])

  const top = useMemo(() => {
    const m: Partial<Record<SortKey, number>> = {}
    for (const c of COLS) m[c.key] = filtered.reduce((x, d) => Math.max(x, Number(d[c.key] ?? 0)), 0)
    return m
  }, [filtered])

  const sortBy = (key: SortKey) => {
    if (key === sortKey) setAsc(!asc)
    else { setSortKey(key); setAsc(key === 'full_name') }
  }
  const ariaSort = (key: SortKey) => (key === sortKey ? (asc ? 'ascending' : 'descending') : undefined)

  const champions = initialDrivers.filter((d) => d.championships > 0).length
  const active = initialDrivers.filter((d) => d.is_active).length
  const shown = filtered.slice(0, limit)

  return (
    <main className="pg">
      <PageHead
        crumbs={[{ label: 'Sunday Grid', href: '/' }, { label: 'Drivers' }]}
        title="Drivers"
        lede="Everyone who has started a world championship race, with their career totals. Sort any column, or search by name or nationality."
        stats={[
          { value: initialDrivers.length.toLocaleString('en-GB'), label: 'drivers' },
          { value: champions, label: 'world champions' },
          { value: active, label: 'on the grid now', sig: true },
        ]}
      />
      <div className="pg-body">
        <div className="pg-tools">
          <input className="pg-input" type="search" aria-label="Search drivers" placeholder="Search drivers or nationality"
            value={search} onChange={(e) => { setSearch(e.target.value); setLimit(100) }} />
          <div className="pg-chips" role="group" aria-label="Show">
            {FILTERS.map((f) => (
              <button key={f.key} type="button" className="pg-chip" aria-pressed={filter === f.key} onClick={() => { setFilter(f.key); setLimit(100) }}>
                {f.label}
              </button>
            ))}
          </div>
          <span className="pg-count">{filtered.length.toLocaleString('en-GB')} drivers</span>
        </div>

        <div className="pg-scroll">
          <table className="pg-table">
            <thead>
              <tr>
                <th className="n">#</th>
                <th aria-sort={ariaSort('full_name')}><button type="button" onClick={() => sortBy('full_name')}>Driver</button></th>
                <th className="hide-sm">Years</th>
                {COLS.map((c) => (
                  <th key={c.key} className={`n${c.hideSm ? ' hide-sm' : ''}`} aria-sort={ariaSort(c.key)}>
                    <button type="button" onClick={() => sortBy(c.key)}>{c.label}{sortKey === c.key ? (asc ? ' ↑' : ' ↓') : ''}</button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((d, i) => (
                <tr key={d.id} className={i === 0 && !search ? 'p1' : undefined}>
                  <td className="pos n">{i + 1}</td>
                  <td>
                    <Link href={`/drivers/${d.slug}`}>{d.full_name}</Link>
                    <span className="sub">{[d.nationality, d.is_active ? `racing in ${d.last_season}` : null].filter(Boolean).join(' · ')}</span>
                  </td>
                  <td className="hide-sm muted">{d.first_season ? `${d.first_season}${d.last_season && d.last_season !== d.first_season ? `–${d.is_active ? 'now' : d.last_season}` : ''}` : '—'}</td>
                  {COLS.map((c) => {
                    const v = Number(d[c.key] ?? 0)
                    return (
                      <td key={c.key} className={`n${c.hideSm ? ' hide-sm' : ''}${v > 0 && v === top[c.key] ? ' top' : ''}`}>
                        {c.key === 'career_points' ? Math.round(v).toLocaleString('en-GB') : v}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <p className="pg-empty">No drivers match “{search}”.</p>}
        {filtered.length > limit && (
          <p style={{ marginTop: 16 }}>
            <button type="button" className="btn-ghost" onClick={() => setLimit(limit + 200)}>
              Show {Math.min(200, filtered.length - limit)} more of {(filtered.length - limit).toLocaleString('en-GB')}
            </button>
          </p>
        )}
      </div>
    </main>
  )
}
