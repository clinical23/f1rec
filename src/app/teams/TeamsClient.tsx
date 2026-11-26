'use client'

import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import Link from 'next/link'
import PageHead from '@/components/page/PageHead'

export interface Team {
  id: string
  slug: string
  name: string
  base: string | null
  championships: number
  color: string | null
  wins: number
  podiums: number
  poles: number
  seasons: number
  first: number | null
  last: number | null
  current: boolean
  position: number | null
  points: number | null
}

type SortKey = 'name' | 'championships' | 'wins' | 'podiums' | 'seasons' | 'first'
const COLS: { key: Exclude<SortKey, 'name'>; label: string; hideSm?: boolean }[] = [
  { key: 'championships', label: 'Titles' },
  { key: 'wins', label: 'Wins' },
  { key: 'podiums', label: 'Podiums', hideSm: true },
  { key: 'seasons', label: 'Seasons', hideSm: true },
  { key: 'first', label: 'First', hideSm: true },
]

const tc = (c: string | null) => ({ '--tc': c ? (c.startsWith('#') ? c : `#${c}`) : undefined }) as CSSProperties

// Data comes from the server (page.tsx), so the list is in the HTML for readers and search engines.
export default function TeamsClient({ initialTeams, season }: { initialTeams: Team[]; season: number }) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('wins')
  const [asc, setAsc] = useState(false)
  const [limit, setLimit] = useState(60)

  const current = useMemo(
    () => initialTeams.filter((t) => t.current).sort((a, b) => (a.position ?? 99) - (b.position ?? 99)),
    [initialTeams]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = q ? initialTeams.filter((t) => t.name.toLowerCase().includes(q) || (t.base ?? '').toLowerCase().includes(q)) : initialTeams
    return [...rows].sort((a, b) => {
      if (sortKey === 'name') return asc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
      const d = Number(a[sortKey] ?? 0) - Number(b[sortKey] ?? 0)
      return asc ? d : -d
    })
  }, [initialTeams, search, sortKey, asc])

  const sortBy = (key: SortKey) => {
    if (key === sortKey) setAsc(!asc)
    else { setSortKey(key); setAsc(key === 'name' || key === 'first') }
  }
  const ariaSort = (key: SortKey) => (key === sortKey ? (asc ? 'ascending' : 'descending') : undefined)
  const winners = initialTeams.filter((t) => t.wins > 0).length

  return (
    <main className="pg">
      <PageHead
        crumbs={[{ label: 'Sunday Grid', href: '/' }, { label: 'Teams' }]}
        title="Teams"
        lede={`The ${current.length} constructors racing in ${season}, then every team that has entered a world championship race.`}
        stats={[
          { value: initialTeams.length, label: 'constructors' },
          { value: winners, label: 'have won a race' },
          { value: current.length, label: `on the ${season} grid`, sig: true },
        ]}
      />
      <div className="pg-body">
        {current.length > 0 && (
          <section className="pg-sec" style={{ marginTop: 0 }} aria-labelledby="now-h">
            <div className="pb-ph"><h2 className="pg-h2" id="now-h">{season} constructors</h2></div>
            <div className="pg-cards">
              {current.map((t) => (
                <Link key={t.id} href={`/teams/${t.slug}`} className="pg-card" style={tc(t.color)}>
                  <b>{t.name}</b>
                  <span className="sub">{t.position ? `P${t.position} in ${season}` : `Racing in ${season}`}{t.points != null ? ` · ${Math.round(t.points)} pts` : ''}</span>
                  <dl>
                    <div><dt>Titles</dt><dd>{t.championships}</dd></div>
                    <div><dt>Wins</dt><dd>{t.wins}</dd></div>
                    <div><dt>Since</dt><dd>{t.first ?? '—'}</dd></div>
                  </dl>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="pg-sec" aria-labelledby="all-h">
          <div className="pb-ph"><h2 className="pg-h2" id="all-h">Every constructor</h2></div>
          <div className="pg-tools">
            <input className="pg-input" type="search" aria-label="Search teams" placeholder="Search teams or base"
              value={search} onChange={(e) => { setSearch(e.target.value); setLimit(60) }} />
            <span className="pg-count">{filtered.length} teams</span>
          </div>
          <div className="pg-scroll">
            <table className="pg-table">
              <thead>
                <tr>
                  <th className="n">#</th>
                  <th aria-sort={ariaSort('name')}><button type="button" onClick={() => sortBy('name')}>Team</button></th>
                  {COLS.map((c) => (
                    <th key={c.key} className={`n${c.hideSm ? ' hide-sm' : ''}`} aria-sort={ariaSort(c.key)}>
                      <button type="button" onClick={() => sortBy(c.key)}>{c.label}{sortKey === c.key ? (asc ? ' ↑' : ' ↓') : ''}</button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, limit).map((t, i) => (
                  <tr key={t.id} style={tc(t.color)}>
                    <td className="pos n">{i + 1}</td>
                    <td>
                      <span className="tc" aria-hidden="true" />
                      <Link href={`/teams/${t.slug}`}>{t.name}</Link>
                      {t.base && <span className="sub" style={{ paddingLeft: 14 }}>{t.base}</span>}
                    </td>
                    {COLS.map((c) => (
                      <td key={c.key} className={`n${c.hideSm ? ' hide-sm' : ''}`}>{c.key === 'first' ? (t.first ?? '—') : t[c.key]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && <p className="pg-empty">No teams match “{search}”.</p>}
          {filtered.length > limit && (
            <p style={{ marginTop: 16 }}>
              <button type="button" className="btn-ghost" onClick={() => setLimit(limit + 100)}>Show more teams</button>
            </p>
          )}
        </section>
      </div>
    </main>
  )
}
