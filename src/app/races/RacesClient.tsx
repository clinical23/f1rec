'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import PageHead from '@/components/page/PageHead'

export type RaceResult = {
  season_year: number
  round: number
  race_name: string
  race_slug: string
  race_date?: string | null
  driver_name: string
  driver_slug?: string | null
  constructor_name?: string | null
}

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''

// Data comes from the server (page.tsx), so the full list is in the HTML for readers and search engines.
export default function RacesClient({ initialRaces, raceCount }: { initialRaces: RaceResult[]; raceCount: number | null }) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return initialRaces
    return initialRaces.filter(
      (r) =>
        r.race_name.toLowerCase().includes(q) ||
        r.driver_name.toLowerCase().includes(q) ||
        (r.constructor_name ?? '').toLowerCase().includes(q) ||
        String(r.season_year) === q
    )
  }, [initialRaces, search])

  const grouped = useMemo(() => {
    const map = new Map<number, RaceResult[]>()
    for (const r of filtered) {
      const arr = map.get(r.season_year)
      if (arr) arr.push(r)
      else map.set(r.season_year, [r])
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0]).map(([y, rows]) => [y, [...rows].sort((a, b) => a.round - b.round)] as const)
  }, [filtered])

  const seasons = new Set(initialRaces.map((r) => r.season_year)).size
  const latest = initialRaces[0]
  const searching = search.trim().length > 0

  return (
    <main className="pg">
      <PageHead
        crumbs={[{ label: 'Sunday Grid', href: '/' }, { label: 'Results' }]}
        title="Results"
        lede="The winner of every Formula 1 world championship race since 1950. Open a race for the full finishing order."
        stats={[
          { value: (raceCount ?? initialRaces.length).toLocaleString('en-GB'), label: 'races' },
          { value: seasons, label: 'seasons' },
          ...(latest ? [{ value: latest.driver_name.split(' ').at(-1) ?? '', label: `won the ${latest.race_name.replace(' Grand Prix', ' GP')}`, sig: true }] : []),
        ]}
      />
      <div className="pg-body">
        <div className="pg-tools">
          <input
            className="pg-input"
            type="search"
            aria-label="Search races"
            placeholder="Search by race, winner, team or year"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="pg-count">{filtered.length.toLocaleString('en-GB')} races</span>
        </div>

        {grouped.length === 0 && <p className="pg-empty">No races match “{search}”. Try a driver&apos;s surname or a year.</p>}

        {grouped.map(([year, rows], i) => (
          <details key={year} className="pg-fold" open={searching || i === 0}>
            <summary>
              <b>{year}</b>
              <span>{rows.length} {rows.length === 1 ? 'race' : 'races'}</span>
            </summary>
            <table className="pg-table compact">
              <thead>
                <tr>
                  <th className="n">Round</th>
                  <th>Race</th>
                  <th className="hide-sm">Date</th>
                  <th>Winner</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.season_year}-${r.round}-${r.race_slug}`}>
                    <td className="n muted">{r.round}</td>
                    <td><Link href={`/races/${r.race_slug}`}>{r.race_name}</Link></td>
                    <td className="hide-sm muted">{fmt(r.race_date)}</td>
                    <td>
                      {r.driver_slug ? <Link href={`/drivers/${r.driver_slug}`}>{r.driver_name}</Link> : r.driver_name}
                      {r.constructor_name && <span className="sub">{r.constructor_name}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        ))}
      </div>
    </main>
  )
}
