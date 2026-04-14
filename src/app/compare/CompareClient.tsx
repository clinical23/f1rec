'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

interface DriverBasic {
  id: string
  slug: string
  full_name: string
  championships: number
  career_wins: number
  career_podiums: number
  career_poles: number
  career_points: number
  career_starts: number
}

export default function CompareClient({ drivers }: { drivers: DriverBasic[] }) {
  const [d1Slug, setD1Slug] = useState('')
  const [d2Slug, setD2Slug] = useState('')
  const d1 = useMemo(() => drivers.find((d) => d.slug === d1Slug), [drivers, d1Slug])
  const d2 = useMemo(() => drivers.find((d) => d.slug === d2Slug), [drivers, d2Slug])

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <section className="border-b border-[var(--border)] bg-[radial-gradient(ellipse_at_top,rgba(232,0,45,0.08),transparent_60%)] px-6 py-16 text-center">
        <p className="section-eyebrow mb-2 text-[var(--accent)]">Head to Head</p>
        <h1 className="hero-title">Compare Drivers</h1>
      </section>
      <section className="mx-auto max-w-5xl px-4 py-10 md:px-6">
        <div className="grid gap-3 md:grid-cols-2">
          <select className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-4 py-3" value={d1Slug} onChange={(e) => setD1Slug(e.target.value)}>
            <option value="">Select first driver</option>
            {drivers.map((driver) => <option key={driver.id} value={driver.slug}>{driver.full_name}</option>)}
          </select>
          <select className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-4 py-3" value={d2Slug} onChange={(e) => setD2Slug(e.target.value)}>
            <option value="">Select second driver</option>
            {drivers.map((driver) => <option key={driver.id} value={driver.slug}>{driver.full_name}</option>)}
          </select>
        </div>

        {d1 && d2 ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="card p-6">
              <Link href={`/drivers/${d1.slug}`} className="text-xl font-semibold hover:text-[var(--accent)]">{d1.full_name}</Link>
              <p className="mt-2">Wins: <span className="font-mono">{d1.career_wins}</span></p>
              <p>Podiums: <span className="font-mono">{d1.career_podiums}</span></p>
              <p>Points: <span className="font-mono">{Number(d1.career_points).toLocaleString()}</span></p>
            </div>
            <div className="card p-6">
              <Link href={`/drivers/${d2.slug}`} className="text-xl font-semibold hover:text-[var(--accent)]">{d2.full_name}</Link>
              <p className="mt-2">Wins: <span className="font-mono">{d2.career_wins}</span></p>
              <p>Podiums: <span className="font-mono">{d2.career_podiums}</span></p>
              <p>Points: <span className="font-mono">{Number(d2.career_points).toLocaleString()}</span></p>
            </div>
          </div>
        ) : (
          <div className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-6 text-[var(--muted)]">Select two drivers to compare key career stats.</div>
        )}
      </section>
    </main>
  )
}
