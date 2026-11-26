import type { Metadata } from 'next'
import { createServerClient } from '@/lib/supabase/server'
import EmailCapture from '@/components/EmailCapture'
import LiveHubBoard from '@/components/live/LiveHubBoard'
import PageHead from '@/components/page/PageHead'

export const metadata: Metadata = {
  title: 'F1 Watchalongs and Live Streams',
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

export const revalidate = 21600

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
    <main className="pg">
      <PageHead
        crumbs={[{ label: 'Sunday Grid', href: '/' }, { label: 'Live' }]}
        title="Watch along"
        lede="Streamers who watch the race live with their chat, plus sim racers worth following between race weekends."
      />
      <section className="pg-body">
        <LiveHubBoard streamers={streamers} />
      </section>

      <section className="mx-auto max-w-3xl border-t border-[#2a2a3a] px-6 py-16">
        <p className="mb-3 text-center text-sm text-[var(--muted)]">Know a streamer we should add? Let us know.</p>
        <EmailCapture source="live-streamers" />
      </section>
    </main>
  )
}
