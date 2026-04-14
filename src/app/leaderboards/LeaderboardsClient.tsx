'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

type Tab = 'drivers' | 'constructors' | 'records'

interface DriverRow {
  id: string
  slug: string
  full_name: string
  career_wins: number
  career_podiums: number
  career_poles: number
  career_points: number
  career_starts: number
  championships: number
}

interface ConstructorRow {
  id: string
  slug: string
  name: string
  race_wins: number
  podiums: number
  poles: number
  total_points: number
  seasons_active: number
  championships: number
}

interface RecordRow {
  title: string
  holder: string
  slug: string
  value: string
  linkBase: string
}

export default function LeaderboardsClient({
  drivers,
  constructors,
  records,
}: {
  drivers: DriverRow[]
  constructors: ConstructorRow[]
  records: RecordRow[]
}) {
  const [tab, setTab] = useState<Tab>('drivers')
  const topDrivers = useMemo(() => drivers.slice(0, 100), [drivers])
  const topConstructors = useMemo(() => constructors.slice(0, 100), [constructors])

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <section className="border-b border-[var(--border)] bg-[radial-gradient(ellipse_at_top,rgba(232,0,45,0.08),transparent_60%)] px-6 py-16 text-center">
        <p className="section-eyebrow mb-2 text-[var(--accent)]">F1 Database</p>
        <h1 className="hero-title">All-Time Records</h1>
      </section>
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-8 flex gap-3">
          {(['drivers', 'constructors', 'records'] as Tab[]).map((key) => (
            <button key={key} onClick={() => setTab(key)} className={`category-pill rounded-md border px-3 py-2 ${tab === key ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--muted)]'}`}>
              {key}
            </button>
          ))}
        </div>

        {tab === 'drivers' && (
          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="min-w-[780px] w-full text-sm">
              <thead className="bg-[var(--bg2)]">
                <tr>
                  <th className="stat-label px-3 py-3 text-left">Driver</th>
                  <th className="stat-label px-3 py-3 text-right">Titles</th>
                  <th className="stat-label px-3 py-3 text-right">Wins</th>
                  <th className="stat-label px-3 py-3 text-right">Podiums</th>
                  <th className="stat-label px-3 py-3 text-right">Poles</th>
                </tr>
              </thead>
              <tbody>
                {topDrivers.map((d) => (
                  <tr key={d.id} className="border-t border-[var(--border)]">
                    <td className="px-3 py-3"><Link href={`/drivers/${d.slug}`} className="font-semibold hover:text-[var(--accent)]">{d.full_name}</Link></td>
                    <td className="px-3 py-3 text-right font-mono">{d.championships}</td>
                    <td className="px-3 py-3 text-right font-mono">{d.career_wins}</td>
                    <td className="px-3 py-3 text-right font-mono">{d.career_podiums}</td>
                    <td className="px-3 py-3 text-right font-mono">{d.career_poles}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'constructors' && (
          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="min-w-[780px] w-full text-sm">
              <thead className="bg-[var(--bg2)]">
                <tr>
                  <th className="stat-label px-3 py-3 text-left">Team</th>
                  <th className="stat-label px-3 py-3 text-right">Titles</th>
                  <th className="stat-label px-3 py-3 text-right">Wins</th>
                  <th className="stat-label px-3 py-3 text-right">Podiums</th>
                  <th className="stat-label px-3 py-3 text-right">Poles</th>
                </tr>
              </thead>
              <tbody>
                {topConstructors.map((t) => (
                  <tr key={t.id} className="border-t border-[var(--border)]">
                    <td className="px-3 py-3"><Link href={`/teams/${t.slug}`} className="font-semibold hover:text-[var(--accent)]">{t.name}</Link></td>
                    <td className="px-3 py-3 text-right font-mono">{t.championships}</td>
                    <td className="px-3 py-3 text-right font-mono">{t.race_wins}</td>
                    <td className="px-3 py-3 text-right font-mono">{t.podiums}</td>
                    <td className="px-3 py-3 text-right font-mono">{t.poles}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'records' && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {records.map((r) => (
              <div key={r.title} className="card p-6">
                <p className="section-eyebrow mb-2 text-[var(--accent)]">{r.title}</p>
                <p className="mb-2 font-mono text-3xl font-bold text-[var(--gold)]">{r.value}</p>
                <Link href={`${r.linkBase}/${r.slug}`} className="font-semibold hover:text-[var(--accent)]">{r.holder}</Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
