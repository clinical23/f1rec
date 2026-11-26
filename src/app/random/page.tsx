import type { Metadata } from 'next'
import { createServerClient } from '@/lib/supabase/server'
import RandomStatsBoard from '@/components/random/RandomStatsBoard'
import PageHead from '@/components/page/PageHead'

export const metadata: Metadata = {
  title: 'Random F1 Stats',
  description: 'Surprising Formula 1 statistics from 77 seasons and 25,883 results.',
}

type RandomStat = {
  id: string
  stat_text: string | null
  category: string | null
  related_driver_slug: string | null
  related_team_slug: string | null
}

export const revalidate = 21600

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
    <main className="pg">
      <PageHead
        crumbs={[{ label: 'Sunday Grid', href: '/' }, { label: 'Random stats' }]}
        title="Random stats"
        lede="Streaks, firsts and oddities from every season since 1950. Shuffle for another."
      />
      <section className="pg-body">
        <RandomStatsBoard initialStats={stats} />
      </section>
    </main>
  )
}
