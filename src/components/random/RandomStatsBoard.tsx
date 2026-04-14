'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

type RandomStat = {
  id: string
  stat_text: string | null
  category: string | null
  related_driver_slug: string | null
  related_team_slug: string | null
}

type TabKey = 'all' | 'records' | 'streaks' | 'firsts' | 'quirky' | 'sim-racing'

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'records', label: 'Records' },
  { key: 'streaks', label: 'Streaks' },
  { key: 'firsts', label: 'Firsts' },
  { key: 'quirky', label: 'Quirky' },
  { key: 'sim-racing', label: 'Sim Racing' },
]

function normalizeCategory(category: string | null): TabKey | 'other' {
  const key = (category ?? '').toLowerCase()
  if (key === 'records' || key === 'wins') return 'records'
  if (key === 'streaks') return 'streaks'
  if (key === 'firsts' || key === 'lasts') return 'firsts'
  if (key === 'quirky') return 'quirky'
  if (key === 'sim-racing') return 'sim-racing'
  return 'other'
}

function categoryLabel(category: string | null): string {
  const normalized = normalizeCategory(category)
  if (normalized === 'records') return 'Records'
  if (normalized === 'streaks') return 'Streaks'
  if (normalized === 'firsts') return 'Firsts & Lasts'
  if (normalized === 'quirky') return 'Quirky'
  if (normalized === 'sim-racing') return 'Sim Racing'
  return 'Random'
}

function shuffle<T>(list: T[]): T[] {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = copy[i]
    copy[i] = copy[j]
    copy[j] = tmp
  }
  return copy
}

export default function RandomStatsBoard({ initialStats }: { initialStats: RandomStat[] }) {
  const [tab, setTab] = useState<TabKey>('all')
  const [seed, setSeed] = useState(0)

  const filtered = useMemo(() => {
    if (tab === 'all') return initialStats
    return initialStats.filter((stat) => normalizeCategory(stat.category) === tab)
  }, [tab, initialStats])

  const visibleStats = useMemo(() => {
    return shuffle(filtered).slice(0, 5)
  }, [filtered, seed])

  return (
    <>
      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => {
              setTab(entry.key)
              setSeed((prev) => prev + 1)
            }}
            className={`rounded border px-3 py-2 font-display text-[0.68rem] font-bold uppercase tracking-wide ${
              tab === entry.key
                ? 'border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent)]'
                : 'border-[var(--border)] bg-[var(--bg2)] text-[var(--muted)]'
            }`}
          >
            {entry.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSeed((prev) => prev + 1)}
          className="ml-auto rounded border border-[var(--border)] bg-[var(--bg2)] px-3 py-2 font-display text-[0.68rem] font-bold uppercase tracking-wide text-[var(--text)]"
        >
          🎲 Shuffle
        </button>
      </div>

      {visibleStats.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleStats.map((stat) => (
            <article key={stat.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
              <span className="inline-flex rounded bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] px-2 py-1 font-display text-[0.6rem] font-bold uppercase tracking-wider text-[var(--accent)]">
                {categoryLabel(stat.category)}
              </span>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text)]">{stat.stat_text ?? 'No stat text.'}</p>
              <div className="mt-3 flex gap-3">
                {stat.related_driver_slug ? (
                  <Link href={`/drivers/${stat.related_driver_slug}`} className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)] no-underline hover:underline">
                    Driver →
                  </Link>
                ) : null}
                {stat.related_team_slug ? (
                  <Link href={`/teams/${stat.related_team_slug}`} className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)] no-underline hover:underline">
                    Team →
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg2)] px-4 py-8 text-center text-sm text-[var(--muted)]">
          No stats found for this category yet.
        </p>
      )}
    </>
  )
}
