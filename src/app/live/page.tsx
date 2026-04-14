import type { Metadata } from 'next'
import { createServerClient } from '@/lib/supabase/server'
import EmailCapture from '@/components/EmailCapture'
import LiveHubBoard from '@/components/live/LiveHubBoard'

export const metadata: Metadata = {
  title: 'F1 Live — Watchalongs & Streams | F1Rec',
  description:
    'The best F1 watchalong streams on Twitch and Kick. Race day reactions, driver streams, and sim racing content — all in one place.',
}

type Streamer = {
  id: string
  name: string | null
  platform: string | null
  channel_url: string | null
  description: string | null
  category: string | null
  avg_viewers: number | null
  languages: string[] | null
  related_driver_slug: string | null
}

export default async function LivePage() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('streamers')
    .select('id, name, platform, channel_url, description, category, avg_viewers, languages, related_driver_slug')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[live] failed to load streamers', error)
  }

  const streamers = (data ?? []) as Streamer[]

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <section className="border-b border-[var(--border)] bg-gradient-to-b from-[color-mix(in_srgb,var(--accent)_10%,transparent)] to-transparent px-6 py-12 text-center">
        <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Race Weekend Hub</p>
        <h1 className="mt-2 font-display text-[clamp(2rem,5vw,3.25rem)] font-black uppercase leading-tight text-[var(--text)]">
          F1 Live — Watchalongs, Streams &amp; Race Day Content
        </h1>
        <p className="mx-auto mt-4 max-w-3xl text-sm text-[var(--muted)]">
          The best F1 and sim racing streams on Twitch, Kick, and YouTube — curated for race weekends and beyond.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <LiveHubBoard streamers={streamers} />
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-12">
        <p className="mb-3 text-center text-sm text-[var(--muted)]">Know a streamer we should add? Let us know.</p>
        <EmailCapture source="live-streamers" />
      </section>
    </main>
  )
}
