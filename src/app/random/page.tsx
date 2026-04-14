import type { Metadata } from 'next'
import { createServerClient } from '@/lib/supabase/server'
import RandomStatsBoard from '@/components/random/RandomStatsBoard'

export const metadata: Metadata = {
  title: 'Random F1 Stats — Did You Know? | F1Rec',
  description: 'Surprising Formula 1 statistics from 77 seasons and 25,883 results.',
}

type RandomStat = {
  id: string
  stat_text: string | null
  category: string | null
  related_driver_slug: string | null
  related_team_slug: string | null
}

export default async function RandomStatsPage() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('random_stats')
    .select('id, stat_text, category, related_driver_slug, related_team_slug')
    .eq('is_active', true)

  if (error) {
    console.error('[random-page] failed to load random stats', error)
  }

  const stats = (data ?? []) as RandomStat[]

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <section className="border-b border-[var(--border)] bg-gradient-to-b from-[color-mix(in_srgb,var(--accent)_10%,transparent)] to-transparent px-6 py-12 text-center">
        <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Did You Know?</p>
        <h1 className="mt-2 font-display text-[clamp(2rem,5vw,3.25rem)] font-black leading-tight text-[var(--text)] hero-title">
          Random F1 Stats
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm text-[var(--muted)]">
          Surprising stats across records, streaks, firsts, and quirky F1 history.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <RandomStatsBoard initialStats={stats} />
      </section>
    </main>
  )
}
