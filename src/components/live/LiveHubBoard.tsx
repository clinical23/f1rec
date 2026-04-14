'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

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

type PlatformFilter = 'all' | 'twitch' | 'kick' | 'youtube-live'

const PLATFORMS: Array<{ key: PlatformFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'twitch', label: 'Twitch' },
  { key: 'kick', label: 'Kick' },
  { key: 'youtube-live', label: 'YouTube Live' },
]

function platformBadge(platform: string | null): { label: string; className: string } {
  const key = (platform ?? '').toLowerCase()
  if (key === 'twitch') return { label: 'Twitch', className: 'bg-purple-500/20 text-purple-300' }
  if (key === 'kick') return { label: 'Kick', className: 'bg-green-500/20 text-green-300' }
  if (key === 'youtube-live') return { label: 'YouTube Live', className: 'bg-red-500/20 text-red-300' }
  return { label: 'Live', className: 'bg-[var(--bg3)] text-[var(--muted)]' }
}

function matchesPlatform(streamer: Streamer, filter: PlatformFilter): boolean {
  if (filter === 'all') return true
  return (streamer.platform ?? '').toLowerCase() === filter
}

function sectionCategory(section: 'watchalong' | 'drivers' | 'sim', category: string | null): boolean {
  const key = (category ?? '').toLowerCase()
  if (section === 'watchalong') return key === 'f1-watchalong'
  if (section === 'drivers') return key === 'driver-official'
  return key === 'sim-racing'
}

function StreamerSection({
  title,
  subtitle,
  streamers,
}: {
  title: string
  subtitle: string
  streamers: Streamer[]
}) {
  const [showAll, setShowAll] = useState(false)
  if (streamers.length === 0) return null
  const visible = showAll ? streamers : streamers.slice(0, 4)
  return (
    <section className="border-t border-[#2a2a3a] py-12">
      <h2 className="font-display text-xl font-extrabold tracking-wide text-[var(--text)]">{title}</h2>
      <p className="mb-8 mt-2 text-sm text-[#8888aa]">{subtitle}</p>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {visible.map((streamer) => {
          const platform = platformBadge(streamer.platform)
          return (
            <article key={streamer.id} className="rounded-xl border border-[#2a2a3a] bg-[var(--bg2)] p-6">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className={`rounded px-2 py-1 font-display text-[0.6rem] font-bold uppercase tracking-wider ${platform.className}`}>
                  {platform.label}
                </span>
                {streamer.avg_viewers != null ? (
                  <span className="rounded bg-[var(--bg3)] px-2 py-1 text-xs font-mono text-[var(--muted)]">~{streamer.avg_viewers.toLocaleString()} viewers</span>
                ) : null}
              </div>
              <h3 className="font-display text-lg font-bold text-[var(--text)]">{streamer.name ?? 'Unnamed Streamer'}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#8888aa]">{streamer.description ?? 'No description provided.'}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(streamer.languages ?? []).map((language) => (
                  <span key={language} className="rounded bg-[var(--bg3)] px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
                    {language}
                  </span>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-4">
                {streamer.channel_url ? (
                  <a
                    href={streamer.channel_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)] no-underline hover:underline"
                  >
                    Open channel →
                  </a>
                ) : null}
                {streamer.related_driver_slug ? (
                  <Link href={`/drivers/${streamer.related_driver_slug}`} className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)] no-underline hover:underline">
                    Driver profile →
                  </Link>
                ) : null}
              </div>
            </article>
          )
        })}
      </div>
      {streamers.length > 4 ? (
        <button
          type="button"
          onClick={() => setShowAll((prev) => !prev)}
          className="mt-8 rounded border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--muted)] hover:text-[var(--text)]"
        >
          {showAll ? 'Show fewer streamers' : `Show all ${streamers.length} streamers`}
        </button>
      ) : null}
    </section>
  )
}

export default function LiveHubBoard({ streamers }: { streamers: Streamer[] }) {
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all')

  const filtered = useMemo(
    () => streamers.filter((streamer) => matchesPlatform(streamer, platformFilter)),
    [streamers, platformFilter]
  )

  const watchalong = filtered.filter((streamer) => sectionCategory('watchalong', streamer.category))
  const drivers = filtered.filter((streamer) => sectionCategory('drivers', streamer.category))
  const sim = filtered.filter((streamer) => sectionCategory('sim', streamer.category))

  return (
    <>
      <div className="mb-8 flex flex-wrap gap-3">
        {PLATFORMS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => setPlatformFilter(entry.key)}
            className={`rounded border px-3 py-2 font-display text-[0.68rem] font-bold uppercase tracking-wide ${
              platformFilter === entry.key
                ? 'border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent)]'
                : 'border-[var(--border)] bg-[var(--bg2)] text-[var(--muted)]'
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <StreamerSection
        title="🔴 Race Day Watchalongs"
        subtitle="Watch the race with the community. Live reactions, analysis, and chat."
        streamers={watchalong}
      />
      <StreamerSection
        title="🏎️ F1 Drivers Who Stream"
        subtitle="When they're not on the grid, they're on Twitch."
        streamers={drivers}
      />
      <StreamerSection
        title="🎮 Sim Racing Streams"
        subtitle="The best sim racing content between race weekends."
        streamers={sim}
      />
    </>
  )
}
