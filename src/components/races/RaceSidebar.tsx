import Link from 'next/link'

type RaceSidebarProps = {
  race: {
    slug: string
    name: string
    season_year: number | null
    round: number | null
    race_date: string | null
    country: string | null
    circuit_name: string | null
  }
  isUpcoming: boolean
  pastWinners: Array<{ slug: string; season_year: number; winner_name: string; winner_slug: string }>
  blogPost: { slug: string; title: string; published_at: string } | null
}

function formatDate(value: string | null) {
  if (!value) return 'TBC'
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function RaceSidebar({ race, isUpcoming, pastWinners, blogPost }: RaceSidebarProps) {
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="blog-card">
        <div className="blog-card__eyebrow">Race Info</div>
        <div className="blog-card__meta">Round {race.round ?? '—'}</div>
        <div className="blog-card__title" style={{ marginTop: '0.5rem' }}>
          {race.circuit_name ?? race.name}
        </div>
        <div className="blog-card__meta">{formatDate(race.race_date)}</div>
        {race.country ? <div className="blog-card__meta">{race.country}</div> : null}
      </div>

      {pastWinners.length > 0 ? (
        <div className="blog-card">
          <div className="blog-card__eyebrow">Past Winners</div>
          <div className="blog-card__list">
            {pastWinners.map((winner) => (
              <Link key={`${winner.slug}-${winner.season_year}`} href={`/races/${winner.slug}`} className="blog-card__list-item">
                <div className="blog-card__list-item-title">
                  {winner.season_year} · {winner.winner_name}
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {blogPost ? (
        <Link href={`/blog/${blogPost.slug}`} className="blog-card">
          <div className="blog-card__eyebrow">Race Review</div>
          <div className="blog-card__title">{blogPost.title}</div>
          <div className="blog-card__meta">{formatDate(blogPost.published_at)}</div>
        </Link>
      ) : null}

      <div className="blog-card">
        <div className="blog-card__eyebrow">{isUpcoming ? 'Season Context' : 'Next Step'}</div>
        <div className="blog-card__meta">See driver standings and season progression for {race.season_year ?? 'this season'}.</div>
        <Link href={race.season_year ? `/seasons/${race.season_year}` : '/seasons'} className="blog-card__cta">
          Open season standings
        </Link>
      </div>
    </div>
  )
}
