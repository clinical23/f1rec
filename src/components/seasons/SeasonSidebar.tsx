import Link from 'next/link'

type SeasonSidebarProps = {
  season: { year: number; rounds: number | null; isCompleted: boolean }
  topDrivers: Array<{ slug: string; name: string; count: number }>
  topConstructors: Array<{ slug: string; name: string; count: number }>
  prevSeason?: { slug: string; year: number }
  nextSeason?: { slug: string; year: number }
}

export default function SeasonSidebar({
  season,
  topDrivers,
  topConstructors,
  prevSeason,
  nextSeason,
}: SeasonSidebarProps) {
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="blog-card">
        <div className="blog-card__eyebrow">Season Info</div>
        <div className="blog-card__meta">{season.rounds ?? '—'} rounds</div>
        <div className="blog-card__meta">{season.isCompleted ? 'Completed' : 'In Progress'}</div>
      </div>

      {topDrivers.length > 0 ? (
        <div className="blog-card">
          <div className="blog-card__eyebrow">{season.isCompleted ? 'Most Wins' : 'Top Drivers'}</div>
          <div className="blog-card__list">
            {topDrivers.map((driver) => (
              <Link key={driver.slug} href={`/drivers/${driver.slug}`} className="blog-card__list-item">
                <div className="blog-card__list-item-title">{driver.name}</div>
                <div className="blog-card__list-item-date">{driver.count} wins</div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {topConstructors.length > 0 ? (
        <div className="blog-card">
          <div className="blog-card__eyebrow">{season.isCompleted ? 'Top Constructors' : 'Constructors Leaderboard'}</div>
          <div className="blog-card__list">
            {topConstructors.map((team) => (
              <Link key={team.slug} href={`/teams/${team.slug}`} className="blog-card__list-item">
                <div className="blog-card__list-item-title">{team.name}</div>
                <div className="blog-card__list-item-date">{team.count} wins</div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {(prevSeason || nextSeason) ? (
        <div className="blog-card">
          <div className="blog-card__eyebrow">Browse Seasons</div>
          <div className="blog-card__list">
            {prevSeason ? (
              <Link href={`/seasons/${prevSeason.slug}`} className="blog-card__list-item">
                <div className="blog-card__list-item-title">← {prevSeason.year}</div>
              </Link>
            ) : null}
            {nextSeason ? (
              <Link href={`/seasons/${nextSeason.slug}`} className="blog-card__list-item">
                <div className="blog-card__list-item-title">{nextSeason.year} →</div>
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="blog-card">
        <div className="blog-card__eyebrow">Compare</div>
        <div className="blog-card__meta">Compare drivers from {season.year} head-to-head.</div>
        <Link href="/compare" className="blog-card__cta">
          Open compare
        </Link>
      </div>
    </div>
  )
}
