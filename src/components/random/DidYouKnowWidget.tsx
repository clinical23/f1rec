'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type RandomStat = {
  id: string
  stat_text: string | null
  category: string | null
  related_driver_slug: string | null
  related_team_slug: string | null
}

function categoryLabel(category: string | null): string {
  const key = (category ?? '').toLowerCase()
  if (key === 'records' || key === 'wins') return 'Records'
  if (key === 'streaks') return 'Streaks'
  if (key === 'firsts' || key === 'lasts') return 'Firsts & Lasts'
  if (key === 'quirky') return 'Quirky'
  if (key === 'sim-racing') return 'Sim Racing'
  return 'Did You Know'
}

function pickRandom<T>(rows: T[]): T | null {
  if (rows.length === 0) return null
  const index = Math.floor(Math.random() * rows.length)
  return rows[index] ?? null
}

export default function DidYouKnowWidget({ initialStat }: { initialStat: RandomStat | null }) {
  const [stat, setStat] = useState<RandomStat | null>(initialStat)
  const [loading, setLoading] = useState(false)

  async function refreshStat() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('random_stats')
        .select('id, stat_text, category, related_driver_slug, related_team_slug')
        .eq('is_active', true)

      if (error) {
        console.error('[random-widget] failed to load random stats', error)
        return
      }

      const picked = pickRandom((data ?? []) as RandomStat[])
      if (picked) setStat(picked)
    } catch (error) {
      console.error('[random-widget] unexpected refresh error', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mb-12">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl font-extrabold uppercase text-[var(--text)]">
          Did You <span className="text-[var(--accent)]">Know?</span>
        </h2>
        <Link href="/random" className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)] no-underline hover:underline">
          More random stats →
        </Link>
      </div>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-5">
        <div className="mb-3 inline-flex rounded bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] px-2 py-1 font-display text-[0.62rem] font-bold uppercase tracking-wider text-[var(--accent)]">
          {categoryLabel(stat?.category ?? null)}
        </div>
        <p className="text-[1rem] leading-relaxed text-[var(--text)]">
          {stat?.stat_text ?? 'No active random stats found yet.'}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {stat?.related_driver_slug ? (
            <Link href={`/drivers/${stat.related_driver_slug}`} className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)] no-underline hover:underline">
              Related driver →
            </Link>
          ) : null}
          {stat?.related_team_slug ? (
            <Link href={`/teams/${stat.related_team_slug}`} className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)] no-underline hover:underline">
              Related team →
            </Link>
          ) : null}
          <button
            type="button"
            onClick={refreshStat}
            disabled={loading}
            className="ml-auto rounded border border-[var(--border)] bg-[var(--bg3)] px-3 py-2 font-display text-[0.68rem] font-bold uppercase tracking-wide text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Shuffling...' : '🎲 Another stat'}
          </button>
        </div>
      </div>
    </section>
  )
}
