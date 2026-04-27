import Link from 'next/link'

type SidebarCardsProps = {
  relatedDriver: { slug: string; full_name: string; current_team?: string | null; championship_position?: number | null } | null
  relatedRace: { slug: string; name: string; round_number: number; race_date: string; winner_name: string | null; season_year: number } | null
  morePostsInCategory: Array<{ slug: string; title: string; published_at: string }>
  category: string
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function prettifyCategory(category: string) {
  const map: Record<string, string> = {
    'race-review': 'Race Reviews',
    'driver-analysis': 'Driver Analysis',
    'season-preview': 'Season Preview',
    history: 'History',
    tech: 'Tech',
  }
  return map[category] ?? category.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

export default function SidebarCards({ relatedDriver, relatedRace, morePostsInCategory, category }: SidebarCardsProps) {
  return (
    <div className="mx-auto flex w-full max-w-[340px] flex-col gap-4 lg:max-w-none">
      {relatedDriver ? (
        <Link
          href={`/drivers/${relatedDriver.slug}`}
          className="block rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-4 transition-colors hover:border-[var(--gold)]"
        >
          <div className="mb-3 text-xs uppercase tracking-widest text-[var(--gold)]">Related Driver</div>
          <div className="font-display text-3xl font-bold leading-none text-[var(--text)]">{relatedDriver.full_name}</div>
          {relatedDriver.current_team ? <p className="mt-2 text-sm text-[var(--muted)]">{relatedDriver.current_team}</p> : null}
          {relatedDriver.championship_position ? (
            <span className="mt-3 inline-flex rounded-full border border-[var(--border)] bg-[var(--bg3)] px-2 py-1 text-xs text-[var(--muted)]">
              P{relatedDriver.championship_position} in {new Date().getFullYear()} WDC
            </span>
          ) : null}
        </Link>
      ) : null}

      {relatedRace ? (
        <Link
          href={`/races/${relatedRace.slug}`}
          className="block rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-4 transition-colors hover:border-[var(--gold)]"
        >
          <div className="mb-3 text-xs uppercase tracking-widest text-[var(--gold)]">From This Race</div>
          <div className="text-xs uppercase tracking-[0.08em] text-[var(--muted)]">
            R{relatedRace.round_number} · {relatedRace.season_year}
          </div>
          <div className="mt-2 font-display text-3xl font-bold leading-none text-[var(--text)]">{relatedRace.name}</div>
          <p className="mt-2 text-sm text-[var(--muted)]">{formatDate(relatedRace.race_date)}</p>
          {relatedRace.winner_name ? <p className="mt-1 text-sm text-[var(--muted)]">Won by {relatedRace.winner_name}</p> : null}
        </Link>
      ) : null}

      {morePostsInCategory.length > 0 ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-4">
          <div className="mb-3 text-xs uppercase tracking-widest text-[var(--gold)]">More In {prettifyCategory(category)}</div>
          <div className="space-y-3">
            {morePostsInCategory.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="block border-b border-[var(--border)] pb-3 last:border-b-0 last:pb-0">
                <p className="line-clamp-2 text-sm font-semibold text-[var(--text)]">{post.title}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">{formatDate(post.published_at)}</p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <Link
        href={relatedDriver ? `/compare?d1=${encodeURIComponent(relatedDriver.slug)}` : '/compare'}
        className="block rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-4 text-[var(--text)] transition-colors hover:border-[var(--gold)]"
      >
        <div className="mb-3 text-xs uppercase tracking-widest text-[var(--gold)]">Compare</div>
        <p className="text-sm text-[var(--muted)]">
          See how {relatedDriver?.full_name ?? 'this driver'} stacks up against the rest of the grid.
        </p>
        <span className="mt-3 inline-flex rounded-md border border-[var(--gold)]/40 bg-[var(--gold)]/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--gold)]">
          Open Comparison
        </span>
      </Link>
    </div>
  )
}
