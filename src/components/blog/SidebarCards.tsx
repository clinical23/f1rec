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
  const compareHref = relatedDriver ? `/compare?d1=${encodeURIComponent(relatedDriver.slug)}` : '/compare'

  return (
    <div className="flex w-full flex-col gap-4">
      {relatedDriver ? (
        <Link href={`/drivers/${relatedDriver.slug}`} className="blog-card">
          <div className="blog-card__eyebrow">Related Driver</div>
          <div className="blog-card__title">{relatedDriver.full_name}</div>
          {relatedDriver.current_team ? <p className="blog-card__meta">{relatedDriver.current_team}</p> : null}
          {relatedDriver.championship_position ? (
            <span className="blog-card__meta" style={{ display: 'inline-block', marginTop: '0.5rem' }}>
              P{relatedDriver.championship_position} in {new Date().getFullYear()} WDC
            </span>
          ) : null}
        </Link>
      ) : null}

      {relatedRace ? (
        <Link href={`/races/${relatedRace.slug}`} className="blog-card">
          <div className="blog-card__eyebrow">From This Race</div>
          <div className="blog-card__meta" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.75rem' }}>
            R{relatedRace.round_number} · {relatedRace.season_year}
          </div>
          <div className="blog-card__title" style={{ marginTop: '0.5rem' }}>{relatedRace.name}</div>
          <p className="blog-card__meta">{formatDate(relatedRace.race_date)}</p>
          {relatedRace.winner_name ? <p className="blog-card__meta">Won by {relatedRace.winner_name}</p> : null}
        </Link>
      ) : null}

      {morePostsInCategory.length > 0 ? (
        <div className="blog-card">
          <div className="blog-card__eyebrow">More In {prettifyCategory(category)}</div>
          <div className="blog-card__list">
            {morePostsInCategory.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="blog-card__list-item">
                <p className="blog-card__list-item-title">{post.title}</p>
                <p className="blog-card__list-item-date">{formatDate(post.published_at)}</p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="blog-card">
        <div className="blog-card__eyebrow">Compare</div>
        <p className="blog-card__meta">
          See how {relatedDriver?.full_name ?? 'this driver'} stacks up against the rest of the grid.
        </p>
        <Link href={compareHref} className="blog-card__cta">
          Open compare tool
        </Link>
      </div>
    </div>
  )
}
