'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

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

export default function DriversClient({ initialDrivers }: { initialDrivers: Driver[] }) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('career_wins')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const filtered = useMemo(() => {
    let rows = initialDrivers
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
  }, [initialDrivers, search, sortDir, sortKey])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    else {
      setSortKey(key)
      setSortDir(key === 'full_name' ? 'asc' : 'desc')
    }
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <section className="border-b border-[var(--border)] bg-[radial-gradient(ellipse_at_top,rgba(232,0,45,0.08),transparent_60%)] px-6 py-16 text-center">
        <p className="section-eyebrow mb-2 text-[var(--accent)]">F1 Database</p>
        <h1>Every Driver. Every Season.</h1>
        <p className="mx-auto mt-3 max-w-xl text-[var(--muted)]">{initialDrivers.length} drivers from 1950 to today.</p>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <input
          type="text"
          placeholder="Search drivers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4 w-full rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-4 py-3 text-sm outline-none"
        />
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="min-w-[760px] w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[var(--bg2)]">
                <th className="stat-label px-3 py-3 text-left">Driver</th>
                {(['championships', 'career_wins', 'career_podiums', 'career_poles', 'career_points', 'career_starts'] as SortKey[]).map((key) => (
                  <th key={key} className="stat-label cursor-pointer px-3 py-3 text-right" onClick={() => toggleSort(key)}>
                    {key.replace('career_', '').replace('_', ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((driver) => (
                <tr key={driver.id} className="border-t border-[var(--border)]">
                  <td className="px-3 py-4">
                    <Link href={`/drivers/${driver.slug}`} className="font-semibold text-[var(--text)] no-underline hover:text-[var(--accent)]">
                      {driver.full_name}
                    </Link>
                  </td>
                  <td className="px-3 py-4 text-right font-mono">{driver.championships}</td>
                  <td className="px-3 py-4 text-right font-mono">{driver.career_wins}</td>
                  <td className="px-3 py-4 text-right font-mono">{driver.career_podiums}</td>
                  <td className="px-3 py-4 text-right font-mono">{driver.career_poles}</td>
                  <td className="px-3 py-4 text-right font-mono">{Number(driver.career_points).toLocaleString()}</td>
                  <td className="px-3 py-4 text-right font-mono">{driver.career_starts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
