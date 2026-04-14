import type { Metadata } from 'next'
import { createServerClient } from '@/lib/supabase/server'
import PaddockBoard from '@/components/paddock/PaddockBoard'

export const metadata: Metadata = {
  title: 'The Paddock — Behind the Scenes of F1 | F1Rec',
  description:
    'Between-race F1 content: logistics, paddock life, driver stories, and trending moments. What happens when the cameras stop rolling.',
}

type PaddockRow = {
  id: string
  title: string | null
  content: string | null
  category: string | null
  youtube_id: string | null
  related_driver_slug: string | null
  related_team_slug: string | null
}

export default async function PaddockPage() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('paddock_content')
    .select('id, title, content, category, youtube_id, related_driver_slug, related_team_slug')
    .eq('is_published', true)
    .order('published_at', { ascending: false })

  if (error) {
    console.error('[paddock] failed to load paddock content', error)
  }

  const items = (data ?? []) as PaddockRow[]

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <section className="border-b border-[var(--border)] bg-gradient-to-b from-[color-mix(in_srgb,var(--accent)_10%,transparent)] to-transparent px-6 py-12 text-center">
        <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Between the Races</p>
        <h1 className="mt-2 font-display text-[clamp(2rem,5vw,3.25rem)] font-black uppercase leading-tight text-[var(--text)]">
          The Paddock
        </h1>
        <p className="mx-auto mt-4 max-w-3xl text-sm text-[var(--muted)]">
          What happens when the cameras stop rolling. Logistics, paddock life, driver culture, and the stories that
          don&apos;t make the broadcast.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <PaddockBoard items={items} />
      </section>
    </main>
  )
}
